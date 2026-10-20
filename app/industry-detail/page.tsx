import type { Metadata } from 'next';
import './page.css';
import Link from 'next/link';
import LegacyScripts from '@/components/LegacyScripts';
import { SRCS, SCRIPTS } from './legacy';

export const metadata: Metadata = {
  "title": "Industry Detail — Diraflow",
  "description": "Detailed explanation for Diraflow industry solutions."
};

export default function Page() {
  return (
    <>
      <div className="pg-ind">
<div className="page"><Link href="/industries" className="back-link">← Back to industries</Link><div className="hero-panel" id="hero-panel"><div className="ind-hero-grid"><div><div className="ind-eyebrow">Industry detail</div><h1 id="detail-title">Specialised data solutions</h1><p id="detail-intro" className="intro">We build tailored training data for high-impact AI systems across domains, with expert-reviewed workflows and domain-specific quality control.</p><ul className="bullet-list" id="detail-bullets"></ul><div className="chip-row" id="detail-chips"></div></div><div className="hero-media"><img id="hero-image" src={"https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=1000&q=80&auto=format&fit=crop"} alt="Industry illustration" /></div></div><div className="detail-section"><h2>How we create value</h2><div className="detail-grid" id="detail-pillars"></div></div><div className="insight-card"><div className="insight-box"><h3 id="impact-title">What good data unlocks</h3><p id="impact-text">Reliable labels make models safer, more accurate, and easier to scale.</p></div><div className="quote-box"><h3>Why this work matters</h3><p>Great AI depends on great context. Our annotation pipelines preserve nuance, reduce ambiguity, and make high-stakes use cases genuinely dependable.</p></div></div></div></div>

      </div>
      <LegacyScripts srcs={SRCS} scripts={SCRIPTS} />
    </>
  );
}
