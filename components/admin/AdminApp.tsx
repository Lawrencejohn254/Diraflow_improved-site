'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import { AccessError, isAal2, loadMember, mfaRequiredFor, type Member } from '@/lib/admin/auth';
import { LoginScreen, MfaScreen, EnrollScreen } from './AuthScreens';
import AdminShell from './AdminShell';
import { legacyWin } from './legacy';

type Phase =
  | { k: 'loading' }
  | { k: 'login'; notice?: string }
  | { k: 'mfa'; factorId: string }
  | { k: 'enroll'; factorId: string; qr: string; secret: string }
  | { k: 'ready'; member: Member };

/** Owns sign-in: password → authenticator code (or first-time setup) → the shell. */
export default function AdminApp() {
  const sb = getSupabase();
  const [phase, setPhase] = useState<Phase>({ k: 'loading' });
  const factorRef = useRef<string | null>(null);

  const startMfa = useCallback(async () => {
    const { data: f, error } = await sb.auth.mfa.listFactors();
    if (error) throw error;
    const verified = (f.totp || [])[0];
    if (verified) { factorRef.current = verified.id; setPhase({ k: 'mfa', factorId: verified.id }); return; }
    // Clear half-finished setups from an earlier attempt, then start a fresh enrolment.
    for (const x of f.all || []) if (x.status !== 'verified') await sb.auth.mfa.unenroll({ factorId: x.id });
    const { data, error: eErr } = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Diraflow ' + Date.now() });
    if (eErr) throw eErr;
    factorRef.current = data.id;
    setPhase({ k: 'enroll', factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }, [sb]);

  /** After the password step (or a restored session): require the authenticator for listed roles, then load the member. */
  const proceed = useCallback(async (user: User, isNewLogin: boolean) => {
    try {
      if ((await mfaRequiredFor(sb, user.id)) && !(await isAal2(sb))) { await startMfa(); return; }
      setPhase({ k: 'ready', member: await loadMember(sb, user, isNewLogin) });
    } catch (e) {
      if (e instanceof AccessError) { setPhase({ k: 'login', notice: e.message }); return; }
      await sb.auth.signOut();
      setPhase({ k: 'login', notice: 'Could not finish signing in: ' + (e instanceof Error ? e.message : String(e)) });
    }
  }, [sb, startMfa]);

  useEffect(() => {
    // Password-reset emails land here with a recovery token; the original page owns that screen.
    if (location.hash.includes('type=recovery')) { location.replace('/admin-legacy' + location.hash); return; }
    let live = true;
    (async () => {
      const { data: { session } } = await sb.auth.getSession();
      if (!live) return;
      if (!session) { setPhase({ k: 'login' }); return; }
      await proceed(session.user, false);
    })();
    const { data: sub } = sb.auth.onAuthStateChange(ev => {
      if (ev === 'SIGNED_OUT') setPhase(p => (p.k === 'login' ? p : { k: 'login' }));
    });
    return () => { live = false; sub.subscription.unsubscribe(); };
  }, [sb, proceed]);

  async function signIn(email: string, password: string): Promise<string | null> {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      sb.from('failed_logins').insert({ email, reason: error?.message ?? 'sign-in failed', user_agent: navigator.userAgent }).then(() => {}, () => {});
      return error?.message ?? 'Sign in failed.';
    }
    await proceed(data.user, true);
    return null;
  }

  async function verifyCode(code: string): Promise<string | null> {
    const factorId = factorRef.current; if (!factorId) return 'Session expired. Please sign in again.';
    const { data: ch, error: cErr } = await sb.auth.mfa.challenge({ factorId });
    if (cErr) return cErr.message;
    const { error } = await sb.auth.mfa.verify({ factorId, challengeId: ch.id, code });
    if (error) return 'That code is not valid. Wait for the next code and try again.';
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return 'Could not complete sign-in. Please try again.';
    await proceed(user, true);
    return null;
  }

  async function cancelMfa() { await sb.auth.signOut(); factorRef.current = null; setPhase({ k: 'login' }); }

  /** Sign out through the original page when it is loaded, so it closes the activity session properly. */
  async function signOut() {
    const w = legacyWin(document.querySelector<HTMLIFrameElement>('iframe[data-legacy]'));
    try { if (w && typeof w.doLogout === 'function') await w.doLogout('manual'); } catch { /* fall through */ }
    await sb.auth.signOut();
    setPhase({ k: 'login' });
  }

  switch (phase.k) {
    case 'loading': return <div className="adm-boot"><span className="adm-spinner" /></div>;
    case 'login': return <LoginScreen notice={phase.notice} onSubmit={signIn} />;
    case 'mfa': return <MfaScreen onVerify={verifyCode} onCancel={cancelMfa} />;
    case 'enroll': return <EnrollScreen qr={phase.qr} secret={phase.secret} onConfirm={verifyCode} onCancel={cancelMfa} />;
    case 'ready': return <AdminShell member={phase.member} onSignOut={signOut} />;
  }
}
