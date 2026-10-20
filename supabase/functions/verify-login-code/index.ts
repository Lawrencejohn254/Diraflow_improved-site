// verify-login-code — requires the caller to be signed in, and only ever checks the CALLER's own code.
// Before: no authentication; it took user_id and code from the body and pasted them straight into a
// PostgREST URL (query-parameter injection), so anyone could probe codes for any user_id.
// Now: the user id comes from the verified session, filters are parameterised through supabase-js,
// and the code is single-use.
//
// NOTE: like send-login-code, this is a UI gate (the password session already exists). It is replaced
// by Supabase TOTP MFA (AAL2 enforced in RLS) in the admin rebuild.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.102.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    if (!auth.startsWith('Bearer ')) return json(req, { error: 'Not authenticated' }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json(req, { error: 'Not authenticated' }, 401);

    const { code } = await req.json();
    if (typeof code !== 'string' && typeof code !== 'number') return json(req, { error: 'Missing verification data' }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: rows, error } = await admin
      .from('login_codes').select('id,expires_at').eq('user_id', user.id).eq('code', String(code).trim()).limit(1);
    if (error) throw error;

    if (!rows || rows.length === 0) return json(req, { success: false, message: 'Invalid verification code' }, 401);
    if (new Date(rows[0].expires_at) < new Date()) return json(req, { success: false, message: 'Verification code expired' }, 401);

    await admin.from('login_codes').delete().eq('id', rows[0].id);
    return json(req, { success: true, message: 'Verification successful' });
  } catch (error) {
    console.error('verify-login-code failed:', error);
    return json(req, { error: 'Verification failed' }, 500);
  }
});
