# Repository Instructions

## Project Framing

- This repository is a simple static studio site.
- Keep it simple on purpose.
- Do not introduce frameworks, bundlers, or build tooling without a clear, repo-specific need.

## Instruction Scope

- This root file applies to the whole repository by default.
- If the repo grows, subdirectories may add `AGENTS.md` or `AGENTS.override.md` only when that subtree genuinely needs narrower local rules.
- Nested instruction files should refine local behavior, not exist for one-off tasks or temporary notes.
- When a nested instruction file exists for the files being edited, follow the most specific applicable instructions without ignoring the repo-wide contract.

## Core Separation

- `index.html` owns semantic structure, section order, links, and asset references. It carries `data-i18n` / `data-i18n-aria` attributes on the elements that receive translatable strings, but no authored copy.
- `content/en.json` and `content/tr.json` own all visible authored copy, keyed by `data-i18n` / `data-i18n-aria` attributes. Adding a language means adding `content/<lang>.json` with the same keys.
- `styles/fonts.css` owns external font imports and local `@font-face` declarations.
- `styles/main.css` owns design tokens, layout, component styling, animation, responsive behavior, and visual state classes.
- `styles/noscript.css` owns the no-JS fallback styles, loaded inside `<noscript>` in `index.html`.
- `scripts/site.js` is the default home for browser behavior: DOM wiring, scroll/header behavior, reveal observers, team-member toggle interactions, and the i18n loader.
- `assets/` should own images, logos, and fonts.

## Required Rules

- Do not commit inline `<script>` blocks in `index.html`.
- Do not commit inline `style=""` for production UI. Use classes, modifiers, CSS custom properties, or asset files instead.
- Do not commit authored copy in `index.html`. Add or edit `content/<lang>.json` instead. The only exceptions are the noscript fallback message and the static team-toggle aria-labels (progressive a11y baseline that JS overrides at runtime).
- Do not duplicate copy, content lists, or behavior rules across HTML, CSS, and JS.
- Keep JavaScript out of marketing copy and visual design decisions.
- Keep CSS out of content policy and business logic. CSS may express visual states, not authored meaning.
- Preserve semantic markup, accessibility labels, and ARIA state when moving behavior out of HTML.
- If a UI change needs new behavior, put the behavior in `scripts/site.js`, not in the HTML.
- If a UI change needs new styling, put the styling in `styles/main.css`, not in JS.
- New static files should not be added at repo root unless there is a strong reason.

## Remaining Separation Debt

- Placeholder gradients are class-driven now. Replace them with real assets when actual project and team imagery is ready.

## Preferred Minimal Structure

```text
index.html
styles/
  fonts.css
  main.css
  noscript.css
scripts/
  site.js
assets/
  logos/
  images/
  fonts/
content/
  en.json
  tr.json
```

## Working Contract

- HTML = structure (no authored copy)
- content = authored copy per language
- CSS = visual system
- JS = interaction wiring + i18n loader
- assets = binary and static resources

## Review Scenarios

- A copy-only edit should land in `content/<lang>.json` and should not touch HTML, CSS, or JS.
- A styling-only edit should not require rewriting document structure beyond classes.
- Interaction changes should land in `scripts/site.js`.
- New images, fonts, and logos should land under `assets/`.
- Adding a language means adding `content/<lang>.json` with the same keys as the existing dictionaries and registering the lang in `SUPPORTED_LANGS` + `DICT_URLS` in `scripts/site.js`.

## Verification

- There is no build step in this repo. Verify changes with a local static server.
- From the repo root, run `python3 -m http.server 4173`.
- After HTML, CSS, JS, or path changes, verify at minimum:
  - `curl -I http://127.0.0.1:4173/`
  - `curl -I http://127.0.0.1:4173/styles/fonts.css`
  - `curl -I http://127.0.0.1:4173/styles/main.css`
  - `curl -I http://127.0.0.1:4173/styles/noscript.css`
  - `curl -I http://127.0.0.1:4173/scripts/site.js`
  - `curl -I http://127.0.0.1:4173/content/en.json`
  - `curl -I http://127.0.0.1:4173/content/tr.json`
- If assets were renamed or moved, also verify `curl -I` for each affected asset path.
- If markup or interaction changed, do a browser sanity check for header behavior, reveal animations, and team-member toggles before finishing.

## Non-Goals

- This document is not a redesign brief.
- This document is not a framework migration plan.
- This document does not require splitting `styles/main.css` further unless actual change pressure justifies it.
