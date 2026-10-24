import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import RootShell from '@/components/RootShell';
import { SiteHeader, SiteFooter } from '@/components/SiteChrome';
import './styles.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://diraflowai.com'),
  title: { default: 'Diraflow — Premium Training Data for AI', template: '%s' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <RootShell>
      <SiteHeader />
      {children}
      <SiteFooter />
    </RootShell>
  );
}
