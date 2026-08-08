# Conversion Restructure Design

Date: 2026-08-08
Status: approved direction (Approach A: proof-led restructure)

## Goal

Transform the site from a passive service listing into a page that converts
its primary buyer, web3 protocols and founders, into booked consultations.
Keep the hero section and the visual system untouched.

## Decisions already made

- Primary buyer: web3 protocols/founders buying smart contract development,
  audits, and advisory. Trust-driven, high-ticket.
- Proof assets: named past clients only. Golem Foundation (smart contract
  solution: designed, implemented, tested, deployed) and Kleros (same, plus
  fullstack implementation). No public numbers, reports, or testimonials yet.
- Primary CTA: the existing Proton calendar booking ("Book a free
  consultation"). Single conversion goal, repeated at decision points.
- Approach: restructure the existing single static page. No framework, no
  build step, no new pages.

## Page structure (index.html)

New section order: hero → work → services → about → origin → team → contact.

- Hero: unchanged (markup, copy, CTA target `#contact`).
- `#work` (new): "Selected Work" section between hero and services.
- Nav gains a "Work" link (`#work`) before Services.
- Everything else keeps its current markup shape.

## Work section

Text-first, typographic, consistent with existing sections (section label +
lead + list). No logos, no screenshots, no fabricated imagery.

Two case entries, most recent first:

1. Golem Foundation: smart contract solution, designed, implemented, tested,
   and deployed.
2. Kleros: smart contract solution end to end, plus fullstack implementation.

Each entry: client name, engagement line, two or three sentences of
description, status line. All copy drafted in EN and TR and explicitly
approved by the user before commit. Nothing unverified (project names, dates,
figures) goes on the page without sign-off.

i18n keys: `nav.work`, `work.label`, `work.lead`, `work.01.client`,
`work.01.role`, `work.01.desc`, `work.01.status`, `work.02.*` (same shape).

## Services regrouping

The flat 11-item list becomes three titled groups. Items renumber to match
the new order; `services.NN.*` keys renumber identically in `en.json`,
`tr.json`, `index.html`, `llms.txt`, and `llms-full.txt`.

Group labels are new i18n keys: `services.group.onchain`,
`services.group.product`, `services.group.also`.

- Onchain Engineering: 01 Smart Contract Development, 02 Smart Contract
  Audits, 03 Technical Advisory.
- Product & Design: 04 Brand & Visual Identity, 05 Copywriting, 06 Web
  Design, 07 Graphics & Digital Art, 08 User Experience Design, 09 User
  Interface Design, 10 Web App Development.
- Also: 11 Hi-Fi Listening Rooms.

## Copy shifts

- Hero copy: untouched.
- `services.lead`: rewritten to address the buyer's concern (shipping
  contracts that hold value without incident) instead of describing studio
  taste.
- About and contact heading: rewritten with the same orientation.
- Origin: existing three paragraphs stay; one connective sentence added so
  the cryptanalysis heritage reads as security pedigree.
- All copy changes land in `content/en.json` and `content/tr.json` with
  identical key sets, and are approved by the user before commit.

## CTA repetition

The booking link appears at three decision points: after the Work section,
after the Onchain Engineering group, and in Contact (existing). One reusable
element (class `.cta-inline`, styled in `main.css` from existing tokens), one
i18n key `cta.book`, same URL everywhere. No popups, sticky bars, or
countdown mechanics; they conflict with the kept aesthetic.

## Mechanics

- CSS: new `.work` and `.cta-inline` styles in `styles/main.css`, reusing
  design tokens and the existing `.reveal` / `.reveal-delay-N` system.
- JS: no changes expected; the i18n loader is generic. Verify with grep that
  no service-count or section-list assumptions exist.
- Crawler files: `llms.txt` and `llms-full.txt` gain the Work content and the
  regrouped service order; `sitemap.xml` `<lastmod>` bumps.
- JSON-LD: `knowsAbout` order updated to match the new service order.

## Out of scope

- Hero redesign, new imagery, testimonials, case-study subpages, analytics,
  forms, framework migration.

## Verification

- Repo checklist: local static server, `curl -I` on all key paths.
- Both JSON dictionaries parse and have identical key sets.
- Browser sanity check: header behavior, reveal animations, nav anchors,
  language switch on the new keys.
