# Diraflow: static HTML -> Next.js (App Router)

    npm install
    npm run dev          # http://localhost:3000
    npm run build && npm start

## Status

**Phase 1 (done):** every page converted, URLs preserved, old `.html` URLs redirect (`next.config.ts`).

**Phase 2 (done):**
- One root layout (`app/layout.tsx`): shared nav, mobile drawer, footer on **every** page. No more full-page reloads between "groups". Nav highlights the right item (Solutions on annotation pages, Blog on posts, Industries on industry pages).
- Former standalone pages (solutions, team, healthcare, industry-detail, image-annotation, data-classification, featured blog post) keep their own look via **scoped CSS**: each page's CSS is prefixed with `.pg-<key>`, its tokens are re-declared on that wrapper, chrome/reset rules are dropped, and any class that collided with `styles.css` is renamed (`sv-`, `bp-`, ...). Verified against the old pages with screenshots.
- **Annotation pages are data-driven:** `/3d-lidar`, `/audio-annotation`, `/nlp-annotation`, `/video-annotation` are rendered by `components/ServicePage.tsx` from `content/services.json` (route: `app/[service]/page.tsx`). Visible text and images are identical to the old pages. Add a service = add a JSON record (+ images in `public/`). The brief form is a real React component (`BriefForm`) that posts to Formspree and shows success/error inline.
- **Blog is data-driven:** `content/blog/index.json` (listing cards), `posts.json` (post metadata), `<slug>.html` (article body), `<slug>.css` (small per-post overrides, e.g. category badge colour). `components/BlogPost.tsx` + `app/blog-posts/[slug]` render six posts; `components/BlogIndex.tsx` renders `/blog` with a working category filter. "Related posts" are computed from the data (the old hard-coded links were broken). Reading-progress bar and copy-link are React components.

**Phase 3 (todo):** port the remaining legacy scripts to React (careers form + Supabase insert, contact tabs, report form, industry-detail content, privacy acknowledgement), replace `public/assets/supabase.js` with `@supabase/supabase-js`, rewrite `/admin` (currently `public/_legacy/admin.html`, served unchanged) with auth middleware.
**Phase 4 (todo):** `next/image`, compress `Mark.png` (1.9 MB) / `Martin.jpg` (4.3 MB), `sitemap.ts`/`robots.ts`, convert blog bodies to MDX.

## What is still "legacy"
- `components/LegacyScripts.tsx`, `lib/legacy-bridge.ts`, `lib/legacy-main.ts`: temporary shim keeping the original inline JS and `onclick="..."` handlers working on careers, contact, industries, privacy-policy, report, industry-detail and the home page. `scripts/conversion-report.txt` lists every handler it covers.
- `app/blog-posts/agentic-evaluation-datasets`, `app/image-annotation`, `app/data-classification`, `app/solutions`, `app/team`, `app/healthcare-life-sciences`, `app/industry-detail`: converted 1:1 (not templated). The featured post has a different hero layout; image-annotation and data-classification use card/grid layouts the service template doesn't model yet.
- `scripts/convert.mjs`, `extract-services.py`, `extract-blog.py` are one-shot migration tools. `convert.mjs` overwrites pages, so stop running it once you hand-edit them.

## Decision needed: one design system
The two old design systems are genuinely different (e.g. gold `#c8a96e` vs `#c8922a`, `.container-wide` 90% vs 1160px, different text greys). Scoped CSS keeps each page looking as it did, so nothing shifts today. Truly unifying means choosing one set of tokens and accepting visible changes on ~10 pages. Recommended: keep the `styles.css` tokens, delete the `.pg-*` token blocks, review each page once.

## Bugs found in the old site (fixed unless noted)
Fixed in the migration:
1. `assets/main.js` had `import` lines in a classic `<script>` -> syntax error -> none of it ran (scroll reveals, counters, modals, forms). Now ported and running; the home page will animate where it didn't before.
2. Blog category filter called an undefined `filterPosts()`. Now a working filter.
3. Related-post links on blog posts: 2 pointed to a non-existent slug and the rest were relative to the wrong folder (404). Now computed from data.
4. Related-post blurbs were inconsistent between posts (e.g. "50,000" vs "5,000 adversarial prompts"). Single source of truth now.
5. Inline `@media` inside `style=""` on annotation pages is invalid CSS, so rows never stacked on mobile. Now real CSS; they stack.
6. Closed mobile drawer leaked its shadow onto the right edge of every page.
7. CSP blocked the Pexels videos (`default-src 'self'`) and `frame-ancestors 'none'` contradicted `X-Frame-Options: SAMEORIGIN`. Fixed in `next.config.ts`.
8. Typos in two posts' CSS (`max: width 500px;px;`) normalised to match the other posts.

**Not fixed, need your call:**
- Copy says "Nine specialized annotation types" on the 3D/LIDAR, NLP and video pages but they list 6, 6 and 4 (audio says eight, lists 6).
- 28 links to non-existent `services/*.html` (rlhf, red-teaming, environment, agentic) still 404.
- Domain mismatch: `robots.txt` says diraflow.ai; sitemap, og:url, canonicals and share links say diraflowai.com.
- Confirm Supabase Row Level Security on `applications` and `talent_pool` (anon key is public in `careers.html` / `admin.html`); move the key to an env var in Phase 3.
- Old repo: `node_modules/` and `supabase/.temp/*` are committed; add to `.gitignore`.
- Several Unsplash/Pexels hero images are hot-linked: move them into `public/` for reliability.
