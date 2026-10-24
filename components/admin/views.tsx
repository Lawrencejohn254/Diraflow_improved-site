'use client';
import type { Member } from '@/lib/admin/auth';
import type { TabId } from '@/lib/admin/tabs';
import Dashboard from './Dashboard';

/** React implementations of migrated tabs. Add a case here and set `native: true` for the tab in lib/admin/tabs.ts. */
export function NativeView({ tab, member, go, openApp }: { tab: TabId; member: Member; go: (tab: TabId) => void; openApp: (id: string) => void }) {
  switch (tab) {
    case 'dashboard': return <Dashboard member={member} go={go} openApp={openApp} />;
    default: return <div className="adm-empty">The {tab} page has not been migrated yet.</div>;
  }
}
