// The admin's pages. `native` pages are React components in this app; every other page is still served by the
// original static admin page (public/_legacy/admin.html) running inside the shell. Move a tab over by adding
// its component to components/admin/views.tsx and setting native: true here.
export type TabId =
  | 'dashboard' | 'applications' | 'talent' | 'pipeline' | 'tasks' | 'leave' | 'calendar' | 'insights'
  | 'members' | 'assignments' | 'activity' | 'reports' | 'security' | 'syshealth';

export type TabDef = { id: TabId; label: string; group: 'Overview' | 'Recruitment' | 'Workspace' | 'Administration'; adminOnly?: boolean; native?: boolean };

export const TABS: TabDef[] = [
  { id: 'dashboard', label: 'Dashboard', group: 'Overview' },
  { id: 'applications', label: 'Applications', group: 'Recruitment' },
  { id: 'talent', label: 'Talent Pool', group: 'Recruitment' },
  { id: 'pipeline', label: 'Pipeline', group: 'Recruitment' },
  { id: 'tasks', label: 'Tasks', group: 'Workspace' },
  { id: 'leave', label: 'Leave', group: 'Workspace' },
  { id: 'calendar', label: 'Calendar', group: 'Workspace' },
  { id: 'insights', label: 'Insights', group: 'Workspace' },
  { id: 'members', label: 'Members', group: 'Administration', adminOnly: true },
  { id: 'assignments', label: 'Assignments', group: 'Administration', adminOnly: true },
  { id: 'activity', label: 'Activity', group: 'Administration', adminOnly: true },
  { id: 'reports', label: 'Reports', group: 'Administration', adminOnly: true },
  { id: 'security', label: 'Security', group: 'Administration', adminOnly: true },
  { id: 'syshealth', label: 'System Health', group: 'Administration', adminOnly: true },
];

export const GROUPS = ['Overview', 'Recruitment', 'Workspace', 'Administration'] as const;
export const isTabId = (v: string | undefined): v is TabId => !!v && TABS.some(t => t.id === v);
export const DEFAULT_TAB: TabId = 'dashboard';
