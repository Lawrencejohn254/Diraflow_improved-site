-- OPTIONAL — NOT part of the automatic migration. Review the behaviour change before applying.
--
-- `applications` has two older, loose policies next to the newer role-aware ones. Postgres ORs
-- permissive policies together, so the loose ones defeat the strict ones:
--   * "Team members can view applications"  -> any active member (even a viewer) sees every application,
--                                              which makes the reviewer-only-sees-assigned rule in
--                                              `applications_select` meaningless.
--   * "Reviewers can update applications"   -> any active member (even a viewer) can update any application.
--
-- Dropping them enforces what `applications_select` / `applications_update` already say:
--   admin & viewer: read all   |  reviewer: read/update only applications assigned to them
--   admin: update all          |  viewer: read-only
--
-- BEHAVIOUR CHANGE: reviewers will stop seeing unassigned applications; viewers can no longer edit.

begin;
drop policy if exists "Team members can view applications" on public.applications;
drop policy if exists "Reviewers can update applications"  on public.applications;
commit;
