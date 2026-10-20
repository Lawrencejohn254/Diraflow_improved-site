-- Follow-up to 20261020120000_harden_team_members_and_talent_pool.sql
--
-- PROBLEM: signup creates the team_members row in an auth.users trigger (role 'viewer', pending,
-- inactive), and THEN the admin portal upserts the role the person asked for. The first version of
-- the guard reverted that role on every non-admin update, so every signup request showed up as
-- "viewer" and admins lost the role the person actually requested.
--
-- FIX: while a row is still pending AND inactive, its owner may change `role` (it is only a request;
-- is_admin() needs active = true, and an admin must approve before the row can do anything).
-- Every other privileged column stays locked, and once the row is approved/rejected/active the
-- role is locked again.

create or replace function public.guard_team_members_privileges()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null or coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.active           := false;
    new.request_status   := 'pending';
    new.permissions      := '{}'::jsonb;
    new.reviewed_at      := null;
    new.reviewed_by      := null;
    new.rejection_reason := null;
    new.manager_id       := null;
    return new;
  end if;

  -- UPDATE by a non-admin
  if not (old.request_status = 'pending' and old.active = false) then
    new.role := old.role;          -- role is only editable while the request is still pending
  elsif new.role not in ('viewer', 'reviewer', 'admin') then
    new.role := old.role;
  end if;
  new.id               := old.id;
  new.email            := old.email;
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
