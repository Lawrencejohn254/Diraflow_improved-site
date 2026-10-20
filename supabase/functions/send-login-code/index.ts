// send-login-code — requires the caller to be signed in (the portal calls it right after
// signInWithPassword, so a session already exists).
// Before: no authentication, and it trusted { userId, email } from the request body — anyone could make
// "Diraflow Security <security@diraflowai.com>" email a code to ANY address (a spam/phishing relay),
// with no rate limit, using Math.random().
// Now: userId and email come from the verified session, never the body; one code per minute per
// user; the code is generated with a cryptographic RNG.
//
// NOTE: this email code is checked only by the browser after the password session already exists, so
// it is a UI step, not real MFA. The admin rebuild (step 3) replaces it with Supabase TOTP MFA (AAL2).
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

function sixDigitCode(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(100000 + (buf[0] % 900000));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    if (!auth.startsWith('Bearer ')) return json(req, { error: 'Not authenticated' }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user || !user.email) return json(req, { error: 'Not authenticated' }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Rate limit: a code created in the last minute has expires_at > now + 9 minutes.
    const recent = new Date(Date.now() + 9 * 60 * 1000).toISOString();
    const { data: fresh } = await admin.from('login_codes').select('id').eq('user_id', user.id).gt('expires_at', recent).limit(1);
    if (fresh && fresh.length) return json(req, { success: true, message: 'A code was just sent. Check your inbox.' });

    // Only one live code per user.
    await admin.from('login_codes').delete().eq('user_id', user.id);

    const code = sixDigitCode();
    const { error: saveErr } = await admin.from('login_codes').insert({
      user_id: user.id,
      code,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    if (saveErr) throw new Error('Database error: ' + saveErr.message);

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) throw new Error('Missing Resend API key');

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Diraflow Security <security@diraflowai.com>',
        to: [user.email],
        subject: 'Your Diraflow verification code',
        html: `
          <div style="font-family:Arial,sans-serif;padding:30px;background:#f7f7f7;">
            <div style="max-width:500px;margin:auto;background:white;padding:30px;border-radius:12px;">
              <h2>Diraflow Security Verification</h2>
              <p>Someone is attempting to sign in to your Diraflow admin portal.</p>
              <p>Your verification code is:</p>
              <h1 style="letter-spacing:8px;font-size:40px;">${code}</h1>
              <p>This code expires in 10 minutes.</p>
              <p>If you did not request this code, please contact your administrator.</p>
            </div>
          </div>`,
      }),
    });
    if (!emailResponse.ok) throw new Error('Email error: ' + (await emailResponse.text()));

    return json(req, { success: true, message: 'Verification code sent' });
  } catch (error) {
    console.error('send-login-code failed:', error);
    return json(req, { error: 'Could not send verification code' }, 500);
  }
});
