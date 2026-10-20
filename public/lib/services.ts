import data from '@/content/services.json';

export type ServiceItem = { reverse: boolean; title: string; image: { src: string; alt: string }; description: string; useCases: string };
export type CompareSide = { label: string; heading: string; items: string[] };
export type ServiceData = {
  slug: string;
  meta: { title: string; description: string | null; ogTitle: string | null; ogDescription: string | null; ogType: string | null; ogUrl: string | null; ogImage: string | null; canonical: string | null };
  head: { label: string; title: string; intro: string };
  back: { href: string; label: string };
  types: { label: string; heading: string; intro: string; items: ServiceItem[] };
  quality: { label: string; heading: string; intro: string; bad: CompareSide; good: CompareSide };
  cta: {
    id: string | null; label: string; heading: string; text: string;
    bullets: { icon: string; text: string; href: string | null }[];
    form: { title: string; intro: string; action: string; subject: string; selectLabel: string; selectPlaceholder: string; options: string[]; briefPlaceholder: string; submit: string };
  };
};

export const services = data as ServiceData[];
export const getService = (slug: string) => services.find(s => s.slug === slug);
