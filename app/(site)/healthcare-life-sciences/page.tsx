import type { Metadata } from 'next';
import './page.css';
import Link from 'next/link';

export const metadata: Metadata = {
  "title": "Healthcare & Life Sciences — Diraflow",
  "description": "Diraflow AI supports healthcare and life sciences with high-quality, trusted training data for medical AI applications."
};

export default function Page() {
  return (
    <>
      <div className="pg-hc">
<section className="hc-hero"><div className="hc-container hc-hero-grid"><div><h1>Healthcare &amp; Life Sciences</h1><h2>Enabling Smarter Healthcare Through Trusted Data</h2><p>Artificial intelligence is transforming healthcare by improving diagnostics, accelerating medical research, enhancing patient care, and streamlining clinical workflows. From medical imaging to intelligent document processing, AI solutions depend on highly accurate and consistently labeled datasets.</p></div><div className="hero-card"><img src={"https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1000&q=80&auto=format&fit=crop"} alt="Healthcare AI data review" /><div className="meta">Specialist-first</div><h3>Clinical-grade data for sensitive, high-impact workflows</h3><p>Every data pipeline is shaped around the realities of patient care, research rigor, and regulatory context.</p></div></div></section>
<section className="content"><div className="hc-container"><div className="hc-card"><p>Diraflow AI partners with healthcare providers, research institutions, and medical technology companies to prepare reliable datasets that support the development of safe, effective, and trustworthy AI solutions. Our quality-first approach ensures every dataset meets the precision required for healthcare applications.</p><div className="highlight-row"><div className="highlight-box"><h4>Built for patient safety</h4><p>We blend medical expertise, clear QA rubrics, and documented review paths so the data reflects the stakes of real healthcare decisions.</p></div><div className="highlight-box"><h4>Flexible for research and deployment</h4><p>Whether you are validating a pilot model or supporting a full-scale clinical workflow, the same quality discipline applies.</p></div></div><h3>How We Create Value</h3><div className="hc-grid"><div className="item"><h4>Improve Diagnostic Accuracy</h4><p>We prepare high-quality annotated medical datasets that help AI models identify diseases, abnormalities, and clinical patterns with greater accuracy, supporting healthcare professionals in making informed decisions.</p></div><div className="item"><h4>Accelerate Medical AI Innovation</h4><p>Our scalable annotation workflows reduce the time required to prepare healthcare datasets, enabling researchers and technology providers to bring innovative AI solutions to market faster.</p></div><div className="item"><h4>Support Reliable Clinical Research</h4><p>We create structured, consistent datasets that enable researchers to train and evaluate AI models with confidence, improving the reliability of clinical studies and medical discoveries.</p></div><div className="item"><h4>Ensure Exceptional Data Quality</h4><p>Every healthcare dataset undergoes rigorous quality assurance to maintain the consistency, precision, and reliability required for mission-critical medical applications.</p></div><div className="item"><h4>Scale Securely with Growing Projects</h4><p>Whether supporting a pilot project or a large-scale healthcare initiative, our experienced teams can efficiently manage increasing data volumes while maintaining high standards of quality and confidentiality.</p></div></div><Link href="/industries" className="hc-btn">← Back to industries</Link></div></div></section>
      </div>
    </>
  );
}
