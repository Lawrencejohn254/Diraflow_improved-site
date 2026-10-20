# Diraflow: static HTML -> Next.js (App Router)

    npm install
    cp .env.example .env.local     # then fill in the values (see "Before you deploy")
    npm run dev                    # http://localhost:3000
    npm run build && npm start

## Before you deploy (important)
1. **Report form endpoint.** `report.html` shipped with the placeholder `https://formspree.io/f/YOUR_FORM_ID`, so every whistleblowing report on the old site failed. Create a Formspree form for it and set `NEXT_PUBLIC_REPORT_FORMSPREE_URL`. Until then the form shows its error state (with the contact@ email fallback) instead of silently dropping reports.
2. **Supabase env vars.** Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel. `lib/supabase.ts` falls back to the values that were hard-coded in `careers.html` so nothing breaks, but remove the fallbacks once the env vars exist. The anon key is public by design; **Row Level Security is what protects `applications`, `talent_pool` and the `resumes` bucket** — please verify the policies (anonymous users should be able to INSERT only, never SELECT).
3. **Policy acknowledgement is not saved anywhere.** The "Submit Acknowledgement" box on the privacy-policy page was UI-only in the old site and still is (see `components/AckBox.tsx`). Employees believe they are signing something. Wire it to a table or Formspree, or remove it.

## Status

**Phase 1 (done):** every page converted, URLs preserved, old `.html` URLs redirect.
**Phase 2 (done):** one layout (shared nav/drawer/footer), scoped CSS for pages with their own look, data-driven annotation pages (`content/services.json`) and blog (`content/blog/*`).
**Phase 3 (done, except the admin app):** all page scripts are now React; the temporary shim (`LegacyScripts`, `legacy-bridge`, `legacy-main`) is deleted and nothing references it.

| Page | Now |
|---|---|
| Careers | `components/CareersModals.tsx` (assessment + talent-pool modals), `CareerButton`, questions in `content/careers.ts`. Same Supabase tables (`job_settings`, `applications`, `talent_pool`), `resumes` bucket and `send-application-email` edge function; same payload fields. Uses `@supabase/supabase-js` from npm (the 200 KB `assets/supabase.js` is deleted). |
| Contact | `components/tabs.tsx` + `components/forms.tsx` (`FormspreeForm`, `FormSubmit`, `FormMessage`). |
| Report | `components/ReportForm.tsx`. Anonymous mode now truly excludes the identity fields (disabled `<fieldset>`); the old page only dimmed them, so typed data was still sent. Reference numbers use `crypto.getRandomValues`. |
| Home, Industries, Solutions, Image annotation | the four "brief" forms use the shared form components; stats use `components/CountUp.tsx`; the ticker loops via duplicated (aria-hidden) items. |
| Industries / Industry detail | cards link to detail pages with real navigation. `/industry-detail?industry=<id>` is now **server-rendered** from `content/industries.json` (real title/description per industry for SEO and link previews; unknown id falls back to automotive as before). |
| Privacy policy | scroll-spy sidebar (`PolicyScrollSpy`), acknowledgement box (`AckBox`). |
| Site-wide | `components/SiteEffects.tsx`: nav shadow on scroll, card reveal-on-scroll (skipped for `prefers-reduced-motion`), card tilt. Hover/focus effects that were inline JS handlers are CSS in `app/styles.css`. |
| Admin | **not rewritten** (see below). |

## The admin app
`/admin` serves `public/_legacy/admin.html` unchanged: ~6,800 lines, 27 Supabase tables, roles/sessions/leave/tasks/PII-view logging, 8 edge functions, AI assist, Chart.js and jsPDF from jsDelivr. It authenticates with Supabase Auth and relies on RLS server-side, so serving it as a static file is acceptable. A React rewrite is a project of its own and should not be done without a test Supabase project to run it against. What was done instead: `/admin` is `noindex, nofollow, noarchive`, `Cache-Control: no-store`, `X-Frame-Options: DENY`, disallowed in `robots.txt`, and the duplicate public URL `/_legacy/admin.html` redirects to `/admin`. Suggested approach when you want it: move one tab at a time (Applications first) into `app/admin/**` behind Next middleware that checks the Supabase session, keeping the old file as a fallback until each tab is verified.

## Layout
- `app/` routes. `app/[service]` and `app/blog-posts/[slug]` are data-driven; `app/layout.tsx` is the single root layout.
- `components/` shared UI. `chrome.generated.tsx` is the nav/drawer/footer (generated once from `index.html`, now hand-maintained).
- `content/` services, blog, industries, careers questions. `lib/` Supabase and blog loaders.
- `scripts/convert.mjs`, `extract-*.py`: one-shot migration tools (they overwrite pages — don't re-run once you edit by hand).

## Remaining pages converted 1:1 (not templated)
`/solutions`, `/team`, `/healthcare-life-sciences`, `/image-annotation`, `/data-classification`, `/blog-posts/agentic-evaluation-datasets` keep per-page scoped CSS.

## Decisions for you
- **Design system:** the two old systems differ (gold `#c8a96e` vs `#c8922a`, container widths, greys). Scoped CSS preserves each page. Unifying = visible change on ~10 pages.
- **Home page stat:** the second counter's static text says "15+" but its animation target was 90. I kept what visitors actually saw (15+). Tell me if 90+ is the real number.
- **Dark mode:** the old `main.js` would have switched dark-mode visitors to a dark theme, but it never ran in production and no page has a toggle. Not ported. If you want dark mode it needs a real design pass first.
- **Copy errors:** "Nine specialized annotation types" appears on 3D/LIDAR, NLP and video pages that list 6, 6 and 4 (audio says eight, lists 6).
- **Broken links:** 28 links to non-existent `services/*.html` (rlhf, red-teaming, environment, agentic).
- **Domain:** robots.txt says diraflow.ai; sitemap, og:url, canonicals, share links say diraflowai.com.
- **Old repo hygiene:** `node_modules/` and `supabase/.temp/*` are committed; hot-linked Unsplash/Pexels images should move into `public/`.

## Bugs in the old site, fixed during migration
`main.js` syntax error (nothing ran); dead blog filter; related-post 404s; inconsistent related blurbs; annotation rows never stacked on mobile; closed drawer leaked a shadow on the right edge; CSP blocked Pexels videos; invalid CSS in two posts; report form placeholder endpoint; anonymous report still sending typed identity; home image hover-zoom never fired (an overlay covered the image) — now triggered from its card.

## Phase 4 (optional polish)
`next/image` + compress `Mark.png` (1.9 MB) / `Martin.jpg` (4.3 MB), `sitemap.ts`, blog bodies to MDX, unify design tokens, template the remaining 1:1 pages.
