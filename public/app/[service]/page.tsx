import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ServicePage from '@/components/ServicePage';
import { getService, services } from '@/lib/services';

export const dynamicParams = false;

export function generateStaticParams() {
  return services.map(s => ({ service: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ service: string }> }): Promise<Metadata> {
  const s = getService((await params).service);
  if (!s) return {};
  const m = s.meta;
  return {
    title: m.title,
    description: m.description ?? undefined,
    alternates: m.canonical ? { canonical: m.canonical } : undefined,
    openGraph: { title: m.ogTitle ?? undefined, description: m.ogDescription ?? undefined, type: 'website', url: m.ogUrl ?? undefined, images: m.ogImage ? [m.ogImage] : undefined },
  };
}

export default async function Page({ params }: { params: Promise<{ service: string }> }) {
  const s = getService((await params).service);
  if (!s) notFound();
  return <ServicePage data={s} />;
}
