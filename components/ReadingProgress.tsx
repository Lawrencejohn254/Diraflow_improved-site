'use client';
import { useEffect, useRef } from 'react';

export default function ReadingProgress() {
  const fill = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const update = () => {
      const el = document.documentElement;
      const pct = (el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight)) * 100;
      if (fill.current) fill.current.style.width = `${Math.min(100, Math.max(0, pct))}%`;
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return <div className="progress-bar"><div className="progress-fill" ref={fill} /></div>;
}
