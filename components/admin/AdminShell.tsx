'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { Member } from '@/lib/admin/auth';
import { THEME_KEY } from '@/lib/admin/auth';
import { DEFAULT_TAB, GROUPS, TABS, isTabId, type TabId } from '@/lib/admin/tabs';
import { legacyReady, legacyWin } from './legacy';
import { NativeView } from './views';

function tabFromPath(pathname: string): TabId {
  const seg = pathname.replace(/^\/admin\/?/, '').split('/')[0];
  return isTabId(seg) ? seg : DEFAULT_TAB;
}
const initialOf = (m: Member) => (m.email || '?').charAt(0).toUpperCase();

export default function AdminShell({ member, onSignOut }: { member: Member; onSignOut: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const tab = tabFromPath(pathname);
  const def = TABS.find(t => t.id === tab)!;
  const isAdmin = member.role === 'admin';
  const native = !!def.native;
  const frameRef = useRef<HTMLIFrameElement>(null);
  const lastLegacyTab = useRef<TabId>(def.native ? 'tasks' : tab);
  // The frame is created once, on the first tab shown; later tab changes go through switchTab.
  const [startTab] = useState<TabId>(() => (def.native ? 'tasks' : tab));
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem(THEME_KEY) === 'dark');
  const [status, setStatus] = useState({ clock: 'Clock in', onBreak: false, canBreak: false, unread: 0 });

  // Visible tabs for this role.
  const groups = useMemo(() => GROUPS
    .map(g => ({ g, items: TABS.filter(t => t.group === g && (!t.adminOnly || isAdmin)) }))
    .filter(x => x.items.length), [isAdmin]);

  // Unknown or not-allowed address → dashboard.
  useEffect(() => {
    if (def.adminOnly && !isAdmin) router.replace('/admin/' + DEFAULT_TAB);
  }, [def, isAdmin, router]);

  // Theme (same storage key as the original page).
  useEffect(() => { document.documentElement.setAttribute('data-theme', dark ? 'dark' : ''); }, [dark]);
  function toggleTheme() {
    const next = !dark; setDark(next);
    localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
    legacyWin(frameRef.current)?.applyTheme?.(next ? 'dark' : 'light');
  }

  // Keep the original page on the right tab whenever a non-native tab is chosen.
  useEffect(() => {
    if (native) return;
    lastLegacyTab.current = tab;
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (legacyReady(frameRef.current)) { legacyWin(frameRef.current)?.switchTab?.(tab); clearInterval(t); }
      else if (tries > 100) clearInterval(t);
    }, 150);
    return () => clearInterval(t);
  }, [tab, native]);

  // The original page tracks time worked (active vs idle) and the inactivity sign-out from input events inside
  // its own frame. Forward activity from the shell so working in a React tab does not count as idle.
  useEffect(() => {
    let last = 0;
    const fwd = () => {
      const now = Date.now(); if (now - last < 1000) return; last = now;
      const w = legacyWin(frameRef.current);
      if (w?.markActivity) w.markActivity(); else localStorage.setItem('diraflow_last_activity', String(now));
    };
    const evs = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'] as const;
    evs.forEach(e => window.addEventListener(e, fwd, { passive: true }));
    return () => evs.forEach(e => window.removeEventListener(e, fwd));
  }, []);

  // Mirror clock / break / unread state from the original page (it owns those features for now).
  useEffect(() => {
    const t = setInterval(() => {
      const w = legacyWin(frameRef.current); if (!w) return;
      try {
        const d = w.document;
        const clock = d.querySelector('#clock-toggle-btn .btn-label')?.textContent?.trim() || 'Clock in';
        const brk = d.getElementById('break-toggle-btn') as HTMLElement | null;
        const unread = parseInt(d.getElementById('notif-badge')?.textContent || '0', 10) || 0;
        setStatus({ clock, canBreak: !!brk && brk.style.display !== 'none', onBreak: !!brk && brk.classList.contains('active'), unread });
      } catch { /* frame still loading */ }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  /** Features that still live in the original page (profile, notifications, search) open there. */
  function viaLegacy(fn: 'openProfileModal' | 'toggleNotifPanel' | 'search') {
    router.push('/admin/' + lastLegacyTab.current);
    setTimeout(() => {
      const w = legacyWin(frameRef.current);
      if (fn === 'search') (w?.document.getElementById('global-search-input') as HTMLInputElement | null)?.focus();
      else w?.[fn]?.();
    }, 400);
  }

  return (
    <div className={'adm-app' + (menuOpen ? ' adm-menu-open' : '')}>
      <aside className="adm-side">
        <div className="adm-brand"><img src="/assets/logo.jpg" alt="" /><span>Diraflow</span><em>Admin</em></div>
        <nav>
          {groups.map(({ g, items }) => (
            <div key={g}>
              <div className="adm-side-label">{g}</div>
              {items.map(t => (
                <Link key={t.id} href={'/admin/' + t.id} onClick={() => setMenuOpen(false)} className={`adm-nav nav-${t.id}` + (t.id === tab ? ' active' : '')}>{t.label}</Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="adm-clock"><span className={'adm-dot' + (status.clock.toLowerCase().includes('out') ? ' on' : '')} /><span>{status.clock.toLowerCase().includes('out') ? 'Clocked in' : 'Not clocked in'}</span></div>
      </aside>
      <div className="adm-backdrop" onClick={() => setMenuOpen(false)} />

      <div className="adm-col">
        {native && (
          <header className="adm-top">
            <button className="adm-icon adm-menu-btn" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">☰</button>
            <div className="adm-title"><h1>{def.label}</h1><p>Home › {def.group} › {def.label}</p></div>
            <button className="adm-search" onClick={() => viaLegacy('search')}>Search applications, candidates, members…</button>
            <div className="adm-top-right">
              <span className={'adm-role ' + member.role}>{member.role}</span>
              <button className="adm-btn adm-btn-ghost" onClick={() => legacyWin(frameRef.current)?.toggleClock?.()}>🕐 {status.clock}</button>
              {status.canBreak && <button className={'adm-btn adm-btn-ghost' + (status.onBreak ? ' on' : '')} onClick={() => legacyWin(frameRef.current)?.toggleBreak?.()}>☕ {status.onBreak ? 'End break' : 'Break'}</button>}
              <button className="adm-icon" onClick={toggleTheme} aria-label="Toggle theme">{dark ? '☀️' : '🌙'}</button>
              <button className="adm-icon adm-bell" onClick={() => viaLegacy('toggleNotifPanel')} aria-label="Notifications">🔔{status.unread > 0 && <b>{status.unread}</b>}</button>
              <button className="adm-icon adm-avatar" onClick={() => viaLegacy('openProfileModal')} aria-label="My profile">{initialOf(member)}</button>
              <button className="adm-btn adm-btn-ghost" onClick={onSignOut}>Sign out</button>
            </div>
          </header>
        )}

        {!native && <button className="adm-icon adm-fab" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">☰</button>}

        {native && <main className="adm-main"><NativeView tab={tab} member={member} /></main>}

        {/* The original admin page: always loaded (it keeps time tracking, notifications and the not-yet-migrated tabs
            running); shown whenever the chosen tab has not been moved to React. */}
        <iframe
          ref={frameRef} data-legacy title="Admin"
          className={'adm-legacy' + (native ? ' adm-legacy-hidden' : '')}
          src={`/admin-legacy?embed=1&tab=${startTab}`}
        />
      </div>
    </div>
  );
}
