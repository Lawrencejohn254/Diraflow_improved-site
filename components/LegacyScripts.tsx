'use client';
import { useEffect, useRef } from 'react';
import { installLegacyBridge, trackedRun } from '@/lib/legacy-bridge';

type Script = { code: string; exports: string[] };

function loadSrc(src: string): Promise<HTMLScriptElement> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-legacy-src="${src}"]`);
    if (existing) return resolve(existing);
    const s = document.createElement('script');
    s.src = src; s.async = false; s.dataset.legacySrc = src;
    s.onload = () => resolve(s); s.onerror = () => reject(new Error('Failed to load ' + src));
    document.head.appendChild(s);
  });
}

/** Runs a page's original inline scripts after mount. Temporary until each page is ported to React. */
export default function LegacyScripts({ srcs, scripts }: { srcs: string[]; scripts: Script[] }) {
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    installLegacyBridge();
    const cleanups: (() => void)[] = [];
    const nodes: HTMLScriptElement[] = [];
    (async () => {
      for (const s of srcs) await loadSrc(s);
      for (const { code, exports } of scripts) {
        // IIFE avoids "identifier already declared" on re-visits; hoisted functions are re-exposed on window for inline handlers.
        const wrapped = `(function(){\n${code}\n;${exports.map(n => `try{window.${n}=${n};}catch(e){}`).join('')}\n})();`;
        cleanups.push(trackedRun(() => {
          const el = document.createElement('script');
          el.textContent = wrapped;
          document.body.appendChild(el);
          nodes.push(el);
        }));
      }
    })().catch(err => console.error('[LegacyScripts]', err));
    return () => { cleanups.forEach(c => c()); nodes.forEach(n => n.remove()); };
  }, [srcs, scripts]);
  return null;
}
