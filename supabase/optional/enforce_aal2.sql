-- OPTIONAL — apply ONLY AFTER every admin/reviewer/viewer has signed in once and set up their authenticator app.
-- Until then, applying this locks members out of the data tables (the portal itself still lets them reach the setup screen).
--
-- What it does: for members whose role is listed in site_settings.mfa_required_roles, the database refuses reads
-- and writes on the tables below unless the session is "aal2" (password + authenticator code). Without this,
-- the two-factor step is only a screen in the portal and someone with just a password could call the API directly.
-- Not affected: the public careers form (anonymous), edge functions (service role), team_members and site_settings
-- (needed to reach the setup screen), and members whose role is not listed as requiring two-factor.
--
-- To undo: run the DROP POLICY block at the bottom.

create or replace function public.mfa_satisfied()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
    or not exists (
      select 1
      from public.team_members m
      join public.site_settings s on s.id = 1
      where m.id = auth.uid()
        and coalesce(s.mfa_required_roles, '["admin","reviewer","viewer"]'::jsonb) ? m.role
    );
$$;
revoke all on function public.mfa_satisfied() from public, anon;
grant execute on function public.mfa_satisfied() to authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'applications','talent_pool','candidate_documents','interview_records','comments','communications','score_history',
    'pii_view_log','blacklist_entries','leave_requests','shifts','tasks','projects','project_members','project_notes',
    'project_files','activity_sessions','activity_breaks','activity_log','calendar_events','announcements','email_templates',
    'saved_views','notifications','team_invites','cms_media','cms_pages','cms_seo','cms_settings','job_settings'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists require_aal2_for_mfa_roles on public.%I', t);
      execute format('create policy require_aal2_for_mfa_roles on public.%I as restrictive for all to authenticated using (public.mfa_satisfied()) with check (public.mfa_satisfied())', t);
    end if;
  end loop;
end $$;

-- UNDO:
-- do $$ declare t text; begin
--   for t in select tablename from pg_policies where schemaname='public' and policyname='require_aal2_for_mfa_roles' loop
--     execute format('drop policy require_aal2_for_mfa_roles on public.%I', t); end loop; end $$;
-- drop function if exists public.mfa_satisfied();
