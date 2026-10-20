'use client';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

/** A <button> that navigates (keeps the original button styling, e.g. .industry-cta). */
export default function LinkButton({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const router = useRouter();
  return <button type="button" className={className} onClick={() => router.push(href)}>{children}</button>;
}
