import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/next';
import '@/components/admin/admin.css';
import '@/components/admin/icons.css';

export const metadata: Metadata = {
  title: 'Diraflow Admin',
  robots: { index: false, follow: false, nocache: true },
};

// Applies the saved theme before first paint so the page never flashes light.
const themeScript = `try{if(localStorage.getItem('diraflow_theme')==='dark')document.documentElement.setAttribute('data-theme','dark')}catch(e){}`;

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <link rel="icon" type="image/png" sizes="32x32" href="/assets/logo.jpg" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="adm-body">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
