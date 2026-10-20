// Temporary shim: lets converted pages keep their inline `onclick="fn(args)"` style handlers
// (emitted as data-onclick etc.) until each page is ported to real React handlers.
const EVENTS = ['click', 'change', 'input', 'submit', 'keydown', 'keyup', 'focus', 'blur', 'mouseover', 'mouseout'];

const toRoute = (u: string) => {
  const m = u.match(/^(?:\.\/|\/)?((?:blog-posts\/)?[\w-]+)\.html(.*)$/);
  return m ? '/' + (m[1] === 'index' ? '' : m[1]) + m[2] : u;
};

function splitArgs(s: string): string[] {
  const out: string[] = []; let cur = ''; let q: string | null = null;
  for (const ch of s) {
    if (q) { cur += ch; if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    if (ch === ',') { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function parseArg(a: string, el: Element, ev: Event): unknown {
  if (a === 'this') return el;
  if (a === 'event') return ev;
  if (a === 'true') return true;
  if (a === 'false') return false;
  if (a === 'null') return null;
  if (/^-?\d+(\.\d+)?$/.test(a)) return Number(a);
  const m = a.match(/^(['"])(.*)\1$/);
  return m ? m[2] : a;
}

function run(code: string, el: HTMLElement, ev: Event): { stop: boolean } {
  let stop = false;
  for (const stmt of code.split(';').map(s => s.trim()).filter(Boolean)) {
    if (stmt === 'event.stopPropagation()') { stop = true; ev.stopPropagation(); continue; }
    if (stmt === 'event.preventDefault()' || stmt === 'return false') { ev.preventDefault(); continue; }
    let m = stmt.match(/^this\.style\.(\w+)\s*=\s*(['"])(.*)\2$/);
    if (m) { (el.style as any)[m[1]] = m[3]; continue; }
    m = stmt.match(/^window\.location(?:\.href)?\s*=\s*(['"])(.*)\1$/);
    if (m) { window.location.href = toRoute(m[2]); continue; }
    m = stmt.match(/^(return\s+)?([\w$.]+)\(([\s\S]*)\)$/);
    if (!m) { console.warn('[legacy-bridge] unsupported inline handler:', stmt); continue; }
    const fn = m[2].split('.').reduce<any>((o, k) => o?.[k], window);
    if (typeof fn !== 'function') { console.warn('[legacy-bridge] missing function:', m[2]); continue; }
    const res = fn.apply(el, splitArgs(m[3]).map(a => parseArg(a, el, ev)));
    if (m[1] && res === false) ev.preventDefault();
  }
  return { stop };
}

let installed = false;
export function installLegacyBridge() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  for (const type of EVENTS) {
    document.addEventListener(type, ev => {
      let el = ev.target as HTMLElement | null;
      while (el && el !== document.documentElement) {
        const code = el.getAttribute?.('data-on' + type);
        if (code && run(code, el, ev).stop) break;
        el = el.parentElement;
      }
    }, true);
  }
}

/** Run `fn` while recording document listeners it adds, and make DOMContentLoaded/load callbacks fire immediately. */
export function trackedRun(fn: () => void): () => void {
  const added: [string, EventListenerOrEventListenerObject, any][] = [];
  const orig = document.addEventListener;
  document.addEventListener = function (this: Document, t: string, l: any, o?: any) {
    if (t === 'DOMContentLoaded') { setTimeout(() => typeof l === 'function' ? l(new Event(t)) : l.handleEvent(new Event(t)), 0); return; }
    added.push([t, l, o]);
    return orig.call(this, t, l, o);
  } as typeof document.addEventListener;
  try { fn(); } finally { document.addEventListener = orig; }
  return () => added.forEach(([t, l, o]) => document.removeEventListener(t, l, o));
}
