'use client';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getSupabase } from '@/lib/supabase';
import type { Member } from '@/lib/admin/auth';
import type { TabId } from '@/lib/admin/tabs';
import {
  computeAttendance, computeInsightsKPIs, computeLeaveSummary, computeTeamSummary, computeTopReviewers, daysWaitingFor, keyOf,
} from '@/lib/admin/dashboard-model';
import { approveMember, fetchDashboardData, rejectMember, reviewLeave, setTaskDone, type DashboardData, type TeamRow } from '@/lib/admin/data';
import ChartCanvas from './ChartCanvas';

const PALETTE = ['#F26522', '#0F4C5C', '#F5B50A', '#10B981', '#8B5CF6', '#EF4444'];
const ROLE_COL: Record<string, string> = { admin: '#F26522', reviewer: '#0F4C5C', viewer: '#F5B50A' };
const STAGES: [string, string][] = [['Submitted', '#0F4C5C'], ['Under Review', '#F26522'], ['Interview Required', '#F5B50A'], ['Passed', '#10B981'], ['Accepted', '#34D399'], ['Failed', '#EF4444']];
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TALENT_ORDER = ['In pool', 'Shortlisted', 'Contacted', 'Assigned', 'Inactive'];
const TALENT_COL: Record<string, string> = { 'In pool': '#0F4C5C', Shortlisted: '#10B981', Contacted: '#F5B50A', Assigned: '#F26522', Inactive: '#EF4444' };

const cap = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const initialsOf = (name?: string | null) => { const p = String(name || '?').trim().split(/\s+/); return ((p[0] || '')[0] || '?').toUpperCase() + ((p[1] || '')[0] || '').toUpperCase(); };
const fmtDateTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const fmtDateShort = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—');

function SlaBadge({ days }: { days: number | null }) {
  if (days == null) return <>—</>;
  const cls = days >= 10 ? 's-failed' : days >= 5 ? 's-interview-required' : days >= 2 ? 's-under-review' : 's-passed';
  return <span className={'status-badge ' + cls}>{days >= 10 ? `Overdue · ${days}d` : `${days}d`}</span>;
}

function Kpi({ color, dim, num, label, chip, warn }: { color: string; dim: string; num: ReactNode; label: string; chip: string; warn?: boolean | 'neutral' }) {
  return (
    <div className="stat-card" style={{ ['--stat-color' as string]: color, ['--stat-dim' as string]: dim }}>
      <div className="stat-num">{num}</div><div className="stat-label">{label}</div>
      <span className={'dash-chip' + (warn === 'neutral' ? ' neutral' : warn ? ' warn' : '')}>{chip}</span>
    </div>
  );
}

function Card({ title, link, onLink, right, children }: { title: string; link?: string; onLink?: () => void; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="dash-card">
      <div className="dash-card-h"><h3>{title}</h3>{right}{link && <button className="dash-link" onClick={onLink}>{link}</button>}</div>
      {children}
    </div>
  );
}

function Seg({ map, keys, color, whole }: { map: Record<string, number>; keys: string[]; color: (k: string) => string; whole: number }) {
  return <div className="dash-seg">{keys.map(k => <span key={k} title={cap(k)} style={{ width: `${(map[k] / (whole || 1)) * 100}%`, background: color(k) }} />)}</div>;
}
function Legend({ map, keys, color }: { map: Record<string, number>; keys: string[]; color: (k: string) => string }) {
  return <div className="dash-legend">{keys.map(k => <div key={k}><div className="dl-k"><i className="dash-dot" style={{ background: color(k) }} />{cap(k)}</div><div className="dl-v">{map[k]}</div></div>)}</div>;
}

export default function Dashboard({ member, go, openApp }: { member: Member; go: (tab: TabId) => void; openApp: (id: string) => void }) {
  const sb = getSupabase();
  const admin = member.role === 'admin';
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setFatal(false);
    try { setData(await fetchDashboardData(sb, member)); } catch (e) { console.error('Dashboard load failed:', e); setFatal(true); }
    setLoading(false);
  }, [sb, member]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
  useEffect(() => { load(); }, [load]);

  const m = useMemo(() => {
    if (!data) return null;
    const now = new Date();
    const apps = data.apps.filter(a => !a.is_archived);
    const pending = apps.filter(a => ['Submitted', 'Under Review'].includes(a.status));
    const crew = admin ? data.team.filter(t => t.active) : [{ id: member.id }];
    const kpis = computeInsightsKPIs(apps);
    const myTasks = data.tasks.filter(t => t.assignee_id === member.id && !t.completed)
      .sort((a, b) => new Date(a.due_at || 8.64e15).getTime() - new Date(b.due_at || 8.64e15).getTime());
    return {
      now, apps, pending, kpis, myTasks,
      overdue: pending.filter(a => (daysWaitingFor(a) || 0) >= 10).length,
      shortlisted: data.talent.filter(t => t.status === 'Shortlisted').length,
      myOverdue: myTasks.filter(t => t.due_at && new Date(t.due_at) < now).length,
      att: computeAttendance(crew, data.shifts, data.sessions, data.leave, now, 7),
      leaveSum: computeLeaveSummary(data.leave, now),
      teamSum: computeTeamSummary(data.team, now),
      top: admin ? computeTopReviewers(apps, data.talent, data.team) : [],
    };
  }, [data, admin, member.id]);

  if (fatal) return <div className="dash-empty">Could not load the dashboard. <button className="dash-link" onClick={load}>Try again</button></div>;
  if (!data || !m) return <div className="adm-boot" style={{ minHeight: 240 }}><span className="adm-spinner" /></div>;

  const { apps, pending, kpis, myTasks, att, leaveSum, teamSum, top, now } = m;
  const nameOf = (id?: string | null) => data.team.find(t => t.id === id)?.email || 'Unassigned';
  const hour = now.getHours();
  const greeting = (hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening') + ', ' + (member.email || '').split('@')[0];

  // ── Actions (same prompts and side effects as the original page) ──
  const patchTeam = (id: string, u: Partial<TeamRow>) => setData(d => d && ({ ...d, team: d.team.map(t => (t.id === id ? { ...t, ...u } : t)) }));
  async function onApproveMember(t: TeamRow) {
    if (!confirm(`Approve ${t.email} as ${t.role}? They'll be notified by email.`)) return;
    const r = await approveMember(sb, member, t); if (!r.ok) { alert('Error approving: ' + r.error); return; } patchTeam(t.id, r.update!);
  }
  async function onRejectMember(t: TeamRow) {
    const reason = prompt(`Reason for rejecting ${t.email}'s account request (optional, shown to them by email):`);
    if (reason === null) return;
    const r = await rejectMember(sb, member, t, reason); if (!r.ok) { alert('Error rejecting: ' + r.error); return; } patchTeam(t.id, r.update!);
  }
  async function onLeave(id: string | number, decision: 'Approved' | 'Rejected') {
    const req = data!.leave.find(x => x.id === id); if (!req) return;
    let reason = '';
    if (decision === 'Rejected') { const p = prompt('Reason for rejecting this request (optional):'); if (p === null) return; reason = p; }
    else if (!confirm('Approve this leave request?')) return;
    const r = await reviewLeave(sb, member, data!.team, req, decision, reason); if (!r.ok) { alert('Error updating request: ' + r.error); return; }
    setData(d => d && ({ ...d, leave: d.leave.map(x => (x.id === id ? { ...x, ...r.update } : x)) }));
  }
  async function onTask(id: string, done: boolean) {
    const task = data!.tasks.find(t => t.id === id); if (!task) return;
    const r = await setTaskDone(sb, member, task, done); if (!r.ok) { alert('Error updating task: ' + r.error); return; }
    setData(d => d && ({ ...d, tasks: d.tasks.map(t => (t.id === id ? { ...t, completed: done } : t)) }));
  }

  // ── Derived numbers for the cards ──
  const total = apps.length || 1;
  const counts = STAGES.map(([s]) => apps.filter(a => a.status === s).length);
  const attention = pending.slice().sort((a, b) => (daysWaitingFor(b) || 0) - (daysWaitingFor(a) || 0)).slice(0, 5);
  const upcoming = [
    ...apps.filter(a => a.interview_at && new Date(a.interview_at) >= now).map(a => ({ at: a.interview_at!, title: 'Interview: ' + a.full_name, sub: a.position || '', go: () => openApp(String(a.id)) })),
    ...data.events.map(e => ({ at: e.start_at, title: e.title, sub: e.event_type || '', go: () => go('calendar') })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()).slice(0, 5);
  const totalHours = data.sessions.reduce((t, s) => t + (s.active_seconds || 0) + (s.idle_seconds || 0) + (s.break_seconds || 0), 0) / 3600;
  const roleKeys = Object.keys(teamSum.roles).filter(r => teamSum.roles[r]);
  const typeKeys = Object.keys(teamSum.types);
  const leaveTypes = Object.keys(leaveSum.byType).sort((a, b) => leaveSum.byType[b] - leaveSum.byType[a]);
  const checkinMembers = new Set(data.sessions.map(s => s.team_member_id)).size;
  const avgActiveH = att.totals.present ? data.sessions.reduce((t, s) => t + (s.active_seconds || 0), 0) / 3600 / att.totals.present : 0;
  const lateEmpty = !att.hasStartTimes ? 'Add shift start times (Activity → a member → schedule) to flag late arrivals.' : att.scheduledToday === 0 ? 'Nobody is scheduled today.' : 'No late arrivals today.';
  const maxReviews = top.length ? top[0].n : 1;
  const pendingMembers = data.team.filter(t => t.request_status === 'pending');
  const pendingLeave = data.leave.filter(r => r.status === 'Pending');
  const approvalCount = pendingMembers.length + pendingLeave.length;

  // Charts
  const weeks = Array.from({ length: 8 }, (_, k) => {
    const i = 7 - k; const end = new Date(); end.setHours(23, 59, 59, 999); end.setDate(end.getDate() - i * 7);
    const start = new Date(end); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0);
    return { label: `${start.getDate()}/${start.getMonth() + 1}`, start, end };
  });
  const inWeek = (iso: string | null | undefined, w: { start: Date; end: Date }) => { if (!iso) return false; const d = new Date(iso); return d >= w.start && d <= w.end; };
  const days7 = Array.from({ length: 7 }, (_, k) => { const d = new Date(); d.setDate(d.getDate() - (6 - k)); return { key: keyOf(d), label: d.toLocaleDateString('en-GB', { weekday: 'short' }) }; });
  const hoursOn = (key: string, f: 'active_seconds' | 'idle_seconds' | 'break_seconds') => data.sessions.filter(s => keyOf(new Date(s.login_at)) === key).reduce((t, s) => t + (s[f] || 0), 0) / 3600;
  const tc: Record<string, number> = {}; data.talent.forEach(t => { const s = t.status || 'In pool'; tc[s] = (tc[s] || 0) + 1; });
  const tl = TALENT_ORDER.filter(s => tc[s]);
  const cc: Record<string, number> = {}; apps.forEach(a => { const c = a.country || 'Unknown'; cc[c] = (cc[c] || 0) + 1; });
  const topC = Object.entries(cc).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const stack = { borderRadius: 4, stack: 's' };

  const teamCard = admin && (
    <Card title="Team status" link="Manage" onLink={() => go('members')}>
      <div className="dash-mini"><div><b>{teamSum.active}</b><span>Active</span></div><div><b>{teamSum.pending}</b><span>Pending</span></div><div><b>{teamSum.disabled}</b><span>Disabled</span></div></div>
      <Seg map={teamSum.roles} keys={roleKeys} color={k => ROLE_COL[k] || '#9CA3AF'} whole={teamSum.active} />
      <Legend map={teamSum.roles} keys={roleKeys} color={k => ROLE_COL[k] || '#9CA3AF'} />
      {typeKeys.length > 0 && <><div style={{ marginTop: '1rem' }}><Seg map={teamSum.types} keys={typeKeys} color={k => PALETTE[typeKeys.indexOf(k) % PALETTE.length]} whole={teamSum.active} /></div>
        <Legend map={teamSum.types} keys={typeKeys} color={k => PALETTE[typeKeys.indexOf(k) % PALETTE.length]} /></>}
    </Card>
  );
  const leaveCard = (
    <Card title="Leave by type" link="Leave" onLink={() => go('leave')}>
      <div className="dash-mini" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}><div><b>{leaveSum.onLeaveToday}</b><span>On leave today</span></div><div><b>{leaveSum.total}</b><span>Requests in {now.getFullYear()}</span></div></div>
      {leaveTypes.length ? <>
        <div className="dash-canvas" style={{ height: 150 }}><ChartCanvas type="doughnut" data={{ labels: leaveTypes, datasets: [{ data: leaveTypes.map(t => leaveSum.byType[t]), backgroundColor: leaveTypes.map((_, i) => PALETTE[i % PALETTE.length]) }] }} /></div>
        <Legend map={leaveSum.byType} keys={leaveTypes} color={k => PALETTE[leaveTypes.indexOf(k) % PALETTE.length]} /></>
        : <div className="dash-empty">No leave requests this year.</div>}
    </Card>
  );
  const lateCard = admin && (
    <Card title="Late arrivals today" right={<span className={'dash-chip ' + (att.lateToday.length ? 'warn' : 'neutral')} style={{ margin: 0 }}>{att.hasStartTimes ? att.lateToday.length : '—'}</span>}>
      {att.lateToday.length ? att.lateToday.slice(0, 5).map(l => { const t = data.team.find(x => x.id === l.member_id); return (
        <div className="dash-row" key={l.member_id} style={{ cursor: 'default' }}>
          <span className="row-avatar">{initialsOf(t?.email || '?')}</span>
          <div className="dr-main"><div className="dr-name">{t?.email || 'Member'}</div><div className="dr-sub">{cap(t?.role)} · in at {new Date(l.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div></div>
          <span className="dash-chip warn" style={{ margin: 0 }}>+{l.minutes} min</span>
        </div>); }) : <div className="dash-empty">{lateEmpty}</div>}
    </Card>
  );
  const attendanceCard = (
    <Card title={admin ? 'Attendance trend' : 'My attendance'} right={<span className="dash-chip neutral" style={{ margin: 0 }}>Last 7 days</span>}>
      <div className="dash-mini">{att.hasSchedule
        ? <><div><b>{att.totals.onTime}</b><span>On time</span></div><div><b>{att.totals.late}</b><span>Late</span></div><div><b>{att.totals.absent}</b><span>Absent</span></div></>
        : <><div><b>{att.totals.present}</b><span>Check-ins</span></div><div><b>{checkinMembers}</b><span>{admin ? 'Members active' : 'Days active'}</span></div><div><b>{avgActiveH.toFixed(1)}h</b><span>Avg active / day</span></div></>}</div>
      <div className="dash-canvas" style={{ height: 190 }}>
        <ChartCanvas type="bar" data={{ labels: att.days.map(d => DAY[d.dow]), datasets: att.hasSchedule
          ? [{ label: 'On time', data: att.days.map(d => d.onTime), backgroundColor: '#10B981', ...stack }, { label: 'Late', data: att.days.map(d => d.late), backgroundColor: '#F5B50A', ...stack }, { label: 'Absent', data: att.days.map(d => d.absent), backgroundColor: '#EF4444', ...stack }]
          : [{ label: 'Logged in', data: att.days.map(d => d.present), backgroundColor: '#F26522', ...stack }] }}
          options={{ scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } }, plugins: { legend: { display: true, position: 'bottom' } } }} />
      </div>
      {admin && !att.hasSchedule && <div className="dash-empty" style={{ padding: '.6rem 0 0' }}>No schedules set yet — add shifts in Activity to track on-time, late and absent.</div>}
    </Card>
  );
  const reviewersCard = admin && (
    <Card title="Top reviewers" link="Assignments" onLink={() => go('assignments')}>
      {top.length ? top.map(r => (
        <div className="dash-bar" key={r.id}><div className="db-top"><span>{r.label}</span><b>{r.n}</b></div><div className="db-track"><i style={{ width: `${(r.n / maxReviews) * 100}%` }} /></div></div>
      )) : <div className="dash-empty">No completed reviews yet.</div>}
    </Card>
  );

  return (
    <div id="dash-root">
      <div className="section-header">
        <h2>{greeting}</h2>
        <button className="btn-refresh" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : '↻ Refresh'}</button>
      </div>
      {data.failed.length > 0 && <div className="dash-warn">Some data could not be loaded ({data.failed.join(', ')}), so those numbers may be incomplete.</div>}

      <div className="stats-row">
        <Kpi color="var(--primary)" dim="var(--primary-dim)" num={apps.length} label="Total applications" chip={`+${kpis.newThisWeek} this week`} warn={kpis.newThisWeek ? false : 'neutral'} />
        <Kpi color="var(--teal)" dim="var(--teal-dim)" num={data.talent.length} label="Talent pool" chip={`${m.shortlisted} shortlisted`} warn="neutral" />
        <Kpi color="var(--orange)" dim="var(--orange-dim)" num={pending.length} label="Awaiting review" chip={m.overdue ? `${m.overdue} overdue` : 'On track'} warn={m.overdue ? true : false} />
        <Kpi color="var(--green)" dim="var(--green-dim)" num={kpis.passRate != null ? kpis.passRate + '%' : '—'} label="Pass rate" chip={kpis.avgHiringDays != null ? kpis.avgHiringDays.toFixed(1) + 'd to decision' : 'No decisions yet'} warn="neutral" />
        <Kpi color="var(--purple)" dim="var(--purple-dim)" num={myTasks.length} label="My open tasks" chip={m.myOverdue ? `${m.myOverdue} overdue` : 'None overdue'} warn={m.myOverdue ? true : 'neutral'} />
        {admin && <>
          <Kpi color="var(--teal)" dim="var(--teal-dim)" num={teamSum.active} label="Team members" chip={`+${teamSum.joined30} joined this month`} warn={teamSum.joined30 ? false : 'neutral'} />
          <Kpi color="var(--red)" dim="var(--red-dim)" num={att.hasStartTimes ? att.lateToday.length : '—'} label="Late arrivals today" chip={att.hasStartTimes ? `of ${att.scheduledToday} scheduled` : 'Set shift start times'} warn={att.lateToday.length ? true : 'neutral'} />
        </>}
      </div>

      <div className="dash-grid dash-g-2-1">
        <Card title="Recruitment statistics" link="Open pipeline" onLink={() => go('pipeline')}>
          <div className="dash-mini"><div><b>{apps.length}</b><span>Applicants</span></div><div><b>{counts[4]}</b><span>Accepted</span></div><div><b>{kpis.avgHiringDays != null ? kpis.avgHiringDays.toFixed(1) + 'd' : '—'}</b><span>Avg time to decision</span></div></div>
          <div className="dash-seg">{STAGES.map(([s, c], i) => counts[i] ? <span key={s} title={s} style={{ width: `${(counts[i] / total) * 100}%`, background: c }} /> : null)}</div>
          <div className="dash-legend">{STAGES.map(([s, c], i) => <div key={s}><div className="dl-k"><i className="dash-dot" style={{ background: c }} />{s}</div><div className="dl-v">{counts[i]} <span style={{ fontWeight: 500, color: 'var(--fg2)', fontSize: '.75rem' }}>· {Math.round((counts[i] / total) * 100)}%</span></div></div>)}</div>
        </Card>
        <Card title="Needs attention" link="View all" onLink={() => go('applications')}>
          {attention.length ? attention.map(a => (
            <div className="dash-row" key={a.id} onClick={() => openApp(String(a.id))}>
              <span className="row-avatar">{initialsOf(a.full_name)}</span>
              <div className="dr-main"><div className="dr-name">{a.full_name}</div><div className="dr-sub">{a.position || ''} · {nameOf(a.assigned_reviewer_id)}</div></div>
              <SlaBadge days={daysWaitingFor(a)} />
            </div>)) : <div className="dash-empty">Nothing is waiting for review.</div>}
        </Card>
      </div>

      {admin
        ? <><div className="dash-grid dash-g-3">{teamCard}{leaveCard}{lateCard}</div><div className="dash-grid dash-g-2-1">{attendanceCard}{reviewersCard}</div></>
        : <div className="dash-grid dash-g-1-1">{leaveCard}{attendanceCard}</div>}

      <div className="dash-grid dash-g-2-1">
        <Card title="Applications & talent pool, last 8 weeks">
          <div className="dash-canvas"><ChartCanvas type="bar" data={{ labels: weeks.map(w => w.label), datasets: [
            { label: 'Applications', data: weeks.map(w => apps.filter(a => inWeek(a.submitted_at, w)).length), backgroundColor: '#F26522', borderRadius: 6 },
            { label: 'Talent pool', data: weeks.map(w => data.talent.filter(t => inWeek(t.submitted_at, w)).length), backgroundColor: '#0F4C5C', borderRadius: 6 }] }}
            options={{ plugins: { legend: { display: true, position: 'bottom' } } }} /></div>
        </Card>
        <Card title="Upcoming" link="Calendar" onLink={() => go('calendar')}>
          {upcoming.length ? upcoming.map((u, i) => (
            <div className="dash-up" key={i} onClick={u.go}><div className="dr-name">{u.title}</div><div className="dr-sub">{fmtDateTime(u.at)}{u.sub ? ' · ' + u.sub : ''}</div></div>
          )) : <div className="dash-empty">No upcoming interviews or events.</div>}
        </Card>
      </div>

      <div className="dash-grid dash-g-3">
        <Card title={(admin ? 'Team' : 'My') + ' time logged'} right={<span className="dash-chip neutral" style={{ margin: 0 }}>{totalHours.toFixed(1)}h / 7 days</span>}>
          <div className="dash-canvas"><ChartCanvas type="bar" data={{ labels: days7.map(d => d.label), datasets: [
            { label: 'Active (h)', data: days7.map(d => hoursOn(d.key, 'active_seconds')), backgroundColor: '#F26522', ...stack },
            { label: 'Idle (h)', data: days7.map(d => hoursOn(d.key, 'idle_seconds')), backgroundColor: '#F5B50A', ...stack },
            { label: 'Break (h)', data: days7.map(d => hoursOn(d.key, 'break_seconds')), backgroundColor: '#0F4C5C', ...stack }] }}
            options={{ scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true } }, plugins: { legend: { display: true, position: 'bottom' } } }} /></div>
        </Card>
        <Card title="Talent pool status" link="View all" onLink={() => go('talent')}>
          <div className="dash-canvas"><ChartCanvas type="doughnut" data={{ labels: tl, datasets: [{ data: tl.map(s => tc[s]), backgroundColor: tl.map(s => TALENT_COL[s]) }] }} /></div>
        </Card>
        <Card title="Top countries (applications)">
          <div className="dash-canvas"><ChartCanvas type="bar" data={{ labels: topC.map(e => e[0]), datasets: [{ label: 'Applications', data: topC.map(e => e[1]), backgroundColor: '#F26522', borderRadius: 6 }] }} options={{ indexAxis: 'y' }} /></div>
        </Card>
      </div>

      <div className={'dash-grid' + (admin ? ' dash-g-1-1' : '')}>
        {admin && (
          <Card title="Pending approvals" right={<span className={'dash-chip ' + (approvalCount ? 'warn' : 'neutral')} style={{ margin: 0 }}>{approvalCount}</span>}>
            {approvalCount ? [
              ...pendingMembers.map(t => (
                <div className="dash-row" key={'m' + t.id} style={{ cursor: 'default' }}>
                  <span className="row-avatar">{initialsOf(t.email)}</span>
                  <div className="dr-main"><div className="dr-name">{t.email}</div><div className="dr-sub">Account request · {t.role}</div></div>
                  <div className="dash-actions"><button className="dash-btn ok" onClick={() => onApproveMember(t)}>Approve</button><button className="dash-btn" onClick={() => onRejectMember(t)}>Decline</button></div>
                </div>)),
              ...pendingLeave.map(r => { const who = data.team.find(t => t.id === r.team_member_id); return (
                <div className="dash-row" key={'l' + r.id} style={{ cursor: 'default' }}>
                  <span className="row-avatar">{initialsOf(who?.email || '?')}</span>
                  <div className="dr-main"><div className="dr-name">{who?.email || 'Member'}</div><div className="dr-sub">{r.leave_type} · {fmtDateShort(r.start_date)} – {fmtDateShort(r.end_date)}</div></div>
                  <div className="dash-actions"><button className="dash-btn ok" onClick={() => onLeave(r.id, 'Approved')}>Approve</button><button className="dash-btn" onClick={() => onLeave(r.id, 'Rejected')}>Decline</button></div>
                </div>); }),
            ].slice(0, 6) : <div className="dash-empty">No pending requests.</div>}
          </Card>
        )}
        <Card title="My open tasks" link="View all" onLink={() => go('tasks')}>
          {myTasks.length ? myTasks.slice(0, 6).map(t => (
            <div className="dash-row" key={t.id} style={{ cursor: 'default' }}>
              <input type="checkbox" checked={false} onChange={e => onTask(t.id, e.target.checked)} />
              <div className="dr-main"><div className="dr-name">{t.title}</div><div className="dr-sub" style={t.due_at && new Date(t.due_at) < now ? { color: 'var(--red)' } : undefined}>{t.due_at ? 'Due ' + fmtDateTime(t.due_at) : 'No due date'}</div></div>
            </div>)) : <div className="dash-empty">You have no open tasks.</div>}
        </Card>
      </div>
    </div>
  );
}
