# Architecture Decisions

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
