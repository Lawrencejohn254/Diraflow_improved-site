import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

// Ported from vercel.json. Notes: script-src keeps 'unsafe-inline' (Next hydration + legacy page scripts);
// media-src added because the home page streams Pexels videos, which the old default-src 'self' blocked.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://cdn.jsdelivr.net https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://formspree.io https://vitals.vercel-insights.com",
  "img-src 'self' data: https:",
  "media-src 'self' https://videos.pexels.com",
  "frame-ancestors 'self'",
].join('; ');

const nextConfig: NextConfig = {
  trailingSlash: false,
  async redirects() {
    return [
      { source: '/index.html', destination: '/', permanent: true },
      // The admin app lives at one URL only (/admin); the file behind the rewrite is not a public address.
      { source: '/_legacy/admin.html', destination: '/admin', permanent: true },
      { source: '/blog-posts/:slug.html', destination: '/blog-posts/:slug', permanent: true },
      { source: '/:page(blog|careers|contact|industries|solutions|team|report|admin|privacy-policy|code-of-conduct|3d-lidar|audio-annotation|data-classification|healthcare-life-sciences|image-annotation|industry-detail|nlp-annotation|video-annotation).html', destination: '/:page', permanent: true },
    ];
  },
  async rewrites() {
    // /admin is the React shell. The original static admin page still does the work for tabs that have not been
    // migrated yet: the shell loads it in a frame at /admin-legacy?embed=1 (and it works standalone at that URL too).
    return { beforeFiles: [{ source: '/admin-legacy', destination: '/_legacy/admin.html' }], afterFiles: [], fallback: [] };
  },
  async headers() {
    return [
    {
      // Internal back-office: never indexed, never cached by browsers/CDNs/proxies.
      source: '/admin/:path*',
      headers: [
        { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
        { key: 'Cache-Control', value: 'no-store, max-age=0' },
        { key: 'X-Frame-Options', value: 'DENY' },
      ],
    },
    {
      // Framed only by the shell on the same origin.
      source: '/admin-legacy',
      headers: [
        { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
        { key: 'Cache-Control', value: 'no-store, max-age=0' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      ],
    },
    {
      source: '/admin',
      headers: [
        { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
        { key: 'Cache-Control', value: 'no-store, max-age=0' },
        { key: 'X-Frame-Options', value: 'DENY' },
      ],
    },
    {
      source: '/(.*)',
      headers: [
        { key: 'Content-Security-Policy', value: csp },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      ],
    }];
  },
};

export default nextConfig;
