// invite-team-member — ADMIN ONLY.
// Before: no authentication at all (anyone on the internet could make your project email invites
// to any address), it logged request bodies, and it returned stack traces to the caller.
// Also: the old redirectTo (/admin/application) is not a route on the site; invites landed on a 404.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.102.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://diraflowai.com';
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

async function requireMember(req: Request, roles?: string[]) {
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return { status: 401, error: 'Not authenticated' } as const;
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) return { status: 401, error: 'Not authenticated' } as const;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: member } = await admin.from('team_members').select('id,email,role,active').eq('id', user.id).maybeSingle();
  if (!member || !member.active || (roles && !roles.includes(member.role))) return { status: 403, error: 'Forbidden' } as const;
  return { user, member, admin } as const;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  try {
    const c = await requireMember(req, ['admin']);
    if ('error' in c) return json(req, { success: false, errorMessage: c.error }, c.status);

    const { email, role } = await req.json();
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return json(req, { success: false, errorMessage: 'A valid email is required' }, 400);
    }
    if (!['admin', 'reviewer', 'viewer'].includes(role)) {
      return json(req, { success: false, errorMessage: 'Invalid role' }, 400);
    }

    const invite = await c.admin.auth.admin.inviteUserByEmail(email.trim().toLowerCase(), {
      redirectTo: `${SITE_URL}/admin`,
    });
    // The portal shows "Invitation sent" whenever the call does not error, so a failed invite
    // must be a non-2xx response or the admin is told it worked when it did not.
    if (invite.error) return json(req, { success: false, errorMessage: invite.error.message }, 400);
    return json(req, invite);
  } catch (err) {
    console.error('invite-team-member failed:', err);
    return json(req, { success: false, errorMessage: 'Invite failed' }, 500);
  }
});
