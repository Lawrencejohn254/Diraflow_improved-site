'use client';
import type { ReactNode } from 'react';
import { OPEN_EVENT, type OpenDetail } from '@/content/careers';

/** Opens one of the careers modals (rendered once by <CareersModals/>). */
export default function CareerButton({ action, className, children }: { action: OpenDetail; className?: string; children: ReactNode }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new CustomEvent<OpenDetail>(OPEN_EVENT, { detail: action }))}>
      {children}
    </button>
  );
}
