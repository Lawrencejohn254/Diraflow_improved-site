import type { ReactNode } from 'react';
import AdminApp from '@/components/admin/AdminApp';

// The shell lives in the layout so it stays mounted (and the original page keeps running inside it) while the
// address changes from one tab to the next.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <><AdminApp />{children}</>;
}
