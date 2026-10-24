import type { Metadata } from 'next';
import BlogIndex from '@/components/BlogIndex';
import { blogHead, cards } from '@/lib/blog';
import { CSS } from './legacy';

export const metadata: Metadata = {
  "title": "Blog — AI Training Data Insights | Diraflow",
  "description": "Thinking on AI training data, agentic evaluation, RLHF, red-teaming, and the evolving landscape of human-AI collaboration from the Diraflow team.",
  "openGraph": {
    "title": "Blog — Diraflow AI",
    "description": "Insights on AI training data, agentic evaluation, and the future of human-AI collaboration.",
    "type": "website",
    "url": "https://diraflowai.com/blog"
  },
  "alternates": {
    "canonical": "https://diraflowai.com/blog"
  }
};

export default function Page() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <section className="blog-head">
        <div className="container">
          <div className="section-label">{blogHead.label}</div>
          <h1 dangerouslySetInnerHTML={{ __html: blogHead.title }} />
          <p>{blogHead.intro}</p>
        </div>
      </section>
      <BlogIndex cards={cards} />
    </>
  );
}
