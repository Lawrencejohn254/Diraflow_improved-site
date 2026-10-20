import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import './page.css';
import data from '@/content/industries.json';

type Industry = {
  title: string; intro: string; image: string; accent: string; accentSoft: string;
  bullets: string[]; chips: string[]; impactTitle: string; impactText: string; pillars: [string, string][];
};
const industries = data as unknown as Record<string, Industry>;

// ?industry=<id>; unknown or missing ids fall back to automotive (same as the old client-side script).
const pick = (v?: string | string[]) => industries[(Array.isArray(v) ? v[0] : v) ?? ''] ?? industries.automotive;

type Props = { searchParams: Promise<{ industry?: string | string[] }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const s = pick((await searchParams).industry);
  return { title: `${s.title} — Diraflow`, description: s.intro.slice(0, 160) };
}

export default async function Page({ searchParams }: Props) {
  const s = pick((await searchParams).industry);
  return (
    <div className="pg-ind">
      <div className="page">
        <Link href="/industries" className="back-link">← Back to industries</Link>
        <div className="hero-panel" id="hero-panel" style={{ '--accent': s.accent, '--accent-soft': s.accentSoft } as CSSProperties}>
          <div className="ind-hero-grid">
            <div>
              <div className="ind-eyebrow">Industry detail</div>
              <h1 id="detail-title">{s.title}</h1>
              <p id="detail-intro" className="intro">{s.intro}</p>
              <ul className="bullet-list" id="detail-bullets">{s.bullets.map(b => <li key={b}>{b}</li>)}</ul>
              <div className="chip-row" id="detail-chips">{s.chips.map(c => <span className="chip" key={c}>{c}</span>)}</div>
            </div>
            <div className="hero-media"><img id="hero-image" src={s.image} alt={`${s.title} illustration`} /></div>
          </div>
          <div className="detail-section">
            <h2>How we create value</h2>
            <div className="detail-grid" id="detail-pillars">
              {s.pillars.map(([heading, text]) => <div className="pillar" key={heading}><h3>{heading}</h3><p>{text}</p></div>)}
            </div>
          </div>
          <div className="insight-card">
            <div className="insight-box"><h3 id="impact-title">{s.impactTitle}</h3><p id="impact-text">{s.impactText}</p></div>
            <div className="quote-box">
              <h3>Why this work matters</h3>
              <p>Great AI depends on great context. Our annotation pipelines preserve nuance, reduce ambiguity, and make high-stakes use cases genuinely dependable.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
