# Architecture Decisions

## 2026-08-08 — JS and CSS are served with revalidate-always caching via `_headers`

**Decision.** Cloudflare Pages' default caches static assets for 4 hours
(`max-age=14400`) while HTML gets `max-age=0`. After a deploy, returning
visitors could run stale JS/CSS against fresh HTML for up to 4 hours —
observed live: an old `scripts/site.js` painted an outdated dictionary,
leaving new sections empty and CTAs invisible. A `_headers` file at repo
root overrides `scripts/*` and `styles/*` to
`Cache-Control: public, max-age=0, must-revalidate`, so browsers revalidate
on every load and HTML, JS, and CSS always deploy atomically from the
visitor's point of view.

**Alternatives weighed.**
- *Accept the 4-hour window:* rejected; renumbered i18n keys mean stale JS
  renders wrong content, not merely old content.
- *Content-hashed asset filenames:* rejected; requires a build step this
  repo deliberately avoids.
- *Manual version query strings on asset URLs:* rejected; hand-maintained
  cache busting is exactly what already failed once (the
  `DICT_CACHE_VERSION` misses).

**Consequences accepted.** Every page load costs one conditional request per
asset (304 from the Cloudflare edge when unchanged); the site loses 4-hour
offline-ish asset caching for repeat visits, a fair trade for a
marketing-critical site deployed straight from `main`.

## 2026-08-08 — Internal docs are kept off production via a `_redirects` manifest

**Decision.** Cloudflare Pages deploys this repository verbatim (no build
step), so every committed file is publicly served at www.alkindi.pt. Internal
files are excluded from production by a `_redirects` file at repo root that
301-redirects them to `/`. `_redirects` is the single authoritative list of
internal paths; any new internal file or directory must be added there in the
same commit that introduces it.

**Alternatives weighed.**
- *Leave them public:* rejected; the repo is public on GitHub anyway, but the
  production domain should serve the site, not the studio's process
  artifacts.
- *Exclude at build time:* rejected; requires introducing a build step, which
  this repo deliberately avoids.
- *`_headers` with `X-Robots-Tag: noindex`:* rejected; hides from search
  engines but still serves the content.
- *Serve 404 instead of redirecting:* not available; Pages `_redirects`
  supports only 3xx and 200 status codes.

**Consequences accepted.** A platform-specific file lives at repo root (same
exception class as the crawler files); the exclusion list is maintained by
hand and silently stops covering files nobody adds to it; requests to the
internal paths return 301 rather than 404, which mildly advertises that the
paths exist.
