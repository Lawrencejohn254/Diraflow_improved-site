import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

// Same storage keys as the original admin page, so both stay in step while they run side by side.
export const SESSION_ID_KEY = 'diraflow_session_id';
export const THEME_KEY = 'diraflow_theme';

export type Member = {
  id: string; email: string; role: 'admin' | 'reviewer' | 'viewer'; active: boolean;
  request_status?: string | null; rejection_reason?: string | null; active_session_id?: string | null;
  avatar_url?: string | null; full_name?: string | null; [k: string]: unknown;
};

export class AccessError extends Error {}

/** Roles listed in site_settings.mfa_required_roles must pass the authenticator step. */
export async function mfaRequiredFor(sb: SupabaseClient, userId: string): Promise<boolean> {
  const { data: setting } = await sb.from('site_settings').select('mfa_required_roles').eq('id', 1).maybeSingle();
  const { data: member } = await sb.from('team_members').select('role').eq('id', userId).maybeSingle();
  const roles: string[] = (setting && setting.mfa_required_roles) || ['admin', 'reviewer', 'viewer'];
  return member ? roles.includes(member.role) : true;
}

/** Loads the signed-in member and applies the same gates the original page applied. Throws AccessError with a user-facing message. */
export async function loadMember(sb: SupabaseClient, user: User, isNewLogin: boolean): Promise<Member> {
  const { data, error } = await sb.from('team_members').select('*').eq('id', user.id).single();
  if (error || !data) { await sb.auth.signOut(); throw new AccessError('Your account is not authorized to access this portal.'); }
  if (!data.active) {
    await sb.auth.signOut();
    throw new AccessError(data.request_status === 'rejected'
      ? 'Your account application was not approved.' + (data.rejection_reason ? ' Reason: ' + data.rejection_reason : '')
      : "Your account is still pending admin approval. You'll be able to sign in once it's activated.");
  }
  if (isNewLogin) {
    // A fresh sign-in becomes the one active session; every other device is signed out.
    const sessionId = crypto.randomUUID();
    const { error: upErr } = await sb.from('team_members').update({ active_session_id: sessionId }).eq('id', user.id);
    if (upErr) throw new AccessError('Could not register this device as your active session (' + upErr.message + '). Please contact an admin.');
    localStorage.setItem(SESSION_ID_KEY, sessionId);
    await sb.auth.signOut({ scope: 'others' }).catch(() => {});
    return { ...data, active_session_id: sessionId } as Member;
  }
  const local = localStorage.getItem(SESSION_ID_KEY);
  if (!local || local !== data.active_session_id) {
    await sb.auth.signOut();
    localStorage.removeItem(SESSION_ID_KEY);
    throw new AccessError('Your session has ended because this account was signed in from another device.');
  }
  return data as Member;
}

export async function isAal2(sb: SupabaseClient): Promise<boolean> {
  const { data } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  return !!data && data.currentLevel === 'aal2';
}

export type { Session, User };
