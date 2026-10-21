-- Shift start time (local to the member's timezone) so the dashboard can tell on-time from late.
-- Nullable and additive: existing rows and the current admin portal are unaffected.
-- (Already applied to the live project on 2026-10-20 via the Supabase connector.)
alter table public.shifts add column if not exists start_time time;
comment on column public.shifts.start_time is 'Expected start of shift in the member''s own timezone (team_members.timezone). NULL = not set, lateness is not tracked.';
