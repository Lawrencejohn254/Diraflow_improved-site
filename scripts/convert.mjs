// HTML -> Next.js (TSX) converter for the Diraflow static site.
import * as cheerio from 'cheerio';
import postcss from 'postcss';
import safeParser from 'postcss-safe-parser';
import fs from 'node:fs';
import path from 'node:path';

const SRC = process.argv[2];
const OUT = process.argv[3];
const FOLDERS = ['assets', '3d annotation', 'audio annotation', 'data classification', 'image-annotation', 'npl', 'video annotation'];
const VOID = new Set(['area','base','br','col','embed','hr','img','input','link','meta','source','track','wbr']);
const INLINE = new Set(['a','span','b','strong','em','i','button','img','svg','code','label','small','sup','sub','input','select','u']);
const BOOL = new Set(['allowfullscreen','async','autofocus','autoplay','checked','controls','defer','disabled','hidden','loop','multiple','muted','novalidate','open','playsinline','readonly','required','selected','reversed']);
const MAP = { class:'className', for:'htmlFor', tabindex:'tabIndex', colspan:'colSpan', rowspan:'rowSpan', maxlength:'maxLength', minlength:'minLength', readonly:'readOnly', autocomplete:'autoComplete', autofocus:'autoFocus', frameborder:'frameBorder', allowfullscreen:'allowFullScreen', novalidate:'noValidate', enctype:'encType', crossorigin:'crossOrigin', srcset:'srcSet', playsinline:'playsInline', autoplay:'autoPlay', contenteditable:'contentEditable', spellcheck:'spellCheck', datetime:'dateTime', fetchpriority:'fetchPriority', referrerpolicy:'referrerPolicy', 'xlink:href':'xlinkHref', 'xml:space':'xmlSpace', 'xmlns:xlink':'xmlnsXlink', cellpadding:'cellPadding', cellspacing:'cellSpacing', usemap:'useMap', srclang:'srcLang', inputmode:'inputMode', enterkeyhint:'enterKeyHint' };
const raw = el => (el.children || []).map(c => c.data || '').join('');
const camel = s => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

// ---------- Phase 2: scoped CSS ----------
const CLASS_RE = /\.(-?[_a-zA-Z][\w-]*)/g;
let SITE_CLASSES = new Set();
function loadSiteClasses() {
  const f = path.join(OUT, 'app', 'styles.css');
  postcss.parse(fs.readFileSync(f, 'utf8')).walkRules(r => { for (const m of r.selector.matchAll(CLASS_RE)) SITE_CLASSES.add(m[1]); });
}
const CHROME = /\.(hb-[\w-]*|brand[\w-]*|nav-[\w-]*|footer-[\w-]*)\b|(^|[\s>+~])(nav|footer|header)(\.|\s|$|:|\[)|\.top\b/;
const RESET = /^(\*|\*,\s*\*::before,\s*\*::after|\*::before|\*::after|html|body)$/;
function processCss(css, key, extraRename = new Set()) {
  css = css.replace(/max:\s*width\s*\d+px;px;/g, 'max-width:1500px;'); // source typo in 2 blog posts; siblings use 1500px
  const root = postcss.parse(css, { parser: safeParser });
  const defined = new Set();
  root.walkRules(r => { if (r.parent?.type === 'atrule' && /keyframes/.test(r.parent.name)) return; for (const m of r.selector.matchAll(CLASS_RE)) defined.add(m[1]); });
  const rename = new Set([...defined].filter(c => SITE_CLASSES.has(c) || extraRename.has(c)));
  const kf = new Map();
  root.walkAtRules(/keyframes$/, a => { kf.set(a.params.trim(), `${key}-${a.params.trim()}`); a.params = kf.get(a.params.trim()); });
  const tokens = [];
  root.walkRules(rule => {
    if (rule.parent?.type === 'atrule' && /keyframes$/.test(rule.parent.name)) return;
    const sels = rule.selectors.map(x => x.trim());
    if (sels.length === 1 && sels[0] === ':root') { rule.walkDecls(d => tokens.push(`${d.prop}:${d.value}`)); rule.remove(); return; }
    const keep = sels.filter(x => !RESET.test(x) && !CHROME.test(x));
    if (!keep.length) { rule.remove(); return; }
    rule.selectors = keep.map(x => `.pg-${key} ` + x.replace(CLASS_RE, (m, c) => rename.has(c) ? `.${key}-${c}` : m));
  });
  root.walkDecls(/^animation(-name)?$/, d => { for (const [a, b] of kf) d.value = d.value.replace(new RegExp(`\\b${a}\\b`, 'g'), b); });
  root.walkAtRules(a => { if (a.nodes && a.nodes.length === 0) a.remove(); });
  const out = (tokens.length ? `.pg-${key}{${tokens.join(';')}}\n` : '') + root.toString();
  return { css: out, rename };
}
function renameClassAttr(v, rename, key) { return v.split(/\s+/).map(c => rename.has(c) ? `${key}-${c}` : c).join(' '); }

const report = { handlers: new Set(), pages: [] };

function fixPath(v) {
  if (!v || /^(\/|https?:|data:|#|mailto:|tel:|blob:)/.test(v)) return v;
  const clean = v.replace(/^(\.\.\/)+/, '').replace(/^\.\//, '');
  return FOLDERS.some(f => clean.startsWith(f + '/')) ? '/' + clean : v;
}
function internalHref(h) {
  if (!h) return null;
  if (h === '/') return '/';
  const m = h.match(/^(?:\.\.\/|\.\/|\/)*((?:blog-posts\/)?[\w-]+)\.html(#[^?]*)?(\?.*)?$/);
  if (!m) return null;
  let p = m[1] === 'index' ? '' : m[1];
  return '/' + p + (m[3] || '') + (m[2] || '');
}
function fixCss(css) {
  return css.replace(/url\((['"]?)(?:\.\.\/)*((?:assets|3d annotation|audio annotation|data classification|image-annotation|npl|video annotation)\/)/g, 'url($1/$2');
}
function splitStyle(s) {
  const out = []; let cur = '', depth = 0, q = null;
  for (const ch of s) {
    if (q) { cur += ch; if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    if (ch === '(') depth++; if (ch === ')') depth--;
    if (ch === ';' && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}
function styleObj(s) {
  const parts = [];
  for (const d of splitStyle(fixCss(s))) {
    const i = d.indexOf(':'); if (i < 0) continue;
    const k = d.slice(0, i).trim(), v = d.slice(i + 1).trim(); if (!k || !v || !/^-{0,2}[a-zA-Z][\w-]*$/.test(k)) continue; // drops invalid declarations such as @media inside style=""
    const key = k.startsWith('--') ? JSON.stringify(k) : camel(k.replace(/^-ms-/, 'ms-'));
    parts.push(`${key}: ${JSON.stringify(v)}`);
  }
  return `{{ ${parts.join(', ')} }}`;
}
const NUM = new Set(['rows','cols','tabIndex','colSpan','rowSpan','maxLength','minLength','size','span']);
const lit = v => (/^[\w \-.:\/#@%?=,+()!]*$/.test(v) ? `"${v}"` : `{${JSON.stringify(v)}}`);
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '{': '{"{"}', '}': '{"}"}' };
const esc = t => t.replace(/\r/g, '').replace(/[&<>{}]/g, c => ESC[c]);

function serialize($, node, ctx) {
  if (node.type === 'text') {
    const t = node.data;
    if (!t.trim()) {
      const p = node.prev, n = node.next;
      if (t.includes('\n') && p?.type === 'tag' && n?.type === 'tag' && INLINE.has(p.name) && INLINE.has(n.name)) return '{" "}';
      return t.includes('\n') ? '' : (t ? '{" "}' : '');
    }
    return esc(t);
  }
  if (!['tag', 'script', 'style'].includes(node.type)) return '';
  const tag = node.name;
  if (tag === 'script') { ctx.scripts.push($(node)); return ''; }
  if (tag === 'style') { ctx.css.push(raw(node)); return ''; }
  const attrs = [];
  let isLink = false, href = node.attribs.href;
  if (tag === 'a' && href) { const ih = internalHref(href); if (ih) { isLink = true; href = ih; } }
  const a = { ...node.attribs };
  let selectDefault = null;
  if (tag === 'select') { const sel = $(node).find('option[selected]').first(); if (sel.length) selectDefault = sel.attr('value') ?? sel.text(); }
  for (let [k, v] of Object.entries(a)) {
    if (k.startsWith('on')) {
      const ev = k.slice(2);
      if (ctx.chrome && ev === 'click' && /^(open|close)Drawer\(\)$/.test(v.trim())) { attrs.push(`onClick={p.${v.trim().replace('()', '')}}`); continue; }
      attrs.push(`data-on${ev}=${lit(v.trim())}`);
      report.handlers.add(`${ctx.page}: ${k}="${v.trim()}"`);
      continue;
    }
    if (k === 'style') { attrs.push(`style=${styleObj(v)}`); continue; }
    if (tag === 'option' && k === 'selected') continue;
    if (k === 'href' && tag === 'a') v = isLink ? href : v;
    if (['src', 'poster', 'href', 'data-src'].includes(k) && !(tag === 'a' && isLink)) v = fixPath(v);
    if (k === 'class' && ctx.rename && !ctx.chrome) v = renameClassAttr(v, ctx.rename, ctx.key);
    let name = MAP[k] ?? (k.includes('-') && !/^(data|aria)-/.test(k) ? camel(k) : k);
    if (tag === 'input' && k === 'value' && !['checkbox', 'radio', 'hidden', 'submit', 'button'].includes(a.type)) name = 'defaultValue';
    if (tag === 'input' && k === 'checked') name = 'defaultChecked';
    if (BOOL.has(k) && v === '') { attrs.push(name); continue; }
    if (NUM.has(name) && /^-?\d+$/.test(v)) { attrs.push(`${name}={${v}}`); continue; }
    attrs.push(`${name}=${lit(v)}`);
  }
  if (selectDefault !== null) attrs.push(`defaultValue=${lit(selectDefault)}`);
  if (ctx.chrome && ctx.inNav && isLink && $(node).parent().is('li')) {
    const i = attrs.findIndex(x => x.startsWith('className='));
    const expr = `className={p.active("${href.split(/[?#]/)[0]}") ? "active" : undefined}`;
    if (i >= 0) attrs[i] = expr; else attrs.push(expr);
  }
  if (ctx.chrome) {
    const id = a.id;
    if (id === 'drawer' || id === 'drawer-overlay' || id === 'hamburger-btn') {
      const i = attrs.findIndex(x => x.startsWith('className='));
      const base = a.class || '';
      const expr = `className={"${base}" + (p.drawerOpen ? " open" : "")}`;
      if (i >= 0) attrs[i] = expr; else attrs.push(expr);
    }
    if ((a.class || '').split(/\s+/).includes('drawer-link') && isLink) {
      const i = attrs.findIndex(x => x.startsWith('className='));
      attrs[i] = `className={"${a.class}" + (p.active("${href.split(/[?#]/)[0]}") ? " active" : "")}`;
      attrs.push('onClick={p.closeDrawer}');
    }
  }
  const T = isLink ? 'Link' : tag;
  if (isLink) ctx.usesLink = true;
  const open = `<${T}${attrs.length ? ' ' + attrs.join(' ') : ''}`;
  if (VOID.has(tag)) return open + ' />';
  let kids = node.children;
  if (tag === 'textarea') { const txt = $(node).text(); return `${open}${txt ? ` defaultValue=${lit(txt.replace(/\r/g, ''))}` : ''} />`; }
  const inner = kids.map(c => serialize($, c, ctx)).join('');
  return `${open}>${inner}</${T}>`;
}

function skipScript(code) { return /function openDrawer/.test(code) || (/diraflow-theme/.test(code) && code.split('\n').length < 8) || /\bhb-btn\b/.test(code); }
function exportsOf(code) {
  const names = [...code.matchAll(/^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm)].map(m => m[1]);
  return [...new Set(names)];
}
function collectScripts($, ctx) {
  const srcs = [], inline = [];
  for (const s of ctx.scripts) {
    const src = s.attr('src');
    if (src) { if (/main\.js/.test(src)) continue; srcs.push(src); continue; }
    const code = raw(s.get(0));
    if (!code.trim() || skipScript(code)) continue;
    inline.push(code);
  }
  return { srcs, inline };
}
function meta($) {
  const g = (sel, at = 'content') => $(sel).attr(at);
  const m = { title: $('title').text().trim() || undefined, description: g('meta[name="description"]') };
  const og = { title: g('meta[property="og:title"]'), description: g('meta[property="og:description"]'), type: g('meta[property="og:type"]'), url: g('meta[property="og:url"]'), images: g('meta[property="og:image"]') };
  const openGraph = Object.fromEntries(Object.entries(og).filter(([, v]) => v));
  if (openGraph.images) openGraph.images = [openGraph.images];
  if (Object.keys(openGraph).length) m.openGraph = openGraph;
  const canon = g('link[rel="canonical"]', 'href'); if (canon) m.alternates = { canonical: canon };
  return JSON.parse(JSON.stringify(m));
}

function convertFile(file, { route, key, scoped }) {
  const html = fs.readFileSync(path.join(SRC, file), 'utf8');
  const $ = cheerio.load(html);
  const cssRaw = $('style').toArray().map(raw).join('\n');
  let css, rename = null;
  if (scoped) ({ css, rename } = processCss(cssRaw, key)); else css = fixCss(cssRaw);
  const ctx = { scripts: [], css: [], usesLink: false, page: file, chrome: false, rename, key };
  const md = meta($);
  const parts = [];
  $('body').first().children().each((_, el) => {
    const $el = $(el);
    if ((el.name === 'nav' && $el.hasClass('top')) || $el.hasClass('drawer') || $el.hasClass('drawer-overlay') || $el.hasClass('hb-overlay') || $el.hasClass('hb-drawer') || el.name === 'footer') return;
    parts.push(serialize($, el, ctx));
  });
  $('head script').each((_, el) => ctx.scripts.push($(el)));
  const { srcs, inline } = collectScripts($, ctx);
  const dir = path.join(OUT, 'app', route);
  fs.mkdirSync(dir, { recursive: true });
  const needScripts = srcs.length || inline.length;
  if (scoped) fs.writeFileSync(path.join(dir, 'page.css'), css);
  const legacy = `// Auto-generated from ${file}.\n${scoped ? '' : `export const CSS = ${JSON.stringify(css)};\n`}export const SRCS: string[] = ${JSON.stringify(srcs)};\nexport const SCRIPTS: { code: string; exports: string[] }[] = ${JSON.stringify(inline.map(c => ({ code: c.replace(/\r/g, ''), exports: exportsOf(c) })))};\n`;
  if (!scoped || needScripts) fs.writeFileSync(path.join(dir, 'legacy.ts'), legacy);
  const imports = [scoped ? "import './page.css';" : null, ctx.usesLink ? "import Link from 'next/link';" : null, needScripts ? "import LegacyScripts from '@/components/LegacyScripts';" : null,
    (!scoped || needScripts) ? `import { ${[!scoped && 'CSS', needScripts && 'SRCS', needScripts && 'SCRIPTS'].filter(Boolean).join(', ')} } from './legacy';` : null].filter(Boolean).join('\n');
  const body = parts.join('\n');
  const wrapped = scoped ? `      <div className="pg-${key}">\n${body}\n      </div>` : `      {CSS && <style dangerouslySetInnerHTML={{ __html: CSS }} />}\n${body}`;
  const tsx = `import type { Metadata } from 'next';\n${imports}\n\nexport const metadata: Metadata = ${JSON.stringify(md, null, 2)};\n\nexport default function Page() {\n  return (\n    <>\n${wrapped}\n${needScripts ? '      <LegacyScripts srcs={SRCS} scripts={SCRIPTS} />\n' : ''}    </>\n  );\n}\n`;
  fs.writeFileSync(path.join(dir, 'page.tsx'), tsx);
  report.pages.push(`${route || '/'}  <- ${file}  (scoped:${!!scoped}, ${inline.length} inline scripts)`);
}

function convertChrome() {
  const $ = cheerio.load(fs.readFileSync(path.join(SRC, 'index.html'), 'utf8'));
  const ctx = { scripts: [], css: [], usesLink: false, page: 'index.html(chrome)', chrome: true };
  ctx.inNav = true;
  const nav = serialize($, $('nav.top').get(0), ctx);
  ctx.inNav = false;
  const drawer = serialize($, $('.drawer-overlay').get(0), ctx) + serialize($, $('.drawer').get(0), ctx);
  const footer = serialize($, $('footer').last().get(0), ctx);
  const code = `/* eslint-disable @next/next/no-img-element */\n// Auto-generated from index.html (nav, mobile drawer, footer).\nimport Link from 'next/link';\n\nexport type ChromeProps = { pathname: string; active: (href: string) => boolean; drawerOpen: boolean; openDrawer: () => void; closeDrawer: () => void };\n\nexport function Nav(p: ChromeProps) {\n  return (<>${nav}</>);\n}\n\nexport function Drawer(p: ChromeProps) {\n  return (<>${drawer}</>);\n}\n\nexport function Footer() {\n  return (<>${footer}</>);\n}\n`;
  fs.writeFileSync(path.join(OUT, 'components', 'chrome.generated.tsx'), code);
}

const SITE = ['index','careers','code-of-conduct','contact','industries','privacy-policy','report'];
const SCOPED = { 'solutions': 'sol', 'team': 'team', 'healthcare-life-sciences': 'hc', 'industry-detail': 'ind', 'data-classification': 'sv', 'image-annotation': 'sv' }; // 3d-lidar, audio, nlp, video are now data-driven: see content/services.json + components/ServicePage.tsx
loadSiteClasses();
convertChrome();
if (process.argv[4] === '--chrome-only') process.exit(0);
for (const p of SITE) convertFile(`${p}.html`, { route: p === 'index' ? '' : p, scoped: false });
for (const [p, key] of Object.entries(SCOPED)) convertFile(`${p}.html`, { route: p, key, scoped: true });
for (const f of ['agentic-evaluation-datasets.html']) // other posts are templated: content/blog + components/BlogPost.tsx
  convertFile(`blog-posts/${f}`, { route: `blog-posts/${f.replace('.html', '')}`, key: 'bp', scoped: true });
fs.writeFileSync(path.join(OUT, 'scripts', 'conversion-report.txt'), report.pages.join('\n') + '\n\nInline handlers routed through legacy bridge:\n' + [...report.handlers].sort().join('\n') + '\n');
console.log(report.pages.join('\n')); console.log('handlers:', report.handlers.size);
