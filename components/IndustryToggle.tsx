'use client';
import { useRouter } from 'next/navigation';

/** "See more details" button on each industry card: opens that industry's detail page. */
export default function IndustryToggle({ id }: { id: string }) {
  const router = useRouter();
  const href = id === 'healthcare' ? '/healthcare-life-sciences' : `/industry-detail?industry=${encodeURIComponent(id)}`;
  return (
    <button type="button" className="industry-toggle" aria-expanded="false" onClick={() => router.push(href)}>
      See more details <span className="industry-toggle-arrow">→</span>
    </button>
  );
}
