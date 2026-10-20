import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import BlogPost from '@/components/BlogPost';
import { postSlugs, postsBySlug } from '@/lib/blog';

export const dynamicParams = false;

export function generateStaticParams() {
  return postSlugs.map(slug => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = postsBySlug[(await params).slug];
  if (!p) return {};
  const m = p.meta;
  return {
    title: m.title,
    description: m.description ?? undefined,
    alternates: m.canonical ? { canonical: m.canonical } : undefined,
    openGraph: { title: m.ogTitle ?? undefined, description: m.ogDescription ?? undefined, type: 'article', url: m.ogUrl ?? undefined, images: m.ogImage ? [m.ogImage] : undefined },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!postsBySlug[slug]) notFound();
  return <BlogPost slug={slug} />;
}
