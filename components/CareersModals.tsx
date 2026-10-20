/* eslint-disable react/no-unescaped-entities */
'use client';
// Careers application modals. Ported from the inline script in careers.html:
// same Supabase tables/bucket/edge function, same fields; now React state instead of getElementById.
import { useEffect, useState, type FormEvent } from 'react';
import { ASSESSMENTS, OPEN_EVENT, type AssessmentKey, type OpenDetail } from '@/content/careers';
import { SEND_APPLICATION_EMAIL_URL, SUPABASE_ANON_KEY, getSupabase, uploadResume } from '@/lib/supabase';

type Msg = { kind: 'success' | 'error'; text: string } | null;

const GENERIC_ERROR = 'please try again or contact us directly.';
const errText = (err: unknown) => (err instanceof Error && err.message ? err.message : (err as { message?: string })?.message || GENERIC_ERROR);

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '');
const flag = (fd: FormData, k: string) => !!fd.get(k);
const fileOf = (fd: FormData, k: string) => { const f = fd.get(k); return f instanceof File && f.size > 0 ? f : null; };

function ageFromDob(dob: string): number | null {
  if (!dob) return null;
  const d = new Date(dob), now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}
function dobMessage(v: string): string | null {
  const age = ageFromDob(v);
  if (age === null) return null;
  if (age < 18) return 'You must be at least 18 years old to join the talent pool.';
  if (age > 100) return 'Please double-check the date of birth entered.';
  return null;
}
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function useBodyLock(locked: boolean) {
  useEffect(() => {
    document.body.style.overflow = locked ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [locked]);
}

function AssessmentModal({ type, open, formKey, onClose }: { type: AssessmentKey; open: boolean; formKey: number; onClose: () => void }) {
  const cfg = ASSESSMENTS[type];
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  useEffect(() => { if (open) setMsg(null); }, [open, formKey]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true); setMsg(null);
    try {
      const fd = new FormData(form);
      const file = fileOf(fd, 'resume');
      const resumePath = file ? await uploadResume(file) : null;
      const answers: Record<string, string> = {};
      fd.forEach((v, k) => { if (/^q\d+$/.test(k)) answers[k] = String(v); });
      const now = new Date().toISOString();
      const payload = {
        position: str(fd, 'position'), full_name: str(fd, 'full_name'), email: str(fd, 'email'), phone: str(fd, 'phone'),
        country: str(fd, 'country'), city: str(fd, 'city'), timezone: str(fd, 'timezone'), occupation: str(fd, 'occupation'),
        previous_experience: str(fd, 'previous_experience'), years_experience: str(fd, 'years_experience'),
        exp_annotation: flag(fd, 'exp_annotation'), exp_labeling: flag(fd, 'exp_labeling'), exp_ai_training: flag(fd, 'exp_ai_training'),
        exp_qa: flag(fd, 'exp_qa'), exp_image_eval: flag(fd, 'exp_image_eval'),
        languages: str(fd, 'languages'), computer_skills: str(fd, 'computer_skills'), internet_availability: str(fd, 'internet_availability'),
        hours_per_week: str(fd, 'hours_per_week'), resume_path: resumePath, assessment_answers: answers, status: 'Submitted', submitted_at: now,
      };
      const { error } = await getSupabase().from('applications').insert([payload]);
      if (error) throw error;
      // Non-blocking: the application is already saved even if the email function fails.
      fetch(SEND_APPLICATION_EMAIL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ full_name: payload.full_name, email: payload.email, position: payload.position, submitted_at: now }),
      }).catch(err => console.warn('Email notification failed (non-blocking):', err));
      setMsg({ kind: 'success', text: 'Thank you — your application and assessment have been received. We will be in touch by email.' });
      form.reset();
      setTimeout(onClose, 2500);
    } catch (err) {
      console.error(err);
      setMsg({ kind: 'error', text: 'Something went wrong: ' + errText(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={"modal-overlay" + (open ? " open" : "")} id="assessment-modal" onClick={e => { if (e.target === e.currentTarget) onClose(); }}><div className="modal-box"><button className="modal-close" onClick={onClose} aria-label="Close">✕</button><h3 id="modal-title">{cfg.title}</h3><p className="modal-sub" id="modal-sub">{cfg.sub}</p><form id="assessment-form" key={formKey} onSubmit={onSubmit}><input type="hidden" id="position-field" name="position" value={cfg.position} readOnly /><div className="form-section-label">Personal details</div><div className="form-row"><div className="form-field"><label>Full name *</label><input type="text" name="full_name" required /></div><div className="form-field"><label>Email address *</label><input type="email" name="email" required /></div></div><div className="form-row"><div className="form-field"><label>Phone number *</label><input type="tel" name="phone" required /></div><div className="form-field"><label>Country *</label><input type="text" name="country" required /></div></div><div className="form-row"><div className="form-field"><label>City *</label><input type="text" name="city" required /></div><div className="form-field"><label>Time zone *</label><input type="text" name="timezone" placeholder="e.g. GMT+3" required /></div></div><div className="form-section-label">Professional details</div><div className="form-row"><div className="form-field"><label>Current occupation *</label><input type="text" name="occupation" required /></div><div className="form-field"><label>Years of experience *</label>{" "}<select name="years_experience" required><option value="">Select…</option><option>Less than 1 year</option><option>1–2 years</option><option>3–5 years</option><option>5+ years</option></select></div></div><div className="form-field"><label>Previous work experience *</label><textarea name="previous_experience" required placeholder="Briefly describe relevant roles or projects" /></div><div className="form-field"><label>Experience with (select all that apply)</label><div className="form-field-checks"><label className="form-check"><input type="checkbox" name="exp_annotation" /> Image annotation</label>{" "}<label className="form-check"><input type="checkbox" name="exp_labeling" /> Data labeling</label>{" "}<label className="form-check"><input type="checkbox" name="exp_ai_training" /> AI training data</label>{" "}<label className="form-check"><input type="checkbox" name="exp_qa" /> Quality assurance</label>{" "}<label className="form-check"><input type="checkbox" name="exp_image_eval" /> Image evaluation</label></div></div><div className="form-row"><div className="form-field"><label>Languages spoken *</label><input type="text" name="languages" placeholder="e.g. English, Swahili" required /></div><div className="form-field"><label>Computer skills *</label>{" "}<select name="computer_skills" required><option value="">Select…</option><option>Basic</option><option>Intermediate</option><option>Advanced</option></select></div></div><div className="form-row"><div className="form-field"><label>Internet availability *</label>{" "}<select name="internet_availability" required><option value="">Select…</option><option>Stable, all day</option><option>Stable, limited hours</option><option>Occasionally unstable</option></select></div><div className="form-field"><label>Hours available per week *</label><input type="number" name="hours_per_week" min="1" max="80" required /></div></div><div className="form-field"><label>Resume / CV (PDF, DOC, or DOCX — max 10MB) *</label>{" "}<input type="file" name="resume" id="resume-input" accept=".pdf,.doc,.docx" required /></div><div id="assessment-questions">
            <div className="form-section-label">Assessment</div>
            {cfg.questions.map(q => (
              <div className="question-block" key={q.name}>
                <label>{q.label}</label>
                {q.type === 'textarea'
                  ? <textarea name={q.name} required />
                  : <select name={q.name} required><option value="">Select…</option>{q.options?.map(o => <option key={o}>{o}</option>)}</select>}
              </div>
            ))}
          </div><div className="modal-submit-row"><button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>{" "}<button type="submit" className="btn" id="submit-btn" disabled={busy}>{busy ? "Submitting…" : "Submit application →"}</button></div><p className={"form-msg" + (msg ? ` ${msg.kind} show` : "")} id="form-msg">{msg?.text}</p></form></div></div>
  );
}

function TalentPoolModal({ open, formKey, onClose }: { open: boolean; formKey: number; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [dobError, setDobError] = useState<string | null>(null);
  const [bounds, setBounds] = useState<{ min?: string; max?: string }>({});
  useEffect(() => {
    const t = new Date();
    setBounds({ max: iso(new Date(t.getFullYear() - 18, t.getMonth(), t.getDate())), min: iso(new Date(t.getFullYear() - 100, t.getMonth(), t.getDate())) });
  }, []);
  useEffect(() => { if (open) { setMsg(null); setDobError(null); } }, [open, formKey]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true); setMsg(null);
    try {
      const fd = new FormData(form);
      const dob = str(fd, 'date_of_birth');
      const age = ageFromDob(dob);
      if (age === null || age < 18) throw new Error('You must be at least 18 years old to join the talent pool.');
      if (age > 100) throw new Error('Please double-check the date of birth entered.');
      const file = fileOf(fd, 'resume');
      const resumePath = file ? await uploadResume(file) : null;
      const now = new Date().toISOString();
      const pos = ['software_dev', 'data_annotator', 'ai_trainer', 'uiux', 'marketing', 'support', 'pm', 'finance', 'hr', 'other'];
      const skills = ['programming', 'annotation', 'ai_ml', 'design', 'support', 'marketing', 'admin', 'writing', 'finance', 'other'];
      const payload = {
        full_name: str(fd, 'full_name'), email: str(fd, 'email'), phone: str(fd, 'phone'), gender: str(fd, 'gender'), date_of_birth: dob,
        ...Object.fromEntries(pos.map(p => [`pos_${p}`, flag(fd, `pos_${p}`)])),
        pos_other_specify: str(fd, 'pos_other_specify') || null,
        years_experience: str(fd, 'years_experience'), education_level: str(fd, 'education_level'), education_background: str(fd, 'education_background'),
        ...Object.fromEntries(skills.map(s => [`skill_${s}`, flag(fd, `skill_${s}`)])),
        work_type: str(fd, 'work_type'), availability: str(fd, 'availability'), areas_of_expertise: str(fd, 'areas_of_expertise'),
        computer_spec: str(fd, 'computer_spec'), referred_by: str(fd, 'referred_by'), country: str(fd, 'country'),
        efset_certificate_url: str(fd, 'efset_certificate_url'), resume_path: resumePath,
        additional_experience: str(fd, 'additional_experience') || null, status: 'In pool', submitted_at: now,
      };
      const { error } = await getSupabase().from('talent_pool').insert([payload]);
      if (error) throw error;
      setMsg({ kind: 'success', text: "Thank you — you've been added to our talent pool. We'll reach out when a matching role opens." });
      form.reset();
      setTimeout(onClose, 2500);
    } catch (err) {
      console.error(err);
      setMsg({ kind: 'error', text: 'Something went wrong: ' + errText(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={"modal-overlay" + (open ? " open" : "")} id="talentpool-modal" onClick={e => { if (e.target === e.currentTarget) onClose(); }}><div className="modal-box"><button className="modal-close" onClick={onClose} aria-label="Close">✕</button><h3>Join Our Talent Pool</h3><p className="modal-sub">Fill this out once and we'll reach out when a role matching your background opens up.</p><form id="talentpool-form" key={formKey} onSubmit={onSubmit}><div className="form-row"><div className="form-field"><label>Full name *</label>{" "}<input type="text" name="full_name" required /></div><div className="form-field"><label>Email address *</label>{" "}<input type="email" name="email" required /></div></div><div className="form-row"><div className="form-field"><label>Phone number *</label>{" "}<input type="tel" name="phone" required /></div><div className="form-field"><label>Gender *</label>{" "}<select name="gender" required><option value="">Select…</option><option>Male</option><option>Female</option><option>Non-binary</option><option>Prefer not to say</option></select></div></div><div className="form-row"><div className="form-field"><label>Date of birth *</label>{" "}<input type="date" name="date_of_birth" id="talentpool-dob-input" min={bounds.min} max={bounds.max} onChange={e => setDobError(dobMessage(e.target.value))} required /><p style={{ fontSize: ".8125rem", color: "var(--subtle)", marginTop: ".375rem" }}>You must be at least 18 years old to join the talent pool.</p>{dobError && <p id="dob-inline-error" style={{ fontSize: ".8125rem", color: "#c0392b", marginTop: ".375rem" }}>{dobError}</p>}</div></div><div className="form-field"><label>What position(s) are you interested in? * (select all that apply)</label><div className="form-field-checks"><label className="form-check"><input type="checkbox" name="pos_software_dev" /> Software Developer</label>{" "}<label className="form-check"><input type="checkbox" name="pos_data_annotator" /> Data Annotator</label>{" "}<label className="form-check"><input type="checkbox" name="pos_ai_trainer" /> AI Trainer</label>{" "}<label className="form-check"><input type="checkbox" name="pos_uiux" /> UI/UX Designer</label>{" "}<label className="form-check"><input type="checkbox" name="pos_marketing" /> Digital Marketing</label>{" "}<label className="form-check"><input type="checkbox" name="pos_support" /> Customer Support</label>{" "}<label className="form-check"><input type="checkbox" name="pos_pm" /> Project Management</label>{" "}<label className="form-check"><input type="checkbox" name="pos_finance" /> Finance &amp; Accounting</label>{" "}<label className="form-check"><input type="checkbox" name="pos_hr" /> Human Resources</label>{" "}<label className="form-check"><input type="checkbox" name="pos_other" /> Other (please specify below)</label></div><input type="text" name="pos_other_specify" placeholder="If Other, please specify" style={{ marginTop: ".625rem" }} /></div><div className="form-row"><div className="form-field"><label>Years of professional experience *</label>{" "}<select name="years_experience" required><option value="">Select…</option><option>Less than 1 year</option><option>1–2 years</option><option>3–5 years</option><option>6–10 years</option><option>More than 10 years</option></select></div><div className="form-field"><label>Highest level of education *</label>{" "}<select name="education_level" required><option value="">Select…</option><option>High School</option><option>Certificate</option><option>Diploma</option><option>Bachelor's Degree</option><option>Master's Degree</option><option>PhD</option><option>Other</option></select></div></div><div className="form-field"><label>Education background *</label><textarea name="education_background" required placeholder="Degrees, certifications, institutions, and years" /></div><div className="form-field"><label>Which skills best describe you? * (select all that apply)</label><div className="form-field-checks"><label className="form-check"><input type="checkbox" name="skill_programming" /> Programming</label>{" "}<label className="form-check"><input type="checkbox" name="skill_annotation" /> Data Annotation</label>{" "}<label className="form-check"><input type="checkbox" name="skill_ai_ml" /> AI &amp; Machine Learning</label>{" "}<label className="form-check"><input type="checkbox" name="skill_design" /> Graphic Design</label>{" "}<label className="form-check"><input type="checkbox" name="skill_support" /> Customer Service</label>{" "}<label className="form-check"><input type="checkbox" name="skill_marketing" /> Sales &amp; Marketing</label>{" "}<label className="form-check"><input type="checkbox" name="skill_admin" /> Administration</label>{" "}<label className="form-check"><input type="checkbox" name="skill_writing" /> Writing &amp; Editing</label>{" "}<label className="form-check"><input type="checkbox" name="skill_finance" /> Finance</label>{" "}<label className="form-check"><input type="checkbox" name="skill_other" /> Other</label></div></div><div className="form-row"><div className="form-field"><label>Type of work you're looking for *</label>{" "}<select name="work_type" required><option value="">Select…</option><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Freelance</option><option>Internship</option></select></div><div className="form-field"><label>When can you start? *</label>{" "}<select name="availability" required><option value="">Select…</option><option>Immediately</option><option>Within 2 weeks</option><option>Within 1 month</option><option>More than 1 month</option></select></div></div><div className="form-field"><label>Areas of expertise *</label><textarea name="areas_of_expertise" required placeholder="List all areas you have hands-on experience in (e.g. image annotation, data labeling, transcription, QA, LiDAR, RLHF...)" /></div><div className="form-field"><label>Computer specifications (Go to System → About → Device Specifications → copy) *</label><textarea name="computer_spec" required placeholder={"Processor, RAM, year/generation, OS — we require a newer-generation computer"} /></div><div className="form-row"><div className="form-field"><label>Who referred you? *</label>{" "}<input type="text" name="referred_by" placeholder={"Name of referrer, or 'None'"} required /></div><div className="form-field"><label>Country of application *</label>{" "}<input type="text" name="country" required /></div></div><div className="form-field"><label>EF SET English test certificate *</label>{" "}<input type="url" name="efset_certificate_url" required placeholder="Paste your certificate link here" /><p style={{ fontSize: ".8125rem", color: "var(--subtle)", marginTop: ".375rem" }}>
          Take the free test at <a href="https://www.efset.org/" target="_blank" style={{ color: "#c8922a" }}>efset.org</a> and paste the link to your results certificate above. N/B — we require a minimum score of 70/100 (B1/C1 level) to be considered.
        </p></div><div className="form-field"><label>Resume / CV (PDF, DOC, or DOCX — max 10MB) *</label>{" "}<input type="file" name="resume" id="talentpool-resume-input" accept=".pdf,.doc,.docx" required /></div><div className="form-field"><label>Additional experience (optional)</label><textarea name="additional_experience" placeholder="Anything else that would be an advantage" /></div><div className="modal-submit-row"><button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>{" "}<button type="submit" className="btn" id="talentpool-submit-btn" disabled={busy}>{busy ? "Submitting…" : "Submit to talent pool →"}</button></div><p className={"form-msg" + (msg ? ` ${msg.kind} show` : "")} id="talentpool-form-msg">{msg?.text}</p></form></div></div>
  );
}

export default function CareersModals() {
  const [modal, setModal] = useState<OpenDetail | null>(null);
  const [lastAssessment, setLast] = useState<AssessmentKey>('annotation');
  const [keys, setKeys] = useState({ assessment: 0, talent: 0 });
  useBodyLock(modal !== null);

  const close = () => setModal(null);

  useEffect(() => {
    async function handle(action: OpenDetail) {
      if (action === 'talent') {
        setKeys(k => ({ ...k, talent: k.talent + 1 }));
        setModal('talent');
        return;
      }
      const { data, error } = await getSupabase().from('job_settings').select('is_open').eq('job_name', ASSESSMENTS[action].position).single();
      if (error) { console.error(error); alert('Unable to check application status. Please try again.'); return; }
      if (!data.is_open) { alert('Applications for this position are currently closed. Join our talent pool to be notified when it opens.'); return; }
      setLast(action);
      setKeys(k => ({ ...k, assessment: k.assessment + 1 }));
      setModal(action);
    }
    const onOpen = (e: Event) => { void handle((e as CustomEvent<OpenDetail>).detail); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setModal(null); };
    window.addEventListener(OPEN_EVENT, onOpen);
    document.addEventListener('keydown', onKey);
    return () => { window.removeEventListener(OPEN_EVENT, onOpen); document.removeEventListener('keydown', onKey); };
  }, []);

  return (
    <>
      <AssessmentModal type={lastAssessment} open={modal === 'annotation' || modal === 'quality'} formKey={keys.assessment} onClose={close} />
      <TalentPoolModal open={modal === 'talent'} formKey={keys.talent} onClose={close} />
    </>
  );
}
