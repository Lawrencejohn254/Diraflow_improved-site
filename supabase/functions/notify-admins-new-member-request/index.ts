// notify-admins-new-member-request — called from the signup screen, so it cannot require a login.
// Before: it emailed every admin whatever `email` / `requestedRole` text the caller sent, unescaped,
// so anyone could push phishing text into your admins' inboxes from your own sender address.
// Now it only reports a REAL pending request: the email must match a pending team_members row created
// in the last 24h, and the role shown comes from that row, not from the request body.
// FROM was malformed (missing "<"); fixed.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.102.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_ADDRESS = Deno.env.get('NOTIFY_FROM') ?? 'Diraflow Admin <careers@diraflowai.com>';
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? 'https://diraflowai.com,https://www.diraflowai.com').split(',');

function cors(req: Request) {
  const origin = req.headers.get('Origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    Vary: 'Origin',
  };
}
const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } });
const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));

// ilike treats % and _ as wildcards; escape them so an email is matched literally.
const likeEscape = (s: string) => s.trim().replace(/[\\%_]/g, '\\$&');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  try {
    const { email } = await req.json();
    if (typeof email !== 'string' || !email.includes('@')) return json(req, { error: 'email is required' }, 400);

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: request } = await supabase
      .from('team_members').select('email,role')
      .ilike('email', likeEscape(email)).eq('request_status', 'pending').gt('created_at', since).maybeSingle();
    // Same response either way so this cannot be used to probe which emails exist.
    if (!request) return json(req, { ok: true, notified: 0 });

    const { data: admins, error } = await supabase.from('team_members').select('email').eq('role', 'admin').eq('active', true);
    if (error) throw error;
    if (!admins?.length) return json(req, { ok: true, notified: 0 });

    const results = await Promise.all(admins.map((a) =>
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM_ADDRESS,
          to: a.email,
          subject: 'New team account request — Diraflow Admin',
          html: `<p>A new account request has come in.</p>
                 <p><strong>Email:</strong> ${esc(request.email)}<br>
                 <strong>Requested role:</strong> ${esc(request.role)}</p>
                 <p>Review it under the Members tab in the admin dashboard.</p>`,
        }),
      })));
    return json(req, { ok: true, notified: admins.length, failed: results.filter((r) => !r.ok).length });
  } catch (err) {
    console.error('notify-admins-new-member-request failed:', err);
    return json(req, { error: 'Could not send notification' }, 500);
  }
});
