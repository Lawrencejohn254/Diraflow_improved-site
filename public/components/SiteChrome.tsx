'use client';
import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Nav, Drawer, Footer } from './chrome.generated';
import SiteEffects from './SiteEffects';

// Pages that live "under" a nav item highlight that item.
const GROUPS: Record<string, string[]> = {
  '/solutions': ['/3d-lidar', '/audio-annotation', '/data-classification', '/image-annotation', '/nlp-annotation', '/video-annotation'],
  '/industries': ['/industry-detail', '/healthcare-life-sciences'],
  '/blog': ['/blog-posts'],
};

export function SiteHeader() {
  const pathname = usePathname();
  const [drawerOpen, setOpen] = useState(false);
  const openDrawer = useCallback(() => setOpen(true), []);
  const closeDrawer = useCallback(() => setOpen(false), []);

  useEffect(() => { document.body.style.overflow = drawerOpen ? 'hidden' : ''; }, [drawerOpen]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => { setOpen(false); }, [pathname]);

  const active = (href: string) =>
    pathname === href || (GROUPS[href] ?? []).some(g => pathname === g || pathname.startsWith(g + '/'));
  const p = { pathname, active, drawerOpen, openDrawer, closeDrawer };
  return (<><Nav {...p} /><Drawer {...p} /><SiteEffects /></>);
}

export function SiteFooter() { return <Footer />; }
