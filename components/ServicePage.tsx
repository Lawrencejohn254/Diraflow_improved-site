import Link from 'next/link';
import type { ServiceData } from '@/lib/services';
import BriefForm from './BriefForm';
import './service-page.css';

// Content strings below are trusted, authored data (content/services.json) containing only <em>/<br/>/<strong>/&amp;.
const Html = ({ as: T = 'span', html, ...rest }: { as?: 'h1' | 'h2' | 'p' | 'span'; html: string; className?: string }) =>
  <T {...rest} dangerouslySetInnerHTML={{ __html: html }} />;

function Compare({ side, kind }: { side: ServiceData['quality']['bad']; kind: 'bad' | 'good' }) {
  const mark = kind === 'bad' ? '✗' : '✓';
  const color = kind === 'bad' ? 'var(--red)' : 'var(--green)';
  return (
    <div className="sv-compare-card">
      <div className={`sv-compare-header sv-${kind}`}>
        <div className="sv-label">{side.label}</div>
        <h3>{side.heading}</h3>
      </div>
      <div className="sv-compare-body">
        <ul className="sv-compare-list">
          {side.items.map(i => <li key={i}><span className="sv-icon" style={{ color }}>{mark}</span>{i}</li>)}
        </ul>
      </div>
    </div>
  );
}

export default function ServicePage({ data }: { data: ServiceData }) {
  const { head, back, types, quality, cta } = data;
  return (
    <div className="pg-sv">
      <section className="sv-page-head">
        <div className="sv-container-wide">
          <div className="sv-section-label sv-fade-up sv-fade-up-1">{head.label}</div>
          <Html as="h1" className="sv-fade-up sv-fade-up-2" html={head.title} />
          <p className="sv-fade-up sv-fade-up-3">{head.intro}</p>
        </div>
      </section>

      <div style={{ padding: '1.5rem 0', textAlign: 'center', background: 'var(--bg)' }}>
        <div className="sv-container-wide"><Link href={back.href} className="sv-btn sv-btn-outline">{back.label}</Link></div>
      </div>

      <section className="services-section">
        <div className="sv-container-wide">
          <div className="services-section-head">
            <div className="sv-section-label" style={{ justifyContent: 'center' }}>{types.label}</div>
            <Html as="h2" html={types.heading} />
            <p>{types.intro}</p>
          </div>
          <div className="type-list">
            {types.items.map(item => (
              <div key={item.title} className={`type-row${item.reverse ? ' reverse' : ''}`}>
                <div className="type-media"><img src={item.image.src} alt={item.image.alt} loading="lazy" /></div>
                <div className="type-body">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  {item.useCases && <Html as="p" className="use-cases" html={item.useCases} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="quality-section">
        <div className="sv-container-wide">
          <div className="sv-section-label">{quality.label}</div>
          <Html as="h2" className="sv-section-title" html={quality.heading} />
          <p className="sv-section-intro">{quality.intro}</p>
          <div className="sv-compare-grid">
            <Compare side={quality.bad} kind="bad" />
            <Compare side={quality.good} kind="good" />
          </div>
        </div>
      </section>

      <section className="cta-form-section" id={cta.id ?? undefined}>
        <div className="sv-container-wide">
          <div className="cta-form-grid">
            <div>
              <div className="sv-section-label">{cta.label}</div>
              <Html as="h2" className="sv-section-title" html={cta.heading} />
              <p style={{ fontSize: '0.9rem', color: 'var(--fg2)', lineHeight: 1.8 }}>{cta.text}</p>
              <div className="cta-bullets">
                {cta.bullets.map(b => (
                  <div className="cta-bullet" key={b.text}>
                    <span>{b.icon}</span>
                    {b.href ? <a href={b.href} style={{ color: 'var(--fg2)' }}>{b.text}</a> : <span>{b.text}</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className="form-card">
              <h3>{cta.form.title}</h3>
              <p>{cta.form.intro}</p>
              <BriefForm form={cta.form} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
