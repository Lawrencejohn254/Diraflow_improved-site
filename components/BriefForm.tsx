'use client';
import { useState, type FormEvent } from 'react';
import type { ServiceData } from '@/lib/services';

type Status = 'idle' | 'sending' | 'ok' | 'error';

/** Formspree brief form (replaces the old #brief-form markup + main.js handler). */
export default function BriefForm({ form }: { form: ServiceData['cta']['form'] }) {
  const [status, setStatus] = useState<Status>('idle');

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch(form.action, { method: 'POST', body: new FormData(e.currentTarget), headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(String(res.status));
      e.currentTarget.reset();
      setStatus('ok');
    } catch {
      setStatus('error');
    }
  }

  return (
    <form className="form-fields" onSubmit={onSubmit}>
      <input type="hidden" name="_subject" value={form.subject} />
      <div>
        <label className="form-label" htmlFor="sv-name">Name *</label>
        <input id="sv-name" className="brief-field" type="text" name="name" required placeholder="Your full name" />
      </div>
      <div>
        <label className="form-label" htmlFor="sv-email">Work email *</label>
        <input id="sv-email" className="brief-field" type="email" name="email" required placeholder="you@company.com" />
      </div>
      <div>
        <label className="form-label" htmlFor="sv-type">{form.selectLabel}</label>
        <select id="sv-type" className="brief-field" name="annotation_type" required defaultValue="">
          <option value="" disabled>{form.selectPlaceholder}</option>
          {form.options.map(o => <option key={o}>{o}</option>)}
        </select>
      </div>
      <div>
        <label className="form-label" htmlFor="sv-brief">Project brief *</label>
        <textarea id="sv-brief" className="brief-field" name="brief" required rows={4} placeholder={form.briefPlaceholder} />
      </div>
      <button type="submit" className="sv-btn" style={{ width: '100%', justifyContent: 'center' }} disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : form.submit}
      </button>
      {status === 'ok' && <p className="brief-status ok" role="status">✓ Brief received! We&apos;ll be in touch within one business day.</p>}
      {status === 'error' && <p className="brief-status err" role="alert">Something went wrong — please email contact@diraflowai.com</p>}
      <p style={{ fontSize: '.72rem', color: 'var(--subtle)', textAlign: 'center', margin: 0 }}>No commitment required. We respond within one business day.</p>
    </form>
  );
}
