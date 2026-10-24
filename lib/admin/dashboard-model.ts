// Dashboard calculations. Pure functions (no React, no Supabase) so they can be tested on their own:
//   node --test lib/admin/dashboard-model.test.ts
// Ported from the original admin page. Shift start times are wall-clock times in the viewer's time zone.

export const LATE_GRACE_MIN = 15;

export type Member = { id: string; email?: string; role?: string; active?: boolean; request_status?: string | null; created_at?: string | null; employment_type?: string | null };
export type Shift = { team_member_id: string; day_of_week: number; expected_hours: number | string | null; start_time?: string | null };
export type Session = { team_member_id: string; login_at: string; active_seconds?: number | null; idle_seconds?: number | null; break_seconds?: number | null };
export type Leave = { id: string | number; team_member_id: string; leave_type?: string | null; status: string; start_date: string; end_date: string };
export type App = {
  id: string | number; full_name?: string; position?: string | null; country?: string | null; status: string; is_archived?: boolean | null;
  submitted_at?: string | null; assigned_at?: string | null; reviewed_at?: string | null; interview_at?: string | null; assigned_reviewer_id?: string | null;
};
export type Talent = { status?: string | null; submitted_at?: string | null; reviewed_at?: string | null; owner_id?: string | null };

const pad2 = (n: number) => String(n).padStart(2, '0');
export const keyOf = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const startMinutes = (t?: string | null): number | null => {
  if (!t) return null;
  const p = String(t).split(':'), h = Number(p[0]), m = Number(p[1] || 0);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};

export type AttendanceDay = { key: string; dow: number; onTime: number; late: number; absent: number; present: number };
export type Attendance = {
  days: AttendanceDay[]; hasSchedule: boolean; hasStartTimes: boolean;
  totals: { onTime: number; late: number; absent: number; present: number };
  lateToday: { member_id: string; minutes: number; at: string }[]; scheduledToday: number;
};

export function computeAttendance(members: { id: string }[], shifts: Shift[], sessions: Session[], leave: Leave[], now: Date, days: number): Attendance {
  const sched: Record<string, Record<number, Shift>> = {};
  shifts.forEach(s => { if (Number(s.expected_hours) > 0) (sched[s.team_member_id] ||= {})[s.day_of_week] = s; });
  const out: Attendance = {
    days: [], hasSchedule: Object.keys(sched).length > 0,
    hasStartTimes: shifts.some(s => Number(s.expected_hours) > 0 && !!s.start_time),
    totals: { onTime: 0, late: 0, absent: 0, present: 0 }, lateToday: [], scheduledToday: 0,
  };
  const todayKey = keyOf(now), nowMin = now.getHours() * 60 + now.getMinutes();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - i); // noon avoids DST edges
    const key = keyOf(d), dow = d.getDay(), isToday = key === todayKey;
    const row: AttendanceDay = { key, dow, onTime: 0, late: 0, absent: 0, present: 0 };
    members.forEach(m => {
      const mine = sessions.filter(s => s.team_member_id === m.id && keyOf(new Date(s.login_at)) === key);
      if (mine.length) row.present++;
      const sh = sched[m.id]?.[dow];
      if (!sh) return;
      if (isToday) out.scheduledToday++;
      if (leave.some(r => r.status === 'Approved' && r.team_member_id === m.id && key >= r.start_date && key <= r.end_date)) return;
      const st = startMinutes(sh.start_time);
      if (mine.length) {
        const first = mine.reduce((a, s) => (new Date(s.login_at) < new Date(a.login_at) ? s : a));
        const f = new Date(first.login_at), fm = f.getHours() * 60 + f.getMinutes();
        if (st != null && fm > st + LATE_GRACE_MIN) {
          row.late++;
          if (isToday) out.lateToday.push({ member_id: m.id, minutes: fm - st, at: first.login_at });
        } else row.onTime++;
      } else if (!isToday || (st != null && nowMin > st + Number(sh.expected_hours) * 60)) {
        row.absent++; // today only counts once the shift is over
      }
    });
    out.totals.onTime += row.onTime; out.totals.late += row.late; out.totals.absent += row.absent; out.totals.present += row.present;
    out.days.push(row);
  }
  out.lateToday.sort((a, b) => b.minutes - a.minutes);
  return out;
}

export function computeLeaveSummary(leave: Leave[], now: Date) {
  const year = String(now.getFullYear()), today = keyOf(now);
  const rows = leave.filter(r => r.status !== 'Rejected' && String(r.start_date).slice(0, 4) === year);
  const byType: Record<string, number> = {};
  rows.forEach(r => { const t = r.leave_type || 'Other'; byType[t] = (byType[t] || 0) + 1; });
  const onLeaveToday = leave.filter(r => r.status === 'Approved' && today >= r.start_date && today <= r.end_date).length;
  return { byType, total: rows.length, onLeaveToday };
}

export function computeTeamSummary(team: Member[], now: Date) {
  const active = team.filter(m => m.active);
  const roles: Record<string, number> = { admin: 0, reviewer: 0, viewer: 0 };
  active.forEach(m => { const r = m.role || 'viewer'; roles[r] = (roles[r] || 0) + 1; });
  const types: Record<string, number> = {};
  active.forEach(m => { if (m.employment_type) types[m.employment_type] = (types[m.employment_type] || 0) + 1; });
  return {
    active: active.length, roles, types,
    pending: team.filter(m => m.request_status === 'pending').length,
    disabled: team.filter(m => !m.active && m.request_status !== 'pending' && m.request_status !== 'rejected').length,
    joined30: active.filter(m => m.created_at && now.getTime() - new Date(m.created_at).getTime() < 30 * 86400000).length,
  };
}

export function computeTopReviewers(apps: App[], talent: Talent[], team: Member[]) {
  const counts: Record<string, number> = {};
  apps.forEach(a => { if (a.reviewed_at && a.assigned_reviewer_id) counts[a.assigned_reviewer_id] = (counts[a.assigned_reviewer_id] || 0) + 1; });
  talent.forEach(t => { if (t.reviewed_at && t.owner_id) counts[t.owner_id] = (counts[t.owner_id] || 0) + 1; });
  return Object.keys(counts)
    .map(id => ({ id, n: counts[id], label: team.find(m => m.id === id)?.email || 'Former member' }))
    .sort((a, b) => b.n - a.n).slice(0, 5);
}

/** Whole days an application has waited for a decision; null once it has one. */
export function daysWaitingFor(row: App, nowMs: number = Date.now()): number | null {
  if (!['Submitted', 'Under Review'].includes(row.status)) return null;
  const since = row.assigned_at || row.submitted_at;
  return since ? Math.floor((nowMs - new Date(since).getTime()) / 86400000) : null;
}

export function computeInsightsKPIs(rows: App[], nowMs: number = Date.now()) {
  const decided = rows.filter(r => ['Passed', 'Failed', 'Accepted'].includes(r.status));
  const passed = decided.filter(r => r.status === 'Passed' || r.status === 'Accepted').length;
  const passRate = decided.length ? Math.round((passed / decided.length) * 100) : null;
  const timed = rows.filter(r => r.submitted_at && r.reviewed_at && new Date(r.reviewed_at) > new Date(r.submitted_at));
  const avgHiringDays = timed.length
    ? timed.reduce((sum, r) => sum + (new Date(r.reviewed_at!).getTime() - new Date(r.submitted_at!).getTime()), 0) / timed.length / 86400000
    : null;
  const newThisWeek = rows.filter(r => r.submitted_at && nowMs - new Date(r.submitted_at).getTime() < 7 * 86400000).length;
  return { passRate, avgHiringDays, newThisWeek };
}
