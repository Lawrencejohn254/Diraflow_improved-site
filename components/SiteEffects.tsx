'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const REVEAL = '.card, .post-card, .job-card, .testimonial, .industry-card, .process-step, .faq-item, .feature-row, .compare-card, .hero-stat';

/**
 * Site-wide motion, replacing the old assets/main.js:
 *  - nav shadow once scrolled (CSS: html[data-scrolled] nav.top)
 *  - fade/slide-in of cards as they enter the viewport (skipped for prefers-reduced-motion)
 *  - subtle 3D tilt on .card-glow
 * No dark mode: the old script's system-preference dark theme never ran in production and no page has a toggle.
 */
export default function SiteEffects() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const onScroll = () => { if (window.scrollY > 10) root.dataset.scrolled = 'true'; else delete root.dataset.scrolled; };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); delete root.dataset.scrolled; };
  }, []);

  useEffect(() => {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach((e, i) => {
        if (!e.isIntersecting) return;
        const el = e.target as HTMLElement;
        el.style.transitionDelay = `${(i % 4) * 60}ms`;
        el.style.opacity = '1';
        el.style.transform = 'translateY(0) scale(1)';
        io.unobserve(el);
      });
    }, { threshold: 0.07, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll<HTMLElement>(REVEAL).forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px) scale(.99)';
      el.style.transition = 'opacity .6s cubic-bezier(.22,1,.36,1), transform .6s cubic-bezier(.22,1,.36,1), border-color .25s, box-shadow .25s';
      io.observe(el);
    });
    return () => io.disconnect();
  }, [pathname]);

  useEffect(() => {
    const card = (t: EventTarget | null) => (t instanceof Element ? t.closest<HTMLElement>('.card-glow') : null);
    const move = (e: MouseEvent) => {
      const el = card(e.target); if (!el) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `translateY(-4px) perspective(800px) rotateX(${-y * 4}deg) rotateY(${x * 4}deg)`;
    };
    const leave = (e: MouseEvent) => { const el = card(e.target); if (el) el.style.transform = ''; };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseout', leave);
    return () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseout', leave); };
  }, []);

  return null;
}
