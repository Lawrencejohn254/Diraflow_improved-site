'use client';
import { useEffect } from 'react';

/** Highlights the sidebar link of the section currently in view (privacy policy). */
export default function PolicyScrollSpy() {
  useEffect(() => {
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.sidebar-nav a'));
    // Only the sections that have a sidebar link (the old script tracked every element with an id).
    const sections = links
      .map(a => document.getElementById((a.getAttribute('href') ?? '').slice(1)))
      .filter((el): el is HTMLElement => !!el);
    const onScroll = () => {
      let current = '';
      for (const s of sections) if (window.scrollY >= s.offsetTop - 120) current = s.id;
      for (const a of links) a.classList.toggle('active', a.getAttribute('href') === '#' + current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return null;
}
