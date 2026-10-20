// ai-assist — ACTIVE TEAM MEMBERS ONLY.
// Before: no authentication, so anyone could call this URL and spend your ANTHROPIC_API_KEY credits.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.102.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? 'https://diraflowai.com,https://www.diraflowai.com').split(',');
const MODEL = Deno.env.get('AI_ASSIST_MODEL') ?? 'claude-sonnet-4-6';
const MAX_PAYLOAD_CHARS = 20000;

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

async function requireMember(req: Request) {
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return { status: 401, error: 'Not authenticated' } as const;
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) return { status: 401, error: 'Not authenticated' } as const;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: member } = await admin.from('team_members').select('id,role,active').eq('id', user.id).maybeSingle();
  if (!member || !member.active) return { status: 403, error: 'Forbidden' } as const;
  return { user, member } as const;
}

type Rec = Record<string, unknown>;
const PROMPTS: Record<string, (r: Rec) => string> = {
  summarize_candidate: (r) => `Summarize this candidate for a recruiter in 3-4 sentences: ${JSON.stringify(r)}`,
  generate_interview_questions: (r) => `Generate 6 interview questions for this candidate, one per line, based on their background: ${JSON.stringify(r)}`,
  generate_offer_letter: (r) => `Write a professional offer-of-engagement letter draft for ${r.full_name}, position ${r.position || 'the role'}, keep it under 200 words.`,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  try {
    const c = await requireMember(req);
    if ('error' in c) return json(req, { error: c.error }, c.status);

    const { task, payload } = await req.json();
    const record = payload?.record;
    if (typeof task !== 'string' || !(task in PROMPTS) || typeof record !== 'object' || record === null) {
      return json(req, { error: 'Unknown task' }, 400);
    }
    if (JSON.stringify(record).length > MAX_PAYLOAD_CHARS) return json(req, { error: 'Payload too large' }, 413);

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) return json(req, { error: 'AI is not configured' }, 500);

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: 600, messages: [{ role: 'user', content: PROMPTS[task](record as Rec) }] }),
    });
    if (!resp.ok) {
      console.error('Anthropic API error', resp.status, await resp.text());
      return json(req, { error: 'AI request failed' }, 502);
    }
    const data = await resp.json();
    return json(req, { text: data.content?.[0]?.text || '' });
  } catch (err) {
    console.error('ai-assist failed:', err);
    return json(req, { error: 'AI request failed' }, 500);
  }
});
