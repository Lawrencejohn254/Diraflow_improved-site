'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { Card } from '@/lib/blog';

const href = (c: Card) => `/blog-posts/${c.slug}`;

export default function BlogIndex({ cards }: { cards: Card[] }) {
  const [active, setActive] = useState('all');
  const cats = Array.from(new Set(cards.map(c => c.filter)));
  const show = (c: Card) => active === 'all' || c.filter === active;
  const featured = cards.find(c => c.featured);
  const rest = cards.filter(c => !c.featured && show(c));

  return (
    <section style={{ padding: '3rem 0 5rem' }}>
      <div className="container">
        <div className="filter-row">
          {['all', ...cats].map(c => (
            <button key={c} type="button" className={`filter-tag${active === c ? ' active' : ''}`} onClick={() => setActive(c)}>
              {c === 'all' ? 'All posts' : c}
            </button>
          ))}
        </div>

        {featured && show(featured) && (
          <Link className="featured-post" href={href(featured)}>
            <div className="featured-post-img">
              <img src={featured.image.src} alt={featured.image.alt} loading="lazy" />
              <span className="featured-badge">✦ Featured</span>
            </div>
            <div className="featured-post-body">
              <span className="post-cat-badge">{featured.badge}</span>
              <h2>{featured.title}</h2>
              <p>{featured.excerpt}</p>
              <div className="post-meta-row">
                <div className="post-author-info">
                  <img src={featured.author.avatar} alt={featured.author.name} />
                  <div><div className="author-name">{featured.author.name}</div><div className="post-date">{featured.date}</div></div>
                </div>
                <span className="post-read-time">{featured.readTime}</span>
              </div>
              <span className="read-more-link" style={{ marginTop: '1.5rem' }}>Read More <span className="read-more-arrow">→</span></span>
            </div>
          </Link>
        )}

        <div className="posts-grid" id="posts-grid">
          {rest.map(c => (
            <Link key={c.slug} className="post-card" href={href(c)}>
              <div className="post-card-img"><img src={c.image.src} alt={c.image.alt} loading="lazy" /></div>
              <div className="post-card-body">
                <div className="post-card-top"><span className="date">{c.date}</span><span className="cat">{c.category}</span></div>
                <h3>{c.title}</h3>
                <p>{c.excerpt}</p>
                <span className="post-card-read-more">Read More <span>→</span></span>
                <div className="post-card-footer">
                  <div className="author-mini"><img src={c.author.avatar} alt={c.author.name} /><span>{c.author.name}</span></div>
                  <span className="read-min">{c.readTime}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="load-more-wrap">
          <Link href="/contact" className="btn btn-outline btn-sm">Want to write for us? Get in touch →</Link>
        </div>
      </div>
    </section>
  );
}
