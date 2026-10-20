import Link from 'next/link';
import { getPostBody, getPostCss, postsBySlug, relatedBlurbs } from '@/lib/blog';
import ReadingProgress from './ReadingProgress';
import CopyLinkButton from './CopyLinkButton';
import './blog-post.css';

const SITE = 'https://diraflowai.com';

export default function BlogPost({ slug }: { slug: string }) {
  const post = postsBySlug[slug];
  const url = `${SITE}/blog-posts/${slug}`;
  const related = post.related.filter(s => relatedBlurbs[s]);
  return (
    <div className="pg-bp">
      {/* Trusted, authored CSS/HTML from content/blog (not user input). */}
      <style dangerouslySetInnerHTML={{ __html: getPostCss(slug) }} />
      <ReadingProgress />

      <div className="post-hero">
        <img src={post.hero.image} alt={post.hero.alt} loading="eager" />
        <div className="post-hero-content">
          <div className="post-hero-cat-row">
            <span className="post-hero-cat">{post.hero.category}</span>{' '}
            <span className="post-hero-date">{post.hero.date}</span>{' '}
            <span className="post-hero-read">{post.hero.readTime}</span>
          </div>
          <h1>{post.hero.title}</h1>
        </div>
      </div>

      <div className="container-article">
        <div className="post-subheader">
          <Link href="/blog" className="back-link">← Back to blog</Link>
          <div className="post-author-row">
            <div className="bp-post-author">
              <img src={post.author.avatar} alt={post.author.name} />
              <div>
                <div className="author-name">{post.author.name}</div>
                <div className="author-title">{post.author.title}</div>
              </div>
            </div>
            <div className="share-row">
              <span className="share-label">Share</span>{' '}
              <a className="share-btn" target="_blank" rel="noopener" title="Share on X"
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.hero.title)}&url=${url}`}>𝕏</a>{' '}
              <a className="share-btn" target="_blank" rel="noopener" title="Share on LinkedIn"
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${url}`}>in</a>{' '}
              <CopyLinkButton />
            </div>
          </div>
        </div>
      </div>

      <main className="container-article">
        <article className="bp-post-body" dangerouslySetInnerHTML={{ __html: getPostBody(slug) }} />
        {related.length > 0 && (
          <section className="related-section">
            <h3>More from the blog</h3>
            <div className="related-grid">
              {related.map(s => (
                <Link key={s} href={`/blog-posts/${s}`} className="related-card">
                  <div className="related-cat">{relatedBlurbs[s].category}</div>
                  <h4>{relatedBlurbs[s].title}</h4>
                  <p>{relatedBlurbs[s].blurb}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
