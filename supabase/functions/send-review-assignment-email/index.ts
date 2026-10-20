// send-review-assignment-email — ADMIN ONLY.
// Before: no authentication, any recipient and unescaped HTML (an open phishing relay), AND it could
// never work for the admin portal: the portal sends `candidateIds` but this function read `candidates`,
// so `candidates.map` threw a TypeError on every call. FROM was also malformed (missing "<").
//
// Portal call (bulkAssign): { reviewerEmail, reviewerName, candidateIds }  — ids are talent_pool ids.
// The legacy shape { candidates: string[] } is still accepted.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.102.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://diraflowai.com';
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

    const { reviewerEmail, candidateIds, candidates } = await req.json();
    if (typeof reviewerEmail !== 'string') return json(req, { error: 'reviewerEmail is required' }, 400);

    // The recipient must be an active reviewer/admin on the team — never an arbitrary address.
    const { data: reviewer } = await c.admin
      .from('team_members').select('email,role,active').ilike('email', likeEscape(reviewerEmail)).maybeSingle();
    if (!reviewer || !reviewer.active || !['reviewer', 'admin'].includes(reviewer.role)) {
      return json(req, { error: 'Recipient is not an active reviewer' }, 403);
    }

    let names: string[] = [];
    if (Array.isArray(candidateIds) && candidateIds.length) {
      const ids = candidateIds.filter((n: unknown) => Number.isInteger(n)).slice(0, 200);
      const { data } = await c.admin.from('talent_pool').select('full_name').in('id', ids);
      names = (data ?? []).map((r: { full_name: string }) => r.full_name);
    } else if (Array.isArray(candidates)) {
      names = candidates.map(String).slice(0, 200);
    }
    if (!names.length) return json(req, { error: 'No candidates to list' }, 400);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: reviewer.email,
        subject: 'New Candidate Review Assignment',
        html: `<h2>Hello,</h2>
          <p>You have been assigned ${names.length} candidate(s) to review.</p>
          <ul>${names.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
          <p>Please log in to the Diraflow Admin Portal to review them.</p>
          <p><a href="${esc(SITE_URL)}/admin">Open Admin Portal</a></p>
          <br><p>Diraflow AI Recruitment System</p>`,
      }),
    });
    if (!res.ok) throw new Error(`Resend error: ${res.status} ${await res.text()}`);
    return json(req, { ok: true, listed: names.length });
  } catch (err) {
    console.error('send-review-assignment-email failed:', err);
    return json(req, { error: 'Could not send assignment email' }, 500);
  }
});
