# Contributing

This is a deliberately simple static site: no framework, no bundler, no
build step. The repository deploys verbatim to www.alkindi.pt on every
push to `main`. Keeping it simple is a feature; contributions should
preserve that.

## The binding contract

[AGENTS.md](AGENTS.md) is the authoritative repository contract: which
file owns what, the required rules (including the dictionary
cache-version bump), verification steps, and how deployment works. Read
it before changing anything. This document adds only what AGENTS.md does
not cover: code practices and contribution workflow.

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

## Workflow

1. Branch from `main`. Pushing `main` is deploying to production, so
   nothing lands there unverified.
2. Keep each commit one logical change, in
   [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
   format.
3. Run the verification steps from AGENTS.md before proposing changes;
   for visual work, include before/after screenshots in the PR.
4. Copy changes follow the i18n and crawler-mirror rules in AGENTS.md's
   Required Rules and Core Separation sections exactly; the cache-bump
   rule there is the one most often missed by newcomers.
