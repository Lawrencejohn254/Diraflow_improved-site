'use client';
import type { Member } from '@/lib/admin/auth';
import type { TabId } from '@/lib/admin/tabs';

/** React implementations of migrated tabs. Add a case here and set `native: true` for the tab in lib/admin/tabs.ts. */
export function NativeView({ tab }: { tab: TabId; member: Member }) {
  return <div className="adm-empty">The {tab} page has not been migrated yet.</div>;
}
