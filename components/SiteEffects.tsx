'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { installLegacyBridge, trackedRun } from '@/lib/legacy-bridge';
import { initLegacyMain } from '@/lib/legacy-main';

/** Re-runs the ported main.js effects (scroll reveal, counters, tickers, modals, forms) on every route change. */
export default function SiteEffects() {
  const pathname = usePathname();
  useEffect(() => {
    installLegacyBridge();
    return trackedRun(initLegacyMain);
  }, [pathname]);
  return null;
}
