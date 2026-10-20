-- Diraflow: close the self-promotion hole on team_members, lock down talent_pool,
-- and stop trigger/internal functions being callable through the public REST API.
--
-- WHY (verified against the live project on 2026-10-20):
--   * team_members has the policy "Users can update own row" (auth.uid() = id) and the
--     `authenticated` role holds UPDATE on EVERY column. Nothing guards role/active/permissions.
--     Anyone can sign up with the public anon key and run:
--       update team_members set role='admin', active=true, request_status='approved' where id = auth.uid();
--   * "Users can insert own row on signup" has the same problem on INSERT (column defaults are
--     active=true, request_status='approved', role='reviewer').
--   * talent_pool SELECT/UPDATE are open to ANY authenticated user (qual = true), and signup is open,
--     so any self-registered account can read every candidate's DOB, phone and resume path.
--
-- This migration is written to NOT break the current admin portal. Self-service edits the portal
-- makes (profile, avatar, notification prefs, active_session_id, signup upsert) all still work.

begin;

-- 1. Guard privileged team_members columns ------------------------------------------------------
create or replace function public.guard_team_members_privileges()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- Service role, SQL editor, and DB-internal triggers (e.g. the auth.users signup trigger)
  -- have no end-user JWT. They are trusted.
  if auth.uid() is null or coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  -- Active admins may change anything (approve/reject, change roles, permissions, ...).
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- A non-admin can only ever create their own *pending, inactive, unprivileged* request.
    -- (An admin still has to approve it, and may correct the requested role while doing so.)
    new.active           := false;
    new.request_status   := 'pending';
    new.permissions      := '{}'::jsonb;
    new.reviewed_at      := null;
    new.reviewed_by      := null;
    new.rejection_reason := null;
    new.manager_id       := null;
    return new;
  end if;

  -- UPDATE by a non-admin: silently keep every privileged column at its current value.
  -- (Reverting, rather than raising, keeps the portal's signup upsert working.)
  new.id               := old.id;
  new.email            := old.email;
  new.role             := old.role;
  new.active           := old.active;
  new.request_status   := old.request_status;
  new.permissions      := old.permissions;
  new.reviewed_at      := old.reviewed_at;
  new.reviewed_by      := old.reviewed_by;
  new.rejection_reason := old.rejection_reason;
  new.manager_id       := old.manager_id;
  new.employment_type  := old.employment_type;
  new.department       := old.department;
  new.created_at       := old.created_at;
  return new;
end;
$$;

drop trigger if exists guard_team_members_privileges on public.team_members;
create trigger guard_team_members_privileges
  before insert or update on public.team_members
  for each row execute function public.guard_team_members_privileges();

-- 2. talent_pool: only ACTIVE team members, not every authenticated user ------------------------
drop policy if exists "Allow authenticated to view talent pool"   on public.talent_pool;
drop policy if exists "Allow authenticated to update talent pool" on public.talent_pool;

create policy "Active team members can view talent pool"
  on public.talent_pool for select to authenticated
  using (exists (select 1 from public.team_members tm where tm.id = auth.uid() and tm.active = true));

create policy "Active team members can update talent pool"
  on public.talent_pool for update to authenticated
  using      (exists (select 1 from public.team_members tm where tm.id = auth.uid() and tm.active = true))
  with check (exists (select 1 from public.team_members tm where tm.id = auth.uid() and tm.active = true));

-- 3. Internal functions must not be callable through /rest/v1/rpc ---------------------------------
-- (They run as triggers; EXECUTE is not checked when a trigger fires. is_admin() and
--  check_signup_email() are intentionally left alone: policies and the signup screen use them.)
revoke execute on function public.handle_new_team_member()         from public, anon, authenticated;
revoke execute on function public.handle_new_team_member_request() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable()                from public, anon, authenticated;

commit;
