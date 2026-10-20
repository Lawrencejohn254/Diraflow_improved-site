'use client';
import { useRef, useState } from 'react';

// NOTE: the original policy acknowledgement was UI-only (nothing is sent anywhere). Behaviour is preserved here;
// wire it to a backend (Supabase table or Formspree) before relying on it as a record.
export default function AckBox() {
  const box = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);
  function submit() {
    const inputs = Array.from(box.current?.querySelectorAll<HTMLInputElement>('.ack-field') ?? []);
    if (!inputs.every(i => i.value.trim() !== '')) { alert('Please complete all fields before submitting.'); return; }
    setDone(true);
  }
  return (
    <div className="ack-box" ref={box}><p style={{ fontSize: "0.9rem", lineHeight: "1.75", color: "var(--fg2)", marginBottom: "1.75rem" }}>I, the undersigned, confirm that I have read, understood, and agree to comply with all policies contained in the Diraflow Company Policy Handbook (Version 1.0, April 2026). I understand that violations of these policies may result in disciplinary action up to and including termination of employment.</p><div><label className="ack-label">Full Name</label>{" "}<input className="ack-field" disabled={done} type="text" placeholder="Your full legal name" /></div><div><label className="ack-label">Job Title</label>{" "}<input className="ack-field" disabled={done} type="text" placeholder="Your role at Diraflow" /></div><div><label className="ack-label">Signature</label>{" "}<input className="ack-field" disabled={done} type="text" placeholder="Type full name as signature" /></div><div><label className="ack-label">Date</label>{" "}<input className="ack-field" disabled={done} type="date" /></div><button className="btn btn-lg" style={{ marginTop: "0.5rem", width: "100%", justifyContent: "center", display: done ? "none" : undefined }} onClick={submit}>Submit Acknowledgement →</button><p id="ack-success" style={{ display: done ? "block" : "none", textAlign: "center", color: "#7ecb8f", fontSize: "0.875rem", marginTop: "1rem" }}>✓ Acknowledgement submitted. Thank you.</p></div>
  );
}
