# Contributing

This is a deliberately simple static site: no framework, no bundler, no
build step. The repository deploys verbatim to www.alkindi.pt on every
push to `main`. Keeping it simple is a feature; contributions should
preserve that. This document is the authoritative contract for working
in this repository — for humans and agents alike.

## Core separation

- `index.html` owns semantic structure, section order, links, and asset references. It carries `data-i18n` / `data-i18n-aria` attributes on the elements that receive translatable strings, but no authored copy.
- `content/en.json` and `content/tr.json` own all visible authored copy, keyed by `data-i18n` / `data-i18n-aria` attributes. Adding a language means adding `content/<lang>.json` with the same keys and registering the lang in `SUPPORTED_LANGS` + `DICT_URLS` in `scripts/site.js`.
- `styles/fonts.css` owns external font imports and local `@font-face` declarations.
- `styles/main.css` owns design tokens, layout, component styling, animation, responsive behavior, and visual state classes.
- `styles/noscript.css` owns the no-JS fallback styles, loaded inside `<noscript>` in `index.html`.
- `scripts/site.js` is the default home for browser behavior: DOM wiring, scroll/header behavior, reveal observers, cipher animations, and the i18n loader.
- `assets/` owns images, logos, and fonts.
- Root-level discovery files (`robots.txt`, `sitemap.xml`, `llms.txt`, `llms-full.txt`) are machine-readable manifests for crawlers and AI assistants. They mirror, not replace, the authored copy in `content/<lang>.json`. When that copy or the page structure changes, refresh `sitemap.xml`'s `<lastmod>` and regenerate the prose in `llms-full.txt`.

In short: HTML = structure, content = authored copy per language,
CSS = visual system, JS = interaction wiring + i18n loader,
assets = binary and static resources. A copy-only edit lands in
`content/<lang>.json` and touches nothing else; a styling-only edit does
not rewrite document structure beyond classes; interaction changes land
in `scripts/site.js`; new images, fonts, and logos land under `assets/`.

## Required rules

- Do not commit inline `<script>` blocks in `index.html`, except for a single `<script type="application/ld+json">` block in `<head>` carrying structured data. Per the HTML spec, a `<script>` element used as a data block (which `application/ld+json` is) must embed the data inline and must not set the `src` attribute, so externalising the JSON-LD is not an option. Most structured-data consumers also expect the payload to be readable without executing JavaScript.
- Do not commit inline `style=""` for production UI. Use classes, modifiers, CSS custom properties, or asset files instead.
- Do not commit authored *visible body copy* in `index.html`. Add or edit `content/<lang>.json` instead. Documented exceptions, in HTML for a reason: the noscript fallback message (JS is what fetches the dictionaries), `<title>` and `<meta>`/`og:*` tags (consumed before any script runs), the logo `alt` text (referenced from a single source asset), and the `<head>` JSON-LD payload (structured data for AI and search crawlers, consumed before any script runs).
- Do not duplicate copy, content lists, or behavior rules across HTML, CSS, and JS.
- Keep JavaScript out of marketing copy and visual design decisions.
- Keep CSS out of content policy and business logic. CSS may express visual states, not authored meaning.
- Preserve semantic markup, accessibility labels, and ARIA state when moving behavior out of HTML.
- If a UI change needs new behavior, put the behavior in `scripts/site.js`, not in the HTML.
- If a UI change needs new styling, put the styling in `styles/main.css`, not in JS.
- New static files should not be added at repo root unless there is a strong reason. Protocol-mandated files are the exception and belong at root: `robots.txt` (RFC 9309), `sitemap.xml`, `llms.txt`, and `llms-full.txt` (per llmstxt.org), plus Cloudflare Pages' `_headers` and `_redirects`. Treat them as machine-readable infrastructure, not authored copy.
- Any change to `content/<lang>.json` must bump `DICT_CACHE_VERSION` in `scripts/site.js` and the matching `content/en.json?v=...` preload URL in `index.html`, in lock-step, in the same commit. Returning visitors are served the dictionary cached under the old version token (localStorage plus `force-cache` fetch, with no revalidation path), so an unbumped version ships stale copy indefinitely; renumbered keys make it wrong copy, not just old copy. This is the rule newcomers miss most often.

## JavaScript practices

There is no linter; these rules work because contributors respect them.
All browser behavior lives in `scripts/site.js`, a classic script wrapped
in one IIFE.

- Vanilla DOM APIs only. No libraries, no frameworks, no CDN scripts.
- `const` by default, `let` when reassignment is real, `var` never.
- Arrow functions for callbacks; template literals over string
  concatenation; object shorthand where it applies.
- Strict equality everywhere; loose `!= null` is the one accepted idiom.
- Never shadow an outer name. If two scopes want the same word, one of
  them is misnamed.
- Nothing escapes the IIFE. No new globals, ever.
- Name every magic number or string; the constant's name should read
  like the comment you would otherwise write.
- Feature-detect before use (`'IntersectionObserver' in globalThis`) and
  keep the no-JS and `prefers-reduced-motion` paths working: content
  must be correct with the enhancement stripped away.
- Anything async or animated must be cancelable and re-entrant: a
  language switch or repeat trigger mid-flight may not corrupt state
  (see the cipher token pattern in `site.js`).
- `console.warn` for operational failures only; no other console output,
  no `eval`/`new Function`, no `alert`.

## CSS practices

- Tokens first: new values join the `:root` block in `styles/main.css`
  and are consumed with `var()`. Derive accent alphas with
  `color-mix(in srgb, var(--color-accent) N%, transparent)` instead of
  new rgba literals.
- Match the file's existing vocabulary (hairline rules, plate corners,
  mono machine-facts) before inventing a new one.
- Every visual addition is checked at mobile widths and under
  `prefers-reduced-motion` before it ships.

## Verification

- There is no build step in this repo. Verify changes with a local
  static server: from the repo root, run `python3 -m http.server 4173`.
- After HTML, CSS, JS, or path changes, `curl -I` at minimum: `/`, every
  file under `styles/` and `scripts/`, both `content/*.json`
  dictionaries, and the four crawler files (`robots.txt`, `sitemap.xml`,
  `llms.txt`, `llms-full.txt`).
- If assets were renamed or moved, also verify `curl -I` for each
  affected asset path.
- If markup or interaction changed, do a browser sanity check for header
  behavior, reveal animations, and the cipher/frequency-plate
  interactions before finishing.

## Deployment

- The site is served by Cloudflare Pages, auto-deploying every push to `main`. The linkage is configured in the Cloudflare dashboard and is intentionally invisible in this repo: no workflow file, no CNAME, no deploy config. Pushing to `main` is deploying to production at https://www.alkindi.pt/.
- Pages deploys the repository verbatim, so internal files would be publicly served. `_redirects` at repo root is Cloudflare Pages' redirect manifest and the single authoritative list of internal paths kept off production via redirects to `/`. New internal files or directories must be added there in the same commit that introduces them.
- `_headers` at repo root overrides Pages' 4-hour default asset cache so `scripts/*` and `styles/*` revalidate on every load; without it, deploys ship stale JS/CSS to returning visitors for up to 4 hours. See [ARCHITECTURE.md](ARCHITECTURE.md) for the decision record.

## Workflow

1. Branch from `main`. Pushing `main` is deploying to production, so
   nothing lands there unverified.
2. Keep each commit one logical change, in
   [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
   format.
3. Run the Verification steps above before proposing changes; for visual
   work, include before/after screenshots in the PR.

## Known debt

- Replace placeholder visuals with real assets when actual project and
  team imagery is ready.

## Non-goals

- This document is not a redesign brief and not a framework migration
  plan. It does not require splitting `styles/main.css` further unless
  actual change pressure justifies it.
