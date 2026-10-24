import type { SupabaseClient } from '@supabase/supabase-js';
import type { App, Leave, Member as TeamMember, Session, Shift, Talent } from './dashboard-model';
import type { Member as Me } from './auth';

export type Task = { id: string; title: string; assignee_id: string | null; completed: boolean; due_at?: string | null; related_table?: string | null; related_id?: string | null };
export type CalEvent = { id: string | number; title: string; event_type?: string | null; start_at: string };
export type TeamRow = TeamMember & { notif_inapp?: boolean | null };

export type DashboardData = {
  team: TeamRow[]; apps: App[]; talent: Talent[]; leave: Leave[]; tasks: Task[]; sessions: Session[]; events: CalEvent[]; shifts: Shift[];
  /** Names of the lists that could not be loaded (permissions or network), so the page can say so instead of showing zeros silently. */
  failed: string[];
};

/** Loads everything the dashboard shows. Admins get the whole team; other roles get what RLS lets them see. */
export async function fetchDashboardData(sb: SupabaseClient, me: Me): Promise<DashboardData> {
  const failed: string[] = [];
  const get = async <T,>(name: string, q: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> => {
    const { data, error } = await q;
    if (error) { failed.push(name); console.error('Dashboard: could not load ' + name, error); }
    return data ?? [];
  };
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const teamQ = me.role === 'admin'
    ? sb.from('team_members').select('*').order('created_at', { ascending: false })
    : sb.from('team_members').select('id,email,role,active,employment_type,created_at').eq('active', true);
  const [team, apps, talent, leave, tasks, sessions, events, shifts] = await Promise.all([
    get<TeamRow>('team', teamQ),
    get<App>('applications', sb.from('applications').select('*').order('submitted_at', { ascending: false })),
    get<Talent>('talent pool', sb.from('talent_pool').select('*').order('submitted_at', { ascending: false })),
    get<Leave>('leave', sb.from('leave_requests').select('*').order('created_at', { ascending: false })),
    get<Task>('tasks', sb.from('tasks').select('*').order('due_at', { ascending: true, nullsFirst: false })),
    get<Session>('activity', sb.from('activity_sessions').select('*').gte('login_at', since)),
    get<CalEvent>('calendar', sb.from('calendar_events').select('*').gte('start_at', new Date().toISOString()).order('start_at').limit(8)),
    get<Shift>('shifts', sb.from('shifts').select('*')),
  ]);
  return { team, apps, talent, leave, tasks, sessions, events, shifts, failed };
}

export async function logActivity(sb: SupabaseClient, me: Me, actionType: string, detail: string, relatedTable?: string | null, relatedId?: string | number | null) {
  const { error } = await sb.from('activity_log').insert({
    team_member_id: me.id, action_type: actionType, detail, related_table: relatedTable || null, related_id: relatedId ? String(relatedId) : null,
  });
  if (error) console.error('Could not log activity:', error);
}

/** In-app notification, unless the recipient switched them off. */
export async function notify(sb: SupabaseClient, team: TeamRow[], recipientId: string, type: string, title: string, message: string, relatedTable: string, relatedId: string | number) {
  const m = team.find(x => x.id === recipientId);
  if (m && m.notif_inapp === false) return;
  const { error } = await sb.from('notifications').insert({ recipient_id: recipientId, type, title, message, related_table: relatedTable, related_id: String(relatedId) });
  if (error) console.error('Could not create notification:', error);
}

export async function approveMember(sb: SupabaseClient, me: Me, m: TeamRow): Promise<{ ok: boolean; update?: Partial<TeamRow>; error?: string }> {
  const update = { active: true, request_status: 'approved', reviewed_by: me.id, reviewed_at: new Date().toISOString() };
  const { error } = await sb.from('team_members').update(update).eq('id', m.id);
  if (error) return { ok: false, error: error.message };
  await logActivity(sb, me, 'member_approved', `Approved ${m.email} as ${m.role}`, 'team_members', m.id);
  const { error: mailErr } = await sb.functions.invoke('notify-member-application-decision', { body: { email: m.email, decision: 'approved', role: m.role } });
  if (mailErr) console.warn('Approval email failed (non-blocking):', mailErr);
  return { ok: true, update };
}

export async function rejectMember(sb: SupabaseClient, me: Me, m: TeamRow, reason: string): Promise<{ ok: boolean; update?: Partial<TeamRow>; error?: string }> {
  const update = { active: false, request_status: 'rejected', reviewed_by: me.id, reviewed_at: new Date().toISOString(), rejection_reason: reason || null };
  const { error } = await sb.from('team_members').update(update).eq('id', m.id);
  if (error) return { ok: false, error: error.message };
  await logActivity(sb, me, 'member_rejected', `Rejected ${m.email}'s account request${reason ? ` — Reason: ${reason}` : ''}`, 'team_members', m.id);
  const { error: mailErr } = await sb.functions.invoke('notify-member-application-decision', { body: { email: m.email, decision: 'rejected', role: m.role, reason: reason || null } });
  if (mailErr) console.warn('Rejection email failed (non-blocking):', mailErr);
  return { ok: true, update };
}

export async function reviewLeave(sb: SupabaseClient, me: Me, team: TeamRow[], req: Leave, decision: 'Approved' | 'Rejected', reason: string): Promise<{ ok: boolean; update?: Partial<Leave>; error?: string }> {
  const update = { status: decision, reviewed_by: me.id, reviewed_at: new Date().toISOString(), rejection_reason: reason || null };
  const { error } = await sb.from('leave_requests').update(update).eq('id', req.id);
  if (error) return { ok: false, error: error.message };
  const who = team.find(x => x.id === req.team_member_id)?.email || 'member';
  await logActivity(sb, me, 'leave_' + decision.toLowerCase(), `${decision} leave request for ${who}`, 'leave_requests', req.id);
  await notify(sb, team, req.team_member_id, 'leave_decision', `Leave request ${decision.toLowerCase()}`,
    `Your ${req.leave_type} request (${req.start_date} to ${req.end_date}) was ${decision.toLowerCase()}.${reason ? ' Reason: ' + reason : ''}`, 'leave_requests', req.id);
  return { ok: true, update };
}

export async function setTaskDone(sb: SupabaseClient, me: Me, task: Task, completed: boolean): Promise<{ ok: boolean; error?: string }> {
  const { error } = await sb.from('tasks').update({ completed, completed_at: completed ? new Date().toISOString() : null }).eq('id', task.id);
  if (error) return { ok: false, error: error.message };
  await logActivity(sb, me, completed ? 'task_completed' : 'task_reopened', `${completed ? 'Completed' : 'Reopened'} task "${task.title}"`, task.related_table, task.related_id);
  return { ok: true };
}
