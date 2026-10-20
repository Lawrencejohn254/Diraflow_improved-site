import fs from 'node:fs';
import path from 'node:path';
import index from '@/content/blog/index.json';
import posts from '@/content/blog/posts.json';

export type Card = {
  slug: string; featured: boolean; filter: string; title: string; excerpt: string; date: string; readTime: string;
  image: { src: string; alt: string }; author: { name: string; avatar: string }; badge?: string; category?: string;
};
export type Post = {
  slug: string;
  meta: { title: string; description: string | null; ogTitle: string | null; ogDescription: string | null; ogImage: string | null; ogUrl: string | null; canonical: string | null };
  hero: { image: string; alt: string; category: string; date: string; readTime: string; title: string };
  author: { name: string; title: string; avatar: string };
  related: string[];
};

export const blogHead = index.head as { label: string; title: string; intro: string };
export const cards = index.cards as Card[];
export const relatedBlurbs = index.related as Record<string, { category: string; title: string; blurb: string }>;
export const postsBySlug = posts as unknown as Record<string, Post>;
export const postSlugs = Object.keys(postsBySlug);

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), 'content', 'blog', file), 'utf8');
export const getPostBody = (slug: string) => read(`${slug}.html`);
export const getPostCss = (slug: string) => read(`${slug}.css`);
