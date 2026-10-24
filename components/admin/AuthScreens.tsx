'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';

function Card({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <div className="adm-auth">
      <div className="adm-auth-card">
        <div className="adm-auth-logo"><img src="/assets/logo.jpg" alt="" /><span>Diraflow</span></div>
        <div className="adm-auth-label">{label}</div>
        <h1>{title}</h1>
        {children}
      </div>
    </div>
  );
}

export function LoginScreen({ notice, onSubmit }: { notice?: string; onSubmit: (email: string, password: string) => Promise<string | null> }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    const msg = await onSubmit(email.trim(), password);
    if (msg) { setErr(msg); setBusy(false); }
  }
  return (
    <Card label="Authorized access" title="Team sign in">
      {notice && <p className="adm-msg adm-msg-warn">{notice}</p>}
      <form onSubmit={submit}>
        <label className="adm-field"><span>Email address</span>
          <input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@diraflowai.com" /></label>
        <label className="adm-field"><span>Password</span>
          <input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
        <button className="adm-btn adm-btn-primary adm-btn-block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in →'}</button>
        {err && <p className="adm-msg adm-msg-err">{err}</p>}
      </form>
      <p className="adm-auth-links">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- the original page is a static file, not a Next route */}
        <a href="/admin-legacy">Forgot password?</a>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/admin-legacy">Create account</a>
      </p>
      <p className="adm-auth-foot">Access is restricted to Diraflow team members only.</p>
    </Card>
  );
}

function CodeBox({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus]);
  return (
    <input ref={ref} className="adm-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000"
      value={value} onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))} />
  );
}

export function MfaScreen({ onVerify, onCancel }: { onVerify: (code: string) => Promise<string | null>; onCancel: () => void }) {
  const [code, setCode] = useState(''); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (code.length !== 6) { setErr('Enter the 6-digit code from your authenticator app.'); return; }
    setBusy(true); setErr(null);
    const msg = await onVerify(code);
    if (msg) { setErr(msg); setBusy(false); setCode(''); }
  }
  return (
    <Card label="Security verification" title="Enter authenticator code">
      <p className="adm-help">Open your authenticator app (Google Authenticator, Microsoft Authenticator, Authy…) and enter the 6-digit code for Diraflow.</p>
      <form onSubmit={submit}>
        <label className="adm-field"><span>6-digit code</span><CodeBox value={code} onChange={setCode} autoFocus /></label>
        <button className="adm-btn adm-btn-primary adm-btn-block" disabled={busy}>{busy ? 'Verifying…' : 'Verify →'}</button>
        {err && <p className="adm-msg adm-msg-err">{err}</p>}
      </form>
      <p className="adm-auth-foot">Wrong account? <a onClick={onCancel}>Sign out</a></p>
    </Card>
  );
}

export function EnrollScreen({ qr, secret, onConfirm, onCancel }: { qr: string; secret: string; onConfirm: (code: string) => Promise<string | null>; onCancel: () => void }) {
  const [code, setCode] = useState(''); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (code.length !== 6) { setErr('Enter the 6-digit code from your app.'); return; }
    setBusy(true); setErr(null);
    const msg = await onConfirm(code);
    if (msg) { setErr(msg); setBusy(false); setCode(''); }
  }
  return (
    <Card label="Set up two-factor sign-in" title="Scan with your authenticator app">
      <p className="adm-help">Your role requires an authenticator app. Scan the QR code, or type the key in by hand, then enter the 6-digit code it shows.</p>
      <div className="adm-qr"><img src={qr} alt="QR code for your authenticator app" /></div>
      <p className="adm-help" style={{ marginBottom: 4 }}>Can&apos;t scan? Enter this key:</p>
      <code className="adm-secret">{secret}</code>
      <form onSubmit={submit}>
        <label className="adm-field"><span>6-digit code</span><CodeBox value={code} onChange={setCode} /></label>
        <button className="adm-btn adm-btn-primary adm-btn-block" disabled={busy}>{busy ? 'Checking…' : 'Confirm and sign in →'}</button>
        {err && <p className="adm-msg adm-msg-err">{err}</p>}
      </form>
      <p className="adm-auth-foot"><a onClick={onCancel}>Cancel and sign out</a></p>
    </Card>
  );
}
