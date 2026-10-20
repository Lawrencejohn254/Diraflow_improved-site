import type { ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/next';
import LegacyBridge from './LegacyBridge';

/** Shared <html>/<body> shell used by both route-group root layouts. */
export default function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <link rel="icon" type="image/png" sizes="32x32" href="/assets/logo.jpg" />
      </head>
      <body>
        {children}
        <LegacyBridge />
        <Analytics />
      </body>
    </html>
  );
}
