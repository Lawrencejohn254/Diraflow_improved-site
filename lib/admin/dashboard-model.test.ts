import test from 'node:test';
import assert from 'node:assert/strict';
import { computeAttendance, computeLeaveSummary, computeTeamSummary, computeTopReviewers, computeInsightsKPIs, daysWaitingFor, keyOf } from './dashboard-model.ts';

// Wednesday 21 Oct 2026, 11:00 local time.
const now = new Date(2026, 9, 21, 11, 0, 0);
const at = (daysAgo: number, h: number, m: number) => { const d = new Date(now); d.setDate(d.getDate() - daysAgo); d.setHours(h, m, 0, 0); return d.toISOString(); };
const weekdays = (id: string, start: string | null) => [1, 2, 3, 4, 5].map(dow => ({ team_member_id: id, day_of_week: dow, expected_hours: 8, start_time: start }));

test('on time, late (beyond 15 min grace) and absent', () => {
  const shifts = [...weekdays('a', '09:00:00'), ...weekdays('b', '09:00:00'), ...weekdays('c', '09:00:00')];
  const sessions = [
    { team_member_id: 'a', login_at: at(0, 9, 10) },  // within grace -> on time today
    { team_member_id: 'b', login_at: at(0, 9, 40) },  // 40 min late today
  ];
  const r = computeAttendance([{ id: 'a' }, { id: 'b' }, { id: 'c' }], shifts, sessions, [], now, 1);
  assert.equal(r.days.length, 1);
  assert.equal(r.days[0].onTime, 1); assert.equal(r.days[0].late, 1);
  assert.equal(r.days[0].absent, 0, 'c has not logged in but the shift is not over yet');
  assert.deepEqual(r.lateToday.map(l => [l.member_id, l.minutes]), [['b', 40]]);
  assert.equal(r.scheduledToday, 3);
});

test('approved leave is neither late nor absent; no start time means never late', () => {
  const shifts = [...weekdays('a', '09:00:00'), ...weekdays('b', null)];
  const leave = [{ id: 1, team_member_id: 'a', status: 'Approved', start_date: keyOf(now), end_date: keyOf(now) }];
  const sessions = [{ team_member_id: 'b', login_at: at(0, 14, 0) }];
  const r = computeAttendance([{ id: 'a' }, { id: 'b' }], shifts, sessions, leave, now, 1);
  assert.equal(r.days[0].absent, 0); assert.equal(r.days[0].late, 0); assert.equal(r.days[0].onTime, 1);
  assert.equal(r.hasStartTimes, true);
});

test('past scheduled day without a login is absent; weekend is not scheduled', () => {
  const r = computeAttendance([{ id: 'a' }], weekdays('a', '09:00:00'), [], [], now, 7);
  const byDow = Object.fromEntries(r.days.map(d => [d.dow, d]));
  assert.equal(byDow[0].absent + byDow[6].absent, 0);
  assert.equal(r.totals.absent, 4, 'Thu Fri Mon Tue absent; Wednesday (today) not over yet');
});

test('leave summary ignores rejected and other years', () => {
  const leave = [
    { id: 1, team_member_id: 'a', leave_type: 'Annual', status: 'Approved', start_date: '2026-10-20', end_date: '2026-10-22' },
    { id: 2, team_member_id: 'a', leave_type: 'Sick', status: 'Pending', start_date: '2026-11-01', end_date: '2026-11-02' },
    { id: 3, team_member_id: 'a', leave_type: 'Annual', status: 'Rejected', start_date: '2026-03-01', end_date: '2026-03-02' },
    { id: 4, team_member_id: 'a', leave_type: 'Annual', status: 'Approved', start_date: '2025-03-01', end_date: '2025-03-02' },
  ];
  const s = computeLeaveSummary(leave, now);
  assert.deepEqual(s.byType, { Annual: 1, Sick: 1 }); assert.equal(s.total, 2); assert.equal(s.onLeaveToday, 1);
});

test('team summary', () => {
  const team = [
    { id: '1', role: 'admin', active: true, created_at: at(200, 9, 0) }, { id: '2', role: 'reviewer', active: true, created_at: at(5, 9, 0) },
    { id: '3', role: 'viewer', active: false, request_status: 'pending' }, { id: '4', role: 'reviewer', active: false, request_status: 'approved' },
    { id: '5', role: 'viewer', active: false, request_status: 'rejected' },
  ];
  const t = computeTeamSummary(team, now);
  assert.equal(t.active, 2); assert.equal(t.pending, 1); assert.equal(t.disabled, 1); assert.equal(t.joined30, 1);
  assert.deepEqual(t.roles, { admin: 1, reviewer: 1, viewer: 0 });
});

test('top reviewers count apps and talent, label unknown members', () => {
  const apps = [
    { id: 1, status: 'Passed', reviewed_at: at(1, 9, 0), assigned_reviewer_id: 'r1' }, { id: 2, status: 'Failed', reviewed_at: at(2, 9, 0), assigned_reviewer_id: 'r1' },
    { id: 3, status: 'Submitted', assigned_reviewer_id: 'r2' },
  ];
  const talent = [{ reviewed_at: at(1, 9, 0), owner_id: 'r2' }, { reviewed_at: at(1, 9, 0), owner_id: 'gone' }];
  const top = computeTopReviewers(apps, talent, [{ id: 'r1', email: 'one@x.com' }, { id: 'r2', email: 'two@x.com' }]);
  assert.deepEqual(top.map(t => [t.label, t.n]), [['one@x.com', 2], ['two@x.com', 1], ['Former member', 1]]);
});

test('waiting days and KPIs', () => {
  const nowMs = now.getTime();
  assert.equal(daysWaitingFor({ id: 1, status: 'Submitted', submitted_at: at(13, 9, 0) }, nowMs), 13);
  assert.equal(daysWaitingFor({ id: 1, status: 'Passed', submitted_at: at(13, 9, 0) }, nowMs), null);
  const k = computeInsightsKPIs([
    { id: 1, status: 'Passed', submitted_at: at(10, 9, 0), reviewed_at: at(8, 9, 0) }, { id: 2, status: 'Failed', submitted_at: at(10, 9, 0), reviewed_at: at(6, 9, 0) },
    { id: 3, status: 'Accepted', submitted_at: at(2, 9, 0) }, { id: 4, status: 'Submitted', submitted_at: at(1, 9, 0) },
  ], nowMs);
  assert.equal(k.passRate, 67); assert.equal(k.avgHiringDays, 3); assert.equal(k.newThisWeek, 2);
});
