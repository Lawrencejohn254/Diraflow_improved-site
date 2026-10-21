-- Phase 3 (dashboard): per-day shift start time so the dashboard can show late arrivals and attendance.
-- Additive and nullable: existing rows keep working, and members without a start time are simply
-- not counted as late. Admins already have full access to `shifts` through the "Admins manage shifts" policy.
-- The time is a wall-clock time interpreted in the viewing admin's browser time zone (the team is in one zone today).

alter table public.shifts add column if not exists start_time time;

comment on column public.shifts.start_time is
  'Expected shift start (wall-clock). NULL = not set; the dashboard then cannot judge lateness for that day.';
