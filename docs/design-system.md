# Design System — হৈচৈ (Hoichoi)

> **Reference site:** [01a07a14-9b8a-7776-9318-bea715f50b3d.arena.site](https://01a07a14-9b8a-7776-9318-bea715f50b3d.arena.site/) — a Bangla news aggregator mockup the user pointed to as the design direction. Read this document before building any UI.

The visual goal: a Bangla newspaper that feels both traditional (serif headlines, cream paper, red masthead) and modern (monospace UI labels, live system stats, scrolling marquees). Editorial weight, technical confidence.

**Project positioning:** viral-content ephemeral snapshot. Content appears, trends, then disappears after 7 days. The platform is a rolling mirror, not a permanent store.

---

## 1. Brand

- **Site name (Bangla):** হৈচৈ
- **Site name (English subtitle):** Hoichoi / Auto-Curated News Desk
- **Wordmark:** giant Noto Serif Bengali "হৈচৈ" followed by a red dot "।" in alizarin (the dot is the period, in red — like a newspaper's lead mark)
- **Tagline (primary):** "ভাইরাল বাংলা, সপ্তাহখানেক" (Viral Bangla, for a week)
- **Tagline (secondary, on masthead):** "ফেসবুক ফিড → স্ক্রিনশট আর্কাইভ → ডুপ্লিকেট যাচাই → বাংলা পুনর্লিখন — সাত দিন পর গায়েব" (Facebook feed → screenshot → dedup → Bangla rewrite — gone after 7 days)
- **Subtitle on /admin:** "AUTONOMOUS NEWS DESK"
- **ISSN-style code:** "ISSN-AUTO-24" (in the top bar, monospace, uppercase, tracked)
- **Build tag:** appears in the top bar — use a real version tag (e.g., "v1.0 · LAUNCH") in production

---

## 2. Color tokens

Define in `tailwind.config.ts` (or `globals.css` for the app):

```
--paper          #f3eee1     /* cream paper background */
--paper-deep     #e8e0cd     /* deeper cream, for image frames / contrast */
--ink            #0a0c10     /* near-black, headlines & body */
--ink-soft       #4a4a4a     /* muted ink, secondary text */
--ink-soft/80    rgba(74,74,74,0.8)  /* captions, photo credits */
--ink-soft/55    rgba(74,74,74,0.55) /* tertiary text */
--alizarin       #d2202c     /* the red — masthead dot, breaking banner, primary CTA hover, category "অপরাধ" dot */
--alizarin-deep  #a01820     /* deeper red, hover/pressed states */
--lime           #c8f65d     /* lime green — live indicators, "success" pings, "dedup" stats */
--amberx         #f5b800     /* amber — warnings, deduplication counters */
--blue           #2563eb     /* solid blue — "শিশু সুরক্ষা" (child protection) category badge */
--teal           #0d9488     /* teal — "পরিবার ও সমাজ" category */
--white-12       rgba(255,255,255,0.12)  /* dark surfaces */
--white-40       rgba(255,255,255,0.40)  /* dark surface secondary text */
--white-85       rgba(255,255,255,0.85)  /* dark surface body */
--border-ink     #0a0c10 / 0.12-0.25 opacity  /* semi-transparent ink borders */
```

**Usage rules:**
- The default page background is `bg-paper` (cream). This is the "newspaper" feel.
- The dark admin / monitor panels use `bg-ink` (near-black) with `text-paper` and lime accents.
- Red (`alizarin`) is reserved for: the wordmark dot, the breaking news banner, the primary CTA on hover, the "অপরাধ" (crime) category dot, the "ফ্যাক্ট-গেট পাশ" checkmark, and "পড়ুন →" link in cards.
- Lime is reserved for "live" / "success" indicators: the live status dot, "COLLECTED TODAY" count, "LAST RUN STATUS: SUCCESS".
- Amber is for the dedup counter ("DUPLICATES BLOCKED ৯") — signals "we blocked these, good job".

---

## 3. Typography

```
--font-serif-bn: 'Noto Serif Bengali', serif        /* display, headlines, masthead */
--font-sans-bn:  'Hind Siliguri', sans-serif         /* body, UI text in Bangla */
--font-sans:     'Space Grotesk', sans-serif         /* English UI labels */
--font-mono-x:   'JetBrains Mono', monospace         /* technical labels: hashes, tags, cron */
```

All four are free Google Fonts. Use `next/font/google` to self-host.

**Scale (in pixels, with `font-sans-bn` as the base):**

| Use | Size | Weight | Font |
|---|---|---|---|
| Wordmark (homepage) | 64–104px | 900 (black) | `font-serif-bn` |
| H1 (post title) | 30–42px | 800 (extrabold) | `font-serif-bn` |
| H2 (section) | 34–44px | 900 (black) | `font-serif-bn` |
| H3 (card title) | 18–22px | 800 (extrabold) | `font-serif-bn` |
| Body (post body, lede) | 15–16px | 400 (regular) | `font-sans-bn` |
| UI label (nav, button) | 11.5–13px | 500 (medium) | `font-sans-bn` for Bangla, `font-sans` for English |
| Caption (timestamps, photo credit) | 10.5–12px | 400 (regular) | `font-mono-x` for English codes, `font-sans-bn` for Bangla |
| Section label (uppercase, tracked) | 10–11px | 700 (bold) | `font-mono-x` |
| Stat number (live monitor) | 14–15px | 700 (bold) | `font-mono-x` |
| Category dot label | 10–11px | 500 (medium) | `font-sans-bn` |

**Tracking:**
- English uppercase labels: `tracking-[0.22em]` to `tracking-[0.26em]` (very wide)
- Section dividers and tags: `tracking-[0.14em]` to `tracking-[0.18em]`
- Bangla text: default tracking (no override)

---

## 4. Page layout — top to bottom on the homepage

### 4.1 Top fixed bar (`<header class="fixed inset-x-0 top-0 z-[60] h-10 ...">`)

A 40px-tall sticky bar with `bg-[#0a0c10]` (ink), 1px white/10 bottom border, white/85 text.

Three sections:
- **Left:** animated red ping dot + brand text "HOICHOI · AUTO-CURATED NEWS DESK" in `font-mono-x`, `text-[10px]`, `tracking-[0.22em]`, uppercase. The dot is `<span class="relative flex h-1.5 w-1.5"><span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-alizarin opacity-75"></span><span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-alizarin"></span></span>`.
- **Center:** nav pills, rounded-full, with icons (lucide `Newspaper`, `SquareTerminal`, `Network`). Active state: `bg-alizarin text-[#f3eee1]`. Inactive: `text-white/55 hover:bg-white/10 hover:text-white`.
- **Right:** `git-branch` icon + "→" + Vercel triangle + "AUTO-SHIP · EVERY 2H" — all in `font-mono-x`, `text-[10px]`, `tracking-[0.18em]`, uppercase, `text-white/35`. Hidden on mobile.

### 4.2 Breaking news ticker

Full-width, just below the top bar. Background is `bg-ink text-paper`. Layout:

- Left edge: `bg-alizarin` red panel with the `megaphone` lucide icon + bold "জরুরি আপডেট" label in `font-serif-bn`, `text-[12.5px]`, `font-bold tracking-wide`.
- Right side: scrolling headline track. Use CSS keyframe animation, `ticker-track` class. Each headline is preceded by a small red diamond `<span class="h-1 w-1 rotate-45 bg-alizarin"></span>` and rendered in `text-[13px] text-paper/85`. The track contains ~6 most-recent published post headlines, duplicated for seamless loop.

### 4.3 Masthead

Inside `<main>`, max-w-[1400px], padded. Three sub-sections:

- **Top thin line:** Bangla date "সোমবার, ৭ সেপ্টেম্বর, ২০২৬ · ঢাকা সংস্করণ" on left, "AUTONOMOUS NEWS DESK · ISSN-AUTO-24" in mono uppercase tracked on right (hidden on mobile), "মূল্য: অবৈতনিক" (Price: Free) on far right. All `text-[11.5px] font-medium text-ink-soft` with `border-b border-ink/20 pb-3`.

- **Center wordmark:** centered column with the giant "হৈচৈ" wordmark and red dot. The dot is colored `text-alizarin`, sized proportionally to the wordmark (1/1.6 ratio). Below the wordmark, a horizontal rule + tagline + horizontal rule: `<span class="h-px flex-1 bg-ink/25"></span>` flanking the tagline `<p class="text-[12px] font-medium tracking-wide text-ink-soft">ফেসবুক ফিড → স্ক্রিনশট আর্কাইভ → ডুপ্লিকেট যাচাই → বাংলা পুনর্লিখন — সাত দিন পর গায়েব</p>`.

### 4.4 Hero section

`grid lg:grid-cols-12 gap-10 border-y-2 border-ink py-8 lg:py-10`. The lead story takes 8 cols, the sidebar takes 4.

**Lead story (col-span-8):**
- Top metadata row: category badge (rounded-none, `text-[11.5px] font-bold text-white`, background color depends on category) + " · প্রধান সংবাদ" (top story). Then `map-pin` icon + location (e.g., "ঢাকা · মিরপুর"). Then `SYNCED ০৩:৪২ AM` in `font-mono-x text-[10.5px] tracking-[0.12em] uppercase text-ink-soft`.
- Headline (`<h2 class="font-serif-bn text-[30px] leading-[1.3] font-extrabold text-ink md:text-[42px] md:leading-[1.28]">`) with `link-sweep` hover effect (underline sweep on hover, custom CSS).
- Lede paragraph: `text-[15px] leading-relaxed text-ink-soft`, max-w-2xl.
- CTA row: black button "পুরোটা পড়ুন →" (`bg-ink px-5 py-2.5 text-[13px] font-bold text-paper hover:bg-alizarin` with `arrow-right` icon that translates 4px on group hover). Beside it, two small pieces of metadata: the post hash (`# a1f3c9e2d4b78056`) and read time ("৪ মিনিট পড়া"), both in `font-mono-x text-[10.5px] text-ink-soft` with their lucide icons (`hash`, `timer`).
- Hero image: `aspect-[16/8.2] overflow-hidden bg-paper-deep`, with `photo-grade` class (subtle filter: `contrast(1.02) saturate(0.95) brightness(0.98)`). Overlay badge in the bottom-right corner: `absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-ink/80 px-3 py-1.5 font-mono-x text-[9.5px] tracking-[0.16em] text-paper uppercase backdrop-blur-sm` with `rss` icon + "SOURCE · FACEBOOK ARCHIVE".
- Caption below the image: two small text rows separated by justify-between. Left: "ছবি: <photographer/source> · <location> · প্রতীকী" (the last word "প্রতীকী" = "representative image" — clarifies it's not the actual event photo). Right: "SHOT_0001.PNG · PLAYWRIGHT CAPTURE" in `font-mono-x tracking-wide`. Style: `text-[10.5px] text-ink-soft/80`.

**Sidebar (col-span-4):**
- On lg+: `lg:border-l lg:border-ink/15 lg:pl-8`.
- **Live Desk Monitor panel:** `bg-ink p-6 text-paper`. Title: `font-mono-x text-[10px] tracking-[0.24em] text-lime uppercase` with `activity` icon + "ডেস্ক মনিটর · লাইভ".
- **Circular countdown to next sync:** 92x92 SVG circle, 41px radius, `stroke="rgba(255,255,255,0.12)"` background ring + `stroke="#c8f65d"` (lime) progress ring with `stroke-dasharray` and `stroke-dashoffset` computed to show time-to-next-sync. Center: `font-mono-x leading-none font-bold text-[15px]` showing "০১:১৬:৩৪" (HH:MM:SS), with "NEXT SYNC" label below in `text-[8px] tracking-[0.2em] uppercase text-white/45`.
- **Next to the circle (hidden on mobile):** "পরবর্তী স্বয়ংক্রিয় রান" label + "১২:১৬ PM (ঢাকা)" time + "cron: 0 */2 * * *" in `font-mono-x text-[9.5px] text-white/40`.
- **Stats grid:** below the circle, `mt-6 space-y-3 border-t border-white/12 pt-5 font-mono-x text-[11px]`. Four rows: "COLLECTED TODAY [value] DUPLICATES BLOCKED [value] DEDUP RATE [value] LAST RUN STATUS [● lime dot] SUCCESS". Values right-aligned, lime for "good" stats, amber for "warning" stats.
- **Most-read list:** below the monitor. `<p class="border-b-2 border-ink pb-2 font-serif-bn text-[17px] font-extrabold">সর্বাধিক পঠিত</p>`. List items: `divide-y divide-ink/12`, each item is a link with a giant outline number (1/2/3) using `text-outline-ink` class (text with transparent fill, ink-colored stroke) in `font-serif-bn text-3xl leading-none font-black` + headline `font-serif-bn text-[15.5px] leading-snug font-bold` + below it a small `text-[10.5px] text-ink-soft` line: a colored dot (matching category) + category name + "·" + relative time like "৮ ঘণ্টা আগে".

### 4.5 Category marquee

Full-width band between the hero and the post grid. `border-b border-ink/15 py-6 select-none`. Inside: a horizontally scrolling marquee using `marquee-outline` CSS animation, containing giant serif category names separated by red `✳` glyphs. Mix of `text-outline-ink` (stroke-only, transparent fill) and `text-ink/85` (solid, slightly muted). Sizes `text-[44px] md:text-[64px] font-serif-bn font-black leading-none`.

### 4.6 Today's Collection

`mx-auto max-w-[1400px] px-4 py-14 md:px-8 md:py-18`.

- **Header row:** left has small mono uppercase tracked "▚ TODAY'S COLLECTION · AUTO-CURATED" in `text-alizarin` + giant `font-serif-bn text-[34px] md:text-[44px] font-black` headline "আজকের সংগ্রহ". Right: a `max-w-sm text-[12.5px] leading-relaxed text-ink-soft` paragraph: "প্রতিটি আইটেম ফেসবুক থেকে সংগৃহীত, হ্যাশ-ফিঙ্গারপ্রিন্টে ডুপ্লিকেট যাচাই সম্পন্ন এবং বাংলা সম্পাদকীয় শৈলীতে পুনর্লিখিত।"
- **Filter row:** horizontal flex of `rounded-full border px-4 py-1.5 text-[12.5px] font-medium` pills. Active: `border-ink bg-ink text-paper`. Inactive: `border-ink/25 text-ink-soft hover:border-ink hover:text-ink`. Each pill has the category name + a small `font-mono-x text-[10px] opacity-70` count. Far right: a mono uppercase tracked "FILTER · AUTO-CATEGORIZED BY LLM" in `text-ink-soft/70`.
- **Post grid:** `grid grid-pop mt-10 grid gap-x-8 gap-y-14 sm:grid-cols-2 xl:grid-cols-3`. Each card:
  - Image: `relative overflow-hidden border-[1.5px] border-ink` with `aspect-[16/8.2] bg-paper-deep` and `photo-grade` filter. A `frame-press` hover effect (slight inward shadow on hover).
  - Top-left badge: category label, same color coding as hero. `absolute top-3 left-3`.
  - Top-right corner: `font-mono-x text-[10px] text-white/25` overlay showing the post hash (e.g., "0১") — this is the screenshot frame number, ties visually to the audit reference.
  - Body below the image: `mt-4`. Category label in `text-[11px] font-bold uppercase tracking-wide` in the category color. Headline in `font-serif-bn text-[17px] leading-snug font-extrabold` with `link-sweep` hover. Lede in `text-[13.5px] leading-relaxed text-ink-soft line-clamp-3`. Meta row at the bottom: relative time + source page name + read time, all `text-[11px] text-ink-soft/80`.
  - Hover: the whole card lifts slightly (`-translate-y-1` on group hover) and the headline underline sweeps in.

### 4.7 Pipeline diagram

`bg-ink text-paper` panel, inside the homepage below the post grid (and a key section on `/system`). Shows the 6-step pipeline as a connected row of cards:

1. **ফেসবুক সোর্স** — icon: `users` (lucide), subtitle: "WATCHLIST · PAGES/GROUPS"
2. **ডেস্কটপ কালেক্টর** — icon: `app-window`, subtitle: "TAURI · PLAYWRIGHT SHOT"
3. **ডুপ্লিকেট ইঞ্জিন** — icon: `fingerprint-pattern`, subtitle: "SHA256 + SIMHASH"
4. **এআই পুনর্লিখন** — icon: `sparkles`, subtitle: "BENGALI STYLE LLM"
5. **GitHub কমিট** — icon: `git-branch`, subtitle: "JSON + MEDIA · CI"
6. **Vercel লাইভ** — icon: `triangle` (filled), subtitle: "AUTO DEPLOY · ISR"

Each card: `border border-white/12 bg-white/[0.04] p-5`, hover `border-lime/60 bg-white/[0.07]`. Icon in `text-lime`, 20px, on top. Title in `font-serif-bn text-[15.5px] font-bold mt-4`. Subtitle in `font-mono-x text-[9px] tracking-[0.14em] text-white/40 mt-1.5`. Top-right: step number "০১" / "০২" etc. in `font-mono-x text-[10px] text-white/25`. Between cards: a thin horizontal lime line (`h-px w-4 bg-lime/70`) that appears on `md+`.

Below the row, two "gate" badges centered:
- **ফ্যাক্ট-গেট যাচাই** (Fact-gate check) — lucide `shield-check`, color `text-alizarin`, badge: `border-ink/30 bg-paper text-ink px-3 py-1 text-[10.5px] font-semibold rounded-full`
- **হ্যাশ মিলানো** (Hash match) — same style
- **শৈলী পুনর্লিখন** (Style rewrite) — same style
Plus a final red alizarin circle with a `move-right` arrow, indicating "to publish".

### 4.8 Footer

`border-t-2 border-ink mt-16`. Inside `mx-auto max-w-[1400px] px-4 py-12 md:px-8`, 12-col grid:
- **Col 1-5 (md:col-span-5):** giant wordmark "হৈচৈ" + red dot, `font-serif-bn text-[34px] leading-none font-black`. Below: a `max-w-xs text-[12.5px] leading-relaxed text-ink-soft` paragraph describing the platform.
- **Col 6-8 (md:col-span-3):** "বিভাগসমূহ" (Categories) label in `font-mono-x text-[10px] tracking-[0.24em] uppercase text-ink-soft`. Below, a `space-y-2.5 text-[13px] font-medium` list of category names, each preceded by a small red diamond `<span class="h-1 w-1 rotate-45 bg-alizarin"></span>`.
- **Col 9-12 (md:col-span-4):** "সিস্টেম মানচিত্র" (System map) label. Two pill buttons: "অ্যাডমিন কনসোল →" and "সিস্টেম ব্লুপ্রিন্ট →", both `border border-ink/30 px-4 py-2 text-[12px] font-bold hover:border-ink hover:bg-ink hover:text-paper`. Below: a `text-[10.5px] leading-relaxed text-ink-soft/80` note about photo credits and the fact that this is a mockup/demo (in production: replace with a real disclaimer + photo source attribution policy).
- **Bottom strip:** `mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-ink/15 pt-6 font-mono-x text-[10px] tracking-[0.16em] text-ink-soft uppercase`. Left: "© 2026 HOICHOI DESK · v1.0 LAUNCH" (replace with real version). Right: lucide `earth` icon + "DHAKA · ASIA/UTC+6 · EDGE CACHE ON".

---

### 4.9 Desk scene — the dark console chrome (web `/desk` + Tauri desktop)

A second, darker visual system ("desk scene") is used by the admin shell, the
`/desk` preview route and the entire Tauri desktop app. It is the mockup's
`option-a` console palette. Dark values (light variants and all tokens live in
`apps/web/src/app/globals.css` desk-scene block, dark ~L490 / light ~L523, and
are mirrored in `apps/desktop/src/index.css`):

| Token | Dark value | Use |
|---|---|---|
| `--ds-titlebar` | `#12161e` | window titlebar |
| `--ds-menubar` / `--ds-side` | `#0e1219` | menubar, sidebar |
| `--ds-main` | `#0c1017` | console body / content area |
| `--ds-status` | `#0a0d12` | statusbar |
| `--ds-term` | `#07090d` | log terminal |
| `--ds-field` | `#0a0c10` | inputs, table fields |
| `--ds-acc` | `#c8f65d` (lime) | accent — active tab underline, live ping, sync highlight |
| `--ds-amber` | `#ffb454` | warnings / dedup counts |
| `--ds-rose` | `#fb7185` | errors / destructive |
| `--ds-sky` | `#7dd3fc` | info / links |
| `--ds-t1 … --ds-t6` | `#fff` → `rgba(255,255,255,.25)` | text emphasis ladder |
| `--ds-active` / `--ds-active-tx` | `#ffffff` / `#0a0c10` | active pill tab (ink-on-white) |

The desktop port keeps equivalent names (`--titlebar #12161e`, `--win-2 #0e1219`,
`--win #0c1017`, `--statusbar #0a0d12`, accent = lime). Styling rules that carry
over: the faint `desk-scene` grid background, mono-uppercase tracked labels
(0.13–0.26em), `is-active` white pill tabs, and `scroll-slim` scrollbars per pane.
The desktop 8-tab console itself (Monitor … Ads, sync bar) is documented in
[`DESKTOP.md`](DESKTOP.md).

---

## 5. Component library (shadcn/ui + custom)

Use **shadcn/ui** as the base, but heavily restyle it with these tokens. Don't use shadcn's default grays — override `border`, `bg`, `text` to use the `ink/paper/alizarin` palette.

Custom components needed (in `apps/web/components/`):

| Component | Purpose |
|---|---|
| `<TopBar />` | The sticky 40px ink bar with brand + nav + auto-ship indicator |
| `<BreakingTicker headlines={...} />` | The red "জরুরি আপডেট" + scrolling headlines |
| `<Masthead date={...} />` | The Bangla date + ISSN strip + wordmark + tagline |
| `<HeroPostCard post={...} variant="lead" />` | The big lead-story layout |
| `<LiveDeskMonitor nextSync={...} stats={...} />` | The dark sidebar panel with countdown + stats |
| `<MostReadList items={...} />` | The numbered outline list |
| `<CategoryMarquee categories={...} />` | The scrolling giant category names |
| `<PostGrid posts={...} />` | The 3-col post card grid |
| `<PostCard post={...} />` | Single post card (used in grid + most-read) |
| `<PipelineDiagram />` | The 6-step flow diagram |
| `<Footer />` | The site footer with categories + system links |
| `<CategoryBadge category={...} />` | Color-coded category label |
| `<PhotoCaption source={...} photographer={...} location={...} />` | The "ছবি: X · Y · প্রতীকী" caption |
| `<HashTag postId={...} />` | The post hash display `# a1f3c9e2d4b78056` |
| `<ReadTime minutes={...} />` | "৪ মিনিট পড়া" |

---

## 6. The "/system" page (bonus, from the example)

A second top-level route (linked from the top bar) that shows a deeper, technical view of the system. Same dark+ink palette, more technical. Useful for transparency and showing how the system works.

Sections on `/system`:
1. **Pipeline diagram** (same as homepage but larger)
2. **6 detail cards** for each pipeline step, expanded with tech details (e.g., "ডুপ্লিকেট ইঞ্জিন" shows SHA256 + pHash + cosine sim, dedup rate, recent dup count)
3. **"প্রকাশিত সংস্করণ" (Published version)** mock card: a sample post rendered in the public-site style, with a "✓ FACT-GATE PASSED · ✓ ATTRIBUTE SAVED" footer in mono uppercase + "পড়ুন →" link. This is essentially a /post preview.
4. **Engineering log**: a list of recent `pipeline_runs` with status, stats, duration, in a monospace table.

---

## 7. Animations (subtle, editorial)

All animations should feel like a newspaper coming to life — not bouncy, not playful. Slow, considered, paper-like.

- **`ticker-track`**: linear infinite scroll, 60s for a full pass, no pause.
- **`marquee-outline`**: linear infinite scroll, 40s, opposite direction from the ticker for visual interest.
- **`animate-ping`** on the live status dot in the top bar.
- **`link-sweep`**: underline sweeps in from left on hover, 300ms ease-out.
- **`frame-press`**: hero image gets a 1.5px darker border + slight inward shadow on hover, 300ms.
- **Card hover**: `group-hover:-translate-y-1` on the post card, 300ms.
- **Category pill active transition**: `transition-all duration-300`.

Avoid: parallax, scroll-jacking, fade-in-on-scroll (the example site has some, but they feel slow on mobile), bouncy springs.

---

## 8. Mobile behavior

- Top bar: collapse to logo + hamburger menu. The "AUTO-SHIP · EVERY 2H" indicator is hidden on mobile.
- Breaking news ticker: keep full-width but reduce height.
- Masthead wordmark: scale down to 64px (from 104px on desktop).
- Hero: single column. Live monitor moves below the post grid (or above the most-read list).
- Post grid: 1 col on mobile, 2 on `sm:`, 3 on `xl:`.
- Pipeline diagram: stack vertically, hide the connecting lines between cards.
- Footer: stack the 3 columns.

Target Lighthouse mobile ≥ 90, desktop ≥ 95.

---

## 9. What to copy from the example site, what to change

**Copy directly:**
- Color palette and typography stack
- Top bar layout (brand + nav + auto-ship)
- Breaking news ticker style
- Masthead + wordmark with red dot
- Hero section structure (badge → headline → lede → CTA → image with caption)
- Live Desk Monitor sidebar (circular countdown + stats)
- Category marquee
- Post card structure (image → category → headline → lede → meta)
- Pipeline diagram (6 steps with lime connectors)
- Footer layout

**Change for production:**
- Replace "SYSTEM MOCKUP v2.4" with a real version tag or remove
- Replace "Pexels · 112 Uttar Pradesh · প্রতীকী" with real photo credits
- Replace the mockup disclaimer in the footer with a real editorial disclaimer (see `editorial-policy.md`)
- Replace `MOCKUP BUILD 2.4.1` with a real build / commit hash
- The "486 comments · 193 shares" fake numbers — drop these (we don't have comments anyway, see Phase 8.1 in the prompt)
- Replace "FACT-GATE PASSED" / "ATTRIBUTE SAVED" mocks with real per-post metadata

---

## 10. Open question to the user

The example site uses **broader categories** (অপরাধ, শিশু সুরক্ষা, পরিবার ও সমাজ, ভাইরাল ও তথ্য — 4 categories) than the **3 narrow ones we chose** (child-sexual-abuse, extramarital-crime, missing-children).

**Three options:**

1. **Keep the 3 narrow categories** (current). Pro: tight editorial scope, easier moderation, cleaner. Con: lower content volume per category, headlines like "নিখোঁজের ছয় ঘণ্টায়..." don't fit cleanly into any of the 3.

2. **Use the 4 broad categories** (from the example). Pro: more content fits naturally, broader audience, more SEO surface. Con: the most sensitive content (child sexual abuse specifically) is bundled with general child protection news, which makes the "double-approval" rule apply to more posts.

3. **Hybrid: 4 broad public categories + 1 sensitive sub-category.** E.g. show "শিশু সুরক্ষা" publicly (covering missing-children, child safety tips, abuse awareness), but the most sensitive posts (sexual abuse specifically) get tagged internally as `child-sexual-abuse` and routed to double-approval + content warning. The double-approval applies to a sub-segment, not the whole category. This is the most flexible.

I built option 1 into the prompt. If you want option 2 or 3, tell me and I'll restructure the schema and the editorial policy.

---

## 11. Post-mockup parity additions (latest batch)

Implemented in `apps/web` + `apps/desktop` (mockup = read-only new spec):

- **Home hero:** `.headline-grad` uses the mockup recipe — `padding 16px 20px → 25px 20px @md`, layered `headline-in` / `headline-shine` (background-position 120% → -120%) / `headline-glow` keyframes, with a `prefers-reduced-motion` reset. The hero chip reads "HOICHOI DATABASE". The `shine` keyframe (`background-position: -250%`) is shared with the AdSlot hover sheen (`bg-[length:250%_100%]`).
- **Home category strip:** `categoriesWithCounts()` powers a "বিভাগসমূহ" section after Live Analytics — chips link to `/category/{slug}` with a `CATEGORY_TINT` dot and the published-post count in `bnNum`. Only categories having at least one published, non-archived post are shown.
- **Rewrite slider:** FB-branded pill is hard-coded `#1877f2` (`bg-[#1877f2]`, not the `--color-fb` token whose dark theme flips to a pastel), the "A · কাঁচা ফিড" label is `mt-3`, and the band overlay is `p-8 md:p-12` (left panel matches so the clip seam lines up).
- **Reader report form:** the post page `ReportForm` mirrors the mockup — collapsed header + fields `reporterName`/`reporterEmail`/`reason`/`details`, validates the shared `REPORT_REASONS` list (`apps/web/src/lib/report-reasons.ts`), posts to `/api/reports`. Never shown publicly; only the admin queue renders it.
- **Comments section:** mockup parity — required email ("প্রকাশিত হয় না"), hidden `website` honeypot (server silently drops populated submissions with a 201), `৮০০`-char limit with live count, 10s polling + `visibilitychange` refresh (an `AbortController` + `retry` button on failure), `Array.from(author)[0]` avatar disc, "সম্পাদক অনুমোদিত" meta, and the "অনুমোদনের পর প্রকাশিত" pill. Comments keep the `/api/comments?postId=` endpoint; the DB gained a nullable `comments.email` column.
- **Dark data band:** `--color-band #1a140d` / `--color-bandline #f3eee1` (post "তথ্য শৃঙ্খলা" band and rewrite-slider band read in both themes); web `:root` and desktop dark `:root` both carry them.
- **Desktop `--ds-*` tokens:** `apps/desktop/src/index.css` aliases the desk console palette (`--ds-bg`, `--ds-panel`, `--ds-text`, `--ds-muted`, `--ds-border`, `--ds-ink`, `--ds-chip`, `--ds-watch`, `--ds-fb`) in both dark `:root` and `html[data-theme="light"]` so the Watchlist renders mockup-identical in either theme.
- **Watchlist parity:** add-row offers per-category chips + "সব বিভাগ" (stores `source_categories` junction through the runner CLI's `--categories`), sources render their category sub-chips, dead sources (health `0`) show a red TriangleAlert pill, and the header uses the same `--ds-*` density as the mockup desk.
- **Settings tabs:** `apps/desktop/src/screens/Settings.tsx` splits the long settings
  page into **10 pill tabs** (প্রেফারেন্স / সোর্স / বিভাগ / AI প্রোভাইডার / নোটিশ /
  ক্লাউড সিঙ্ক / সাইট ও বিজ্ঞাপন / অ্যাডমিন / ব্যাকআপ / API ভল্ট), styled by
  `.settings-tabs` in `apps/desktop/src/index.css` — a duplicate of the `.mtabs` pill
  recipe (rounded-full, active = `var(--active-bg)` background with `var(--active-tx)`
  ink-on-white text, mono-uppercase tracked labels) so tab switching matches the
  console chrome. The সোর্স / AI প্রোভাইডার / নোটিশ tabs embed the desk source /
  provider / notice managers; বিভাগ embeds the desk category manager. The সাইট ও
  বিজ্ঞাপন tab also hosts the ওয়েব ভিজিবিলিটি ও থিম toggle grid (`app_config_json`)
  — see `DESKTOP.md`.
- **Light-mode green/amber contrast:** the bright `--lime #c8f65d` / `--amberx #f5b800`
  accents are unreadable on cream `--paper`. Web's light `:root` re-tokens them to
  `#5f8f0e` / `#b45309` (`--color-lime` / `--color-amberx`; the bright values are
  restored under `html[data-theme="dark"]` and the dark bands); the desktop does the
  same via `.text-lime` / `.text-amberx` overrides in `apps/desktop/src/index.css`.
- **Visitor notifications:** `NotificationsBell` (TopBar dropdown of active notices)
  + `NoticeBanner` (pinned "special notice", above the masthead) use the shared tone
  tokens (`info|success|warn|alert`) from `@hoichoi/shared-types`; managed from
  `/admin/notices` (web) and the desk নোটিশ tab (desktop).
