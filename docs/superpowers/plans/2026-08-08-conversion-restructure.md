# Conversion Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure alkindi.pt from a flat service listing into a proof-led page that converts web3 protocols/founders into booked consultations, per `docs/superpowers/specs/2026-08-08-conversion-restructure-design.md`.

**Architecture:** Single static page, no build step. HTML owns structure, `content/en.json`/`content/tr.json` own all copy via `data-i18n` keys, `styles/main.css` owns visuals, `scripts/site.js` (generic i18n loader) needs no changes. Crawler mirrors (`llms.txt`, `llms-full.txt`, `sitemap.xml`) refresh at the end.

**Tech Stack:** Plain HTML/CSS/JSON. Verification via `python3 -m http.server`, `curl`, and two python one-liners.

## Global Constraints

- Hero section: markup, copy, and CTA target `#contact` stay byte-identical.
- No authored visible copy in `index.html` (existing English fallback text inside `section__label` h2s is the established exception; follow it only there).
- No inline `<script>` (except the existing JSON-LD block) and no inline `style=""`.
- No new frameworks, bundlers, build steps, popups, sticky bars, or countdown mechanics.
- `en.json` and `tr.json` must always have identical key sets.
- All copy in this plan is final wording approved by the user; do not rephrase during implementation.
- Booking URL (single source: already in `index.html` contact section): `https://calendar.proton.me/bookings#-P9VzWmJxO3FHJPeV9sXe2qVUXfIPvD3Ni4K6wH2R_I=`
- Commits follow Conventional Commits. Repo has a pre-commit gate; never bypass it.
- Working directory: repo root of `alkindilabs/website`. Branch: `main`. Do not push until the final task.

## Shared Verification Commands

Referenced by name in tasks. Run from repo root.

**V1 — JSON parity:**
```bash
python3 -c "
import json
en=json.load(open('content/en.json')); tr=json.load(open('content/tr.json'))
diff=set(en)^set(tr)
assert not diff, sorted(diff)
print('keys match:', len(en))
"
```

**V2 — HTML/dictionary coverage (fails if HTML references a missing key; prints dictionary keys no longer referenced, which must be empty unless the task says otherwise):**
```bash
python3 -c "
import json,re
en=json.load(open('content/en.json'))
html=open('index.html').read()
keys=set(re.findall(r'data-i18n(?:-aria)?=\"([^\"]+)\"', html))
missing=keys-set(en)
assert not missing, sorted(missing)
print('unused dict keys:', sorted(set(en)-keys))
"
```

**V3 — static server smoke (server must already run: `python3 -m http.server 4173`):**
```bash
for p in / /styles/fonts.css /styles/main.css /styles/noscript.css /scripts/site.js /content/en.json /content/tr.json /robots.txt /sitemap.xml /llms.txt /llms-full.txt; do
  echo "$p $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4173$p)"
done
```
Expected: every line ends in `200`.

---

### Task 1: Regroup and renumber services

**Files:**
- Modify: `index.html` (services section, lines ~142-218; JSON-LD `knowsAbout`, lines ~80-91)
- Modify: `content/en.json`, `content/tr.json` (services.NN.* keys, group label keys)
- Modify: `styles/main.css` (add `.service-group` styles after `.service-item__desc` block, ~line 594)

**Interfaces:**
- Produces: keys `services.group.onchain`, `services.group.product`, `services.group.also`; renumbered `services.NN.title|desc` where new numbering is: 01 Smart Contract Development (old 09), 02 Smart Contract Audits (old 10), 03 Technical Advisory (old 08), 04 Brand & Visual Identity (old 01), 05 Copywriting (old 02), 06 Web Design (old 03), 07 Graphics & Digital Art (old 04), 08 User Experience Design (old 05), 09 User Interface Design (old 06), 10 Web App Development (old 07), 11 Hi-Fi Listening Rooms (unchanged). Classes `.service-group`, `.service-group__label`. Task 3 inserts a CTA after the first `.service-group`.

- [ ] **Step 1: Renumber both dictionaries.** In `content/en.json` and `content/tr.json`, reorder and renumber the `services.NN.*` entries per the mapping above. Title/desc strings move verbatim; only key numbers change. Insert the three group-label keys directly after `services.lead`:

`en.json`:
```json
"services.group.onchain": "Onchain Engineering",
"services.group.product": "Product & Design",
"services.group.also": "Also",
```

`tr.json`:
```json
"services.group.onchain": "Zincir Üstü Mühendislik",
"services.group.product": "Ürün ve Tasarım",
"services.group.also": "Ayrıca",
```

- [ ] **Step 2: Restructure the services markup.** In `index.html`, replace the single `<ul class="service-list">…</ul>` with three groups. Item markup shape is unchanged except titles demote from `<h3>` to `<h4>` (group labels take the h3 slot; all styling is class-based). Reveal delays restart within each group. Full structure:

```html
<div class="service-group reveal">
  <h3 class="service-group__label" data-i18n="services.group.onchain"></h3>
  <ul class="service-list">
    <li class="service-item reveal reveal-delay-1">
      <span class="service-item__index">01</span>
      <h4 class="service-item__title" data-i18n="services.01.title"></h4>
      <p class="service-item__desc" data-i18n="services.01.desc"></p>
    </li>
    <!-- 02, 03 identical shape, reveal-delay-2, reveal-delay-3 -->
  </ul>
</div>

<div class="service-group reveal">
  <h3 class="service-group__label" data-i18n="services.group.product"></h3>
  <ul class="service-list">
    <!-- 04..10, reveal-delay-1 .. reveal-delay-7 -->
  </ul>
</div>

<div class="service-group reveal">
  <h3 class="service-group__label" data-i18n="services.group.also"></h3>
  <ul class="service-list">
    <!-- 11, reveal-delay-1 -->
  </ul>
</div>
```

- [ ] **Step 3: Update JSON-LD.** In the `<head>` JSON-LD block, reorder `knowsAbout` to the new service order (Smart Contract Development first, ending with Technical Advisory then the design items per new numbering; keep it a flat list of the same strings, plus none added or removed).

- [ ] **Step 4: Add group styles.** In `styles/main.css`, after the `.service-item__desc` rule:

```css
.service-group + .service-group {
  margin-block-start: var(--space-2xl);
}

.service-group__label {
  font-size: var(--t-xs);
  font-weight: 400;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: var(--text-on-dark-muted);
  margin-block-end: var(--space-sm);
}
```

- [ ] **Step 5: Check for h3 assumptions.** Run `grep -n "service-item h3\|service-item__title" styles/main.css styles/noscript.css scripts/site.js`. All hits must be class selectors, not element selectors; if any element selector targets `h3` inside services, update it to the class.

- [ ] **Step 6: Verify.** Run V1 (expect `keys match:` with count = previous 64 + 3 = 67), V2 (expect no missing, `unused dict keys: []`), V3 (all 200).

- [ ] **Step 7: Commit.**
```bash
git add index.html content/en.json content/tr.json styles/main.css
git commit -m "feat(services): group services with onchain engineering first"
```

---

### Task 2: Work section and nav link

**Files:**
- Modify: `index.html` (new `#work` section between hero and `#services`; nav link before Services)
- Modify: `content/en.json`, `content/tr.json` (nav.work, work.* keys)
- Modify: `styles/main.css` (`.work*` styles, placed before the Services block ~line 532)

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `#work` anchor; keys `nav.work`, `work.label`, `work.lead`, `work.01.client|role|desc|status`, `work.02.client|role|desc|status`; classes `.work__top`, `.work__lead`, `.work-list`, `.work-item`, `.work-item__client|role|desc|status`. Task 3 appends a CTA inside `#work`'s container.

- [ ] **Step 1: Add dictionary entries.** Insert after `nav.services` (nav key) and after `hero.cta` (work.* block) respectively.

`en.json`:
```json
"nav.work": "Work",
```
```json
"work.label": "Selected Work",
"work.lead": "Systems in production, holding real value.",
"work.01.client": "Golem Foundation",
"work.01.role": "Smart contract solution, design through deployment",
"work.01.desc": "A smart contract solution for the foundation behind the Golem protocol: designed, implemented, tested, and deployed by the studio. One accountable hand from specification to mainnet.",
"work.01.status": "Deployed to mainnet",
"work.02.client": "Kleros",
"work.02.role": "Smart contracts and fullstack implementation",
"work.02.desc": "A smart contract solution for the decentralized dispute resolution protocol, designed, implemented, tested, and deployed, together with the fullstack application around it: from contract storage layout to the interface users touch.",
"work.02.status": "Deployed to mainnet",
```

`tr.json`:
```json
"nav.work": "İşler",
```
```json
"work.label": "Seçili İşler",
"work.lead": "Üretimde çalışan, gerçek değer taşıyan sistemler.",
"work.01.client": "Golem Foundation",
"work.01.role": "Akıllı sözleşme çözümü, tasarımdan dağıtıma",
"work.01.desc": "Golem protokolünün arkasındaki vakıf için bir akıllı sözleşme çözümü: stüdyo tarafından tasarlandı, geliştirildi, test edildi ve dağıtıldı. Şartnameden mainnet'e tek sorumlu el.",
"work.01.status": "Mainnet'te yayında",
"work.02.client": "Kleros",
"work.02.role": "Akıllı sözleşmeler ve fullstack geliştirme",
"work.02.desc": "Merkeziyetsiz uyuşmazlık çözümü protokolü için bir akıllı sözleşme çözümü: tasarlandı, geliştirildi, test edildi ve dağıtıldı; çevresindeki fullstack uygulamayla birlikte, sözleşme depolama düzeninden kullanıcının dokunduğu arayüze kadar.",
"work.02.status": "Mainnet'te yayında",
```

- [ ] **Step 2: Add the section markup.** In `index.html`, insert as the first child of `<main>`, before `#services`:

```html
<section id="work" class="section-gap">
  <div class="container">
    <div class="work__top reveal">
      <h2 class="section__label" data-i18n="work.label">Selected Work</h2>
      <p class="work__lead" data-i18n="work.lead"></p>
    </div>
    <ul class="work-list">

      <li class="work-item reveal reveal-delay-1">
        <span class="work-item__client" data-i18n="work.01.client"></span>
        <h3 class="work-item__role" data-i18n="work.01.role"></h3>
        <p class="work-item__desc" data-i18n="work.01.desc"></p>
        <span class="work-item__status" data-i18n="work.01.status"></span>
      </li>

      <li class="work-item reveal reveal-delay-2">
        <span class="work-item__client" data-i18n="work.02.client"></span>
        <h3 class="work-item__role" data-i18n="work.02.role"></h3>
        <p class="work-item__desc" data-i18n="work.02.desc"></p>
        <span class="work-item__status" data-i18n="work.02.status"></span>
      </li>

    </ul>
  </div>
</section>
```

- [ ] **Step 3: Add the nav link.** In the header nav `<ul class="nav__links">`, insert before the Services item:

```html
<li><a href="#work" class="nav__link"><span class="nav__arrow">→</span><span data-i18n="nav.work"></span></a></li>
```

- [ ] **Step 4: Add styles.** In `styles/main.css`, immediately before the `/* Services */` comment block:

```css
/* Selected work */

#work {
  background-color: transparent;
  color: var(--color-dark-fg);
}

.work__top {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  margin-block-end: var(--space-2xl);
}

.work__lead {
  font-size: var(--t-xl);
  line-height: var(--leading-snug);
  letter-spacing: var(--tracking-tight);
  max-width: 38ch;
}

.work-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.work-item {
  display: grid;
  gap: 0.3rem;
  padding-block: var(--space-xl);
}

.work-item__client {
  font-size: var(--t-xs);
  color: var(--color-accent);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
}

.work-item__role {
  font-size: var(--t-lg);
  font-weight: 400;
  line-height: var(--leading-snug);
}

.work-item__desc {
  font-size: var(--t-sm);
  color: var(--text-on-dark-muted);
  line-height: var(--leading-base);
  max-width: 56ch;
  margin-top: var(--space-sm);
}

.work-item__status {
  font-size: var(--t-xs);
  color: var(--text-on-dark-muted);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  margin-top: var(--space-sm);
}
```

- [ ] **Step 5: Verify.** Run V1 (expect 67 + 11 = 78), V2 (no missing, unused empty), V3 (all 200). Also `curl -s http://127.0.0.1:4173/ | grep -c 'id="work"'` → `1`.

- [ ] **Step 6: Commit.**
```bash
git add index.html content/en.json content/tr.json styles/main.css
git commit -m "feat(work): add selected work section with Golem Foundation and Kleros"
```

---

### Task 3: Inline CTA element at decision points

**Files:**
- Modify: `index.html` (contact CTA key swap; two new inline CTAs)
- Modify: `content/en.json`, `content/tr.json` (rename `contact.cta.primary` → `cta.book`)
- Modify: `styles/main.css` (`.cta-inline` styles, after `.work-item__status` block from Task 2)

**Interfaces:**
- Consumes: `#work` container (Task 2), first `.service-group` (Task 1).
- Produces: key `cta.book` (replaces `contact.cta.primary`; the string moves verbatim, single source of truth for the booking label); class `.cta-inline`.

- [ ] **Step 1: Rename the key.** In both dictionaries, rename `contact.cta.primary` to `cta.book` (values unchanged: EN "Book a free consultation", TR "Ücretsiz danışmanlık al"). Move it next to `hero.cta` so shared keys sit together. In `index.html`, update the contact section's primary link: `data-i18n="contact.cta.primary"` → `data-i18n="cta.book"`.

- [ ] **Step 2: Insert the two inline CTAs.** Same element in both places:

Inside `#work`, after `</ul>` and before `</div>` (container):
```html
<a href="https://calendar.proton.me/bookings#-P9VzWmJxO3FHJPeV9sXe2qVUXfIPvD3Ni4K6wH2R_I=" class="cta-inline reveal reveal-delay-3" data-i18n="cta.book" target="_blank" rel="noopener"></a>
```

Inside `#services`, immediately after the closing `</div>` of the first `.service-group` (Onchain Engineering), same markup but `reveal-delay-4`.

- [ ] **Step 3: Add styles.** In `styles/main.css`, after the `.work-item__status` rule:

```css
.cta-inline {
  display: inline-block;
  margin-block-start: var(--space-lg);
  font-size: var(--t-base);
  color: var(--color-dark-fg);
  text-decoration: underline;
  text-decoration-color: var(--decoration-on-dark);
  text-underline-offset: 0.2em;
  transition: color 0.15s ease, text-decoration-color 0.15s ease;
}

.cta-inline:hover {
  color: var(--color-accent);
  text-decoration-color: rgba(252, 187, 30, 0.4);
}
```

- [ ] **Step 4: Verify.** Run V1 (still 78), V2 (no missing; unused empty — confirms no orphaned `contact.cta.primary`), V3. Also `curl -s http://127.0.0.1:4173/ | grep -c 'cta-inline'` → `2`, and `grep -c 'calendar.proton.me' index.html` → `3`.

- [ ] **Step 5: Commit.**
```bash
git add index.html content/en.json content/tr.json styles/main.css
git commit -m "feat(cta): repeat booking CTA after work and onchain sections"
```

---

### Task 4: Copy shifts (buyer-oriented rewrites)

**Files:**
- Modify: `content/en.json`, `content/tr.json` only. No HTML/CSS/JS changes.

**Interfaces:**
- Consumes: keys existing since Task 1. Produces: no new keys; four values change per language. Hero keys untouched.

- [ ] **Step 1: Apply the four rewrites in `en.json`.**

```json
"services.lead": "Contracts that hold value can't be almost right. We build to that standard, onchain and off.",
```
```json
"about.body2": "We're not chasing trends. Most of our decade was spent where mistakes are expensive: production software and Ethereum protocol work. We bring that posture to everything we build.",
```
```json
"origin.body3": "Eleven centuries later, his work on ciphers is the foundation of every smart contract we deploy, and his habit is our method: assume any system can be broken, then prove where. We borrowed the name in tribute.",
```
```json
"contact.heading": "Launching a protocol, shipping contracts that will hold real value, or building the product around them?",
```

- [ ] **Step 2: Apply the mirrors in `tr.json`.**

```json
"services.lead": "Değer taşıyan sözleşmeler 'neredeyse doğru' olamaz. Zincir üstünde ve dışında, bu standarda göre üretiyoruz.",
```
```json
"about.body2": "Trendlerin peşinde değiliz. On yılımızın çoğu hataların pahalı olduğu yerlerde geçti: üretim yazılımı ve Ethereum protokol çalışmaları. Bu duruşu inşa ettiğimiz her şeye taşıyoruz.",
```
```json
"origin.body3": "On bir yüzyıl sonra, şifreler üzerine yaptığı çalışma, deploy ettiğimiz her akıllı sözleşmenin temelinde duruyor; yöntemimiz de onun alışkanlığı: her sistemin kırılabileceğini varsay, sonra nerede kırılacağını kanıtla. Adı saygıyla ödünç aldık.",
```
```json
"contact.heading": "Bir protokol mü başlatıyorsunuz, gerçek değer taşıyacak sözleşmeler mi yayınlıyorsunuz, yoksa etrafındaki ürünü mü inşa ediyorsunuz?",
```

- [ ] **Step 3: Verify.** Run V1 (78), V2, V3. Confirm hero keys unchanged: `git diff HEAD -- content/en.json | grep 'hero\.'` → empty.

- [ ] **Step 4: Commit.**
```bash
git add content/en.json content/tr.json
git commit -m "feat(copy): reorient services, about, origin, and contact copy to protocol buyers"
```

---

### Task 5: Crawler mirrors, full verification, push

**Files:**
- Modify: `llms.txt`, `llms-full.txt`, `sitemap.xml`

**Interfaces:**
- Consumes: final EN copy from Tasks 1-4. Produces: nothing downstream; this is the release task.

- [ ] **Step 1: Update `llms.txt`.** Reorder the Services bullet list to the new numbering (Smart Contract Development, Smart Contract Audits, Technical Advisory, Brand & Visual Identity, Copywriting, Web Design, Graphics & Digital Art, User Experience Design, User Interface Design, Web App Development, Hi-Fi Listening Rooms; descriptions move verbatim). Insert a Work section between the intro and `## Services`:

```
## Selected Work

- [Golem Foundation](https://www.alkindi.pt/#work): Smart contract solution, design through deployment. Deployed to mainnet.
- [Kleros](https://www.alkindi.pt/#work): Smart contracts and fullstack implementation. Deployed to mainnet.
```

Add to the `## Links` list, before About: `- [Selected Work](https://www.alkindi.pt/#work)`.

- [ ] **Step 2: Update `llms-full.txt`.** Renumber/reorder the `### NN.` service sections to the new order. Insert before `## Services`:

```
## Selected Work

### Golem Foundation

A smart contract solution for the foundation behind the Golem protocol: designed, implemented, tested, and deployed by the studio. One accountable hand from specification to mainnet.

### Kleros

A smart contract solution for the decentralized dispute resolution protocol, designed, implemented, tested, and deployed, together with the fullstack application around it: from contract storage layout to the interface users touch.
```

Update the Services intro line and the Contact paragraph to mirror the new `services.lead` and `contact.heading` EN strings from Task 4 (prose form, same wording).

- [ ] **Step 3: Bump sitemap.** In `sitemap.xml`, set `<lastmod>` to the current date.

- [ ] **Step 4: Full verification.** Run V1, V2, V3. Then browser sanity check per repo contract: header behavior, reveal animations in `#work` and grouped `#services`, nav anchors (`#work` scrolls correctly), language switch EN↔TR renders every new key, all three booking links open the Proton calendar. If no browser tooling is available, state that explicitly to the user instead of claiming it passed.

- [ ] **Step 5: Commit and push.**
```bash
git add llms.txt llms-full.txt sitemap.xml
git commit -m "chore(crawlers): mirror work section and regrouped services"
git log origin/main..HEAD --oneline
git push origin main
```

---

## Self-Review Notes

- Spec coverage: section order (T2 places `#work` between hero and services), work section (T2), regrouping/renumbering (T1), copy shifts incl. origin connective sentence (T4), CTA repetition with single `cta.book` key (T3), crawler mirrors + sitemap + JSON-LD (T1, T5), JS untouched throughout. Out-of-scope items untouched.
- No test framework exists and none is added; V1/V2 are executable checks that fail loudly (assert) and are run per task.
- Key counts: 64 → 67 (T1) → 78 (T2, +11) → 78 (T3 rename, T4 values only).
