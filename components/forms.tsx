'use client';
import { createContext, useContext, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';

export type FormStatus = 'idle' | 'sending' | 'ok' | 'error';
type Ctx = { status: FormStatus; ref: string | null };
const FormCtx = createContext<Ctx>({ status: 'idle', ref: null });

export const useFormStatus = () => useContext(FormCtx);

/** Formspree form: posts FormData as JSON-accepting fetch and exposes status to <FormSubmit/>, <FormMessage/>, <FormRef/>. */
export function FormspreeForm({
  id, action, children, className, style, makeRef, beforeSubmit, lockOnSuccess = false, resetAfterMs,
}: {
  id?: string; action: string | undefined; children: ReactNode; className?: string; style?: CSSProperties; resetAfterMs?: number;
  makeRef?: () => string; beforeSubmit?: (form: HTMLFormElement) => boolean; lockOnSuccess?: boolean;
}) {
  const [status, setStatus] = useState<FormStatus>('idle');
  const [ref, setRef] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (beforeSubmit && !beforeSubmit(form)) return;
    setStatus('sending');
    try {
      if (!action || action.includes('YOUR_FORM_ID')) throw new Error('Form endpoint is not configured');
      const fd = new FormData(form);
      const reference = makeRef?.() ?? null;
      if (reference) fd.append('reference_number', reference);
      const res = await fetch(action, { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(String(res.status));
      setRef(reference);
      if (!lockOnSuccess) form.reset();
      setStatus('ok');
      if (resetAfterMs) setTimeout(() => setStatus('idle'), resetAfterMs);
    } catch (err) {
      console.error('[form]', id, err);
      setStatus('error');
    }
  }

  return (
    <FormCtx.Provider value={{ status, ref }}>
      <form id={id ? `${id}-form` : undefined} className={className} style={style} action={action} method="POST" onSubmit={onSubmit}>
        {lockOnSuccess ? <fieldset disabled={status === 'ok'} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>{children}</fieldset> : children}
      </form>
    </FormCtx.Provider>
  );
}

export function FormSubmit({ id, className, idle, busy = 'Sending…', retry = 'Try again →', hideOnSuccess = true, style }: {
  id?: string; className?: string; idle: ReactNode; busy?: ReactNode; retry?: ReactNode; hideOnSuccess?: boolean; style?: CSSProperties;
}) {
  const { status } = useFormStatus();
  if (status === 'ok' && hideOnSuccess) return null;
  return (
    <button type="submit" id={id} className={className} style={style} disabled={status === 'sending'}>
      {status === 'sending' ? busy : status === 'error' ? retry : idle}
    </button>
  );
}

export function FormMessage({ kind, id, className, style, as: T = 'div', children }: {
  kind: 'success' | 'error'; id?: string; className?: string; style?: CSSProperties; as?: 'div' | 'p'; children: ReactNode;
}) {
  const { status } = useFormStatus();
  const show = (kind === 'success' && status === 'ok') || (kind === 'error' && status === 'error');
  return <T id={id} className={className} style={style || show ? { ...style, ...(show ? { display: 'block' } : {}) } : undefined} role={kind === 'error' ? 'alert' : 'status'}>{children}</T>;
}

export function FormRef() {
  return <>{useFormStatus().ref}</>;
}
