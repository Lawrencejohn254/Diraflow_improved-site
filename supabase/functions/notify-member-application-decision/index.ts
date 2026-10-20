// notify-member-application-decision — ADMIN ONLY.
// Before: no authentication, any recipient, unescaped HTML — anyone could send a convincing
// "your Diraflow account was approved as <anything>" email from your domain to any address.
// Also: FROM was malformed ("Diraflow Admin lawrence.john@diraflowai.com>", missing "<"), so Resend
// most likely rejected every send.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.102.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
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

async function requireAdmin(req: Request) {
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return { status: 401, error: 'Not authenticated' } as const;
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) return { status: 401, error: 'Not authenticated' } as const;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: m } = await admin.from('team_members').select('role,active').eq('id', user.id).maybeSingle();
  if (!m || !m.active || m.role !== 'admin') return { status: 403, error: 'Forbidden' } as const;
  return { admin } as const;
}

// ilike treats % and _ as wildcards; escape them so an email is matched literally.
const likeEscape = (s: string) => s.trim().replace(/[\\%_]/g, '\\$&');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  try {
    const c = await requireAdmin(req);
    if ('error' in c) return json(req, { error: c.error }, c.status);

    const { email, decision, role, reason } = await req.json();
    if (typeof email !== 'string' || !['approved', 'rejected'].includes(decision)) {
      return json(req, { error: 'email and a valid decision are required' }, 400);
    }

    // Only ever email someone who actually has a team account request on file.
    const { data: member } = await c.admin.from('team_members').select('email').ilike('email', likeEscape(email)).maybeSingle();
    if (!member) return json(req, { error: 'No account request found for that email' }, 404);

    const approved = decision === 'approved';
    const html = approved
      ? `<p>Good news — your Diraflow team account request has been approved as <strong>${esc(role)}</strong>.</p>
         <p>You can now sign in to the admin dashboard using the email and password you registered with.</p>`
      : `<p>Thank you for your interest in joining the Diraflow team.</p>
         <p>After review, we're not able to approve your account request at this time.</p>
         ${reason ? `<p><strong>Reason:</strong> ${esc(reason)}</p>` : ''}`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: member.email,
        subject: approved ? 'Your Diraflow team account has been approved' : 'Update on your Diraflow team account request',
        html,
      }),
    });
    if (!res.ok) throw new Error(`Resend error: ${res.status} ${await res.text()}`);
    return json(req, { ok: true });
  } catch (err) {
    console.error('notify-member-application-decision failed:', err);
    return json(req, { error: 'Could not send notification' }, 500);
  }
});
