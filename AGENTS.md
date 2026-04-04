# Repository Instructions

## Project Framing

- This repository is a simple static studio site.
- Keep it simple on purpose.
- Do not introduce frameworks, bundlers, or build tooling without a clear, repo-specific need.

## Core Separation

- `index.html` owns semantic structure, section order, authored copy, links, and asset references.
- `styles/fonts.css` owns external font imports and local `@font-face` declarations.
- `styles/main.css` owns design tokens, layout, component styling, animation, responsive behavior, and visual state classes.
- `scripts/site.js` is the default home for browser behavior: DOM wiring, scroll/header behavior, reveal observers, and team-member toggle interactions.
- `assets/` should own images, logos, and fonts.
- `content/` should exist only if multilingual copy or repeatable content collections are extracted from the HTML.

## Required Rules

- Do not commit inline `<script>` blocks in `index.html`.
- Do not commit inline `style=""` for production UI. Use classes, modifiers, CSS custom properties, or asset files instead.
- Do not duplicate copy, content lists, or behavior rules across HTML, CSS, and JS.
- Keep JavaScript out of marketing copy and visual design decisions.
- Keep CSS out of content policy and business logic. CSS may express visual states, not authored meaning.
- Preserve semantic markup, accessibility labels, and ARIA state when moving behavior out of HTML.
- If a UI change needs new behavior, put the behavior in `scripts/site.js`, not in the HTML.
- If a UI change needs new styling, put the styling in `styles/main.css`, not in JS.
- New static files should not be added at repo root unless there is a strong reason.

## Remaining Separation Debt

- Most authored content still lives directly in `index.html`. Keep it there unless multilingual support or repeatable content collections make extraction worthwhile.
- Placeholder gradients are class-driven now. Replace them with real assets when actual project and team imagery is ready.

## Preferred Minimal Structure

```text
index.html
styles/
  fonts.css
  main.css
scripts/
  site.js
assets/
  logos/
  images/
  fonts/
content/   # only if content extraction becomes necessary
```

## Working Contract

- HTML = structure and copy
- CSS = visual system
- JS = interaction wiring
- assets = binary and static resources
- content = reusable language or repeatable data, only if needed later

## Review Scenarios

- A copy-only edit should not require touching interaction code.
- A styling-only edit should not require rewriting document structure beyond classes.
- Interaction changes should land in `scripts/site.js`.
- New images, fonts, and logos should land under `assets/`.
- If EN/TR becomes real content rather than placeholders, move language content into `content/*` instead of duplicating large blocks of markup plus ad hoc JS.

## Non-Goals

- This document is not a redesign brief.
- This document is not a framework migration plan.
- This document does not require splitting `styles/main.css` further unless actual change pressure justifies it.
