// Diraflow — send-application-email  (called by the public careers page after an application insert)
//
// Before: it emailed whatever { full_name, email, position } the caller sent, with the values dropped
// into HTML unescaped — an open relay for branded phishing mail from careers@diraflowai.com.
// Now it only acts on a REAL application: there must be an `applications` row with that email and
// position submitted in the last 30 minutes, the confirmation goes only to the email stored on that row,
// the name/position shown come from the row, and everything is HTML-escaped.
//
// Secrets: RESEND_API_KEY, RECRUITMENT_EMAIL, SITE_URL (optional)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.102.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_URL = 'https://api.resend.com/emails';
const FROM_ADDRESS = 'Diraflow Recruitment <careers@diraflowai.com>';
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? 'https://diraflowai.com,https://www.diraflowai.com').split(',');

function cors(req: Request) {
  const origin = req.headers.get('Origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    Vary: 'Origin',
  };
}
const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } });
const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));

async function sendEmail(payload: { from: string; to: string | string[]; subject: string; html: string }) {
  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Resend error (${res.status}): ${await res.text()}`);
  return res.json();
}

function candidateEmailHtml(name: string, position: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e5e5;max-width:600px;width:100%;">
        <tr><td style="background:#0f0f0f;padding:28px 40px;">
          <p style="margin:0;color:#c8922a;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">Diraflow AI</p>
          <p style="margin:6px 0 0;color:#ffffff;font-size:20px;font-weight:700;line-height:1.3;">Assessment Received</p>
        </td></tr>
        <tr><td style="padding:36px 40px;color:#333333;font-size:15px;line-height:1.65;">
          <p style="margin:0 0 16px;">Hello ${esc(name)},</p>
          <p style="margin:0 0 16px;">Thank you for completing your assessment for the <strong>${esc(position)}</strong> role.</p>
          <p style="margin:0 0 16px;">We have successfully received your application and assessment responses. Our team will manually review your submission and evaluate your results.</p>
          <p style="margin:0 0 16px;">We will communicate the outcome and next steps once the review process is complete.</p>
          <p style="margin:0 0 8px;">Thank you for your interest in joining Diraflow.</p>
        </td></tr>
        <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #eeeeee;margin:0;"></td></tr>
        <tr><td style="padding:24px 40px;">
          <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#111111;">Diraflow Recruitment Team</p>
          <p style="margin:0;font-size:13px;color:#888888;">Training data for frontier AI &nbsp;·&nbsp; <a href="https://diraflowai.com" style="color:#c8922a;text-decoration:none;">diraflowai.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

function internalEmailHtml(a: { name: string; email: string; position: string; submittedAt: string; siteUrl: string }): string {
  const reviewUrl = `${a.siteUrl}/admin`;
  const date = new Date(a.submittedAt).toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' });
  const row = 'padding:8px 0;border-bottom:1px solid #f0f0f0;';
  const label = 'color:#888888;font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:0.04em;';
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e5e5;max-width:600px;width:100%;">
        <tr><td style="background:#0f0f0f;padding:28px 40px;">
          <p style="margin:0;color:#c8922a;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">Internal — Diraflow Recruitment</p>
          <p style="margin:6px 0 0;color:#ffffff;font-size:20px;font-weight:700;line-height:1.3;">New Application Received</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;color:#333333;line-height:1.6;">
            <tr><td style="${row}${label}width:40%;">Candidate</td><td style="${row}font-weight:600;">${esc(a.name)}</td></tr>
            <tr><td style="${row}${label}">Email</td><td style="${row}"><a href="mailto:${esc(a.email)}" style="color:#c8922a;text-decoration:none;">${esc(a.email)}</a></td></tr>
            <tr><td style="${row}${label}">Position</td><td style="${row}">${esc(a.position)}</td></tr>
            <tr><td style="padding:8px 0;${label}">Submitted</td><td style="padding:8px 0;">${esc(date)}</td></tr>
          </table>
          <div style="margin-top:28px;">
            <a href="${esc(reviewUrl)}" style="display:inline-block;background:#c8922a;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">Review application →</a>
          </div>
        </td></tr>
        <tr><td style="padding:0 40px 24px;font-size:12px;color:#aaaaaa;">This is an automated notification from the Diraflow careers platform.</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405);

  const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
  const RECRUITMENT_EMAIL = Deno.env.get('RECRUITMENT_EMAIL');
  const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://diraflowai.com';
  if (!RESEND_KEY) return json(req, { error: 'RESEND_API_KEY secret is not set' }, 500);
  if (!RECRUITMENT_EMAIL) return json(req, { error: 'RECRUITMENT_EMAIL secret is not set' }, 500);

  let body: { email?: string; position?: string };
  try { body = await req.json(); } catch { return json(req, { error: 'Invalid JSON body' }, 400); }
  const { email, position } = body;
  if (!email || !position) return json(req, { error: 'Missing required fields: email, position' }, 400);

  try {
    // Only act on a real, recent application. Everything shown in the emails comes from this row.
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: app } = await supabase
      .from('applications').select('full_name,email,position,submitted_at')
      .ilike('email', email.trim()).eq('position', position).gt('submitted_at', since)
      .order('submitted_at', { ascending: false }).limit(1).maybeSingle();
    if (!app) return json(req, { error: 'No matching recent application' }, 404);

    await sendEmail({ from: FROM_ADDRESS, to: app.email, subject: 'Assessment Received — Diraflow Application', html: candidateEmailHtml(app.full_name, app.position) });
    await sendEmail({
      from: FROM_ADDRESS, to: RECRUITMENT_EMAIL, subject: `New application: ${app.full_name} — ${app.position}`,
      html: internalEmailHtml({ name: app.full_name, email: app.email, position: app.position, submittedAt: app.submitted_at, siteUrl: SITE_URL }),
    });
    return json(req, { success: true });
  } catch (err) {
    console.error('Email send error:', err);
    return json(req, { error: 'Could not send emails' }, 500);
  }
});
