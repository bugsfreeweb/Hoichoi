# হৈচৈ — Ad Platform Mockup

A faithful clone of **hoichoifeed.vercel.app** (home, post detail, category) with a
complete advertising layer on top: public rate card, client portal, admin ad-ops console.

---

## 1. What was cloned 1:1

Design tokens were lifted from the live stylesheet (`:root` block):

| token | value |
|---|---|
| `--color-paper` | `#f3eee1` |
| `--color-paper-deep` | `#e9e2cf` |
| `--color-ink` | `#1a140d` |
| `--color-ink-soft` | `#6b6250` |
| `--color-alizarin` | `#d2202c` |
| `--color-alizarin-deep` | `#a3121d` |
| `--color-lime` | `#5f8f0e` |
| `--color-amberx` | `#b45309` |
| `--color-night` | `#0a0c10` |
| `--color-band` / `--color-bandline` | `#1a140d` / `#f3eee1` |

Fonts: **Noto Serif Bengali** (`.font-serif-bn`) + **JetBrains Mono** (`.font-mono-x`).
Utilities reproduced: `.max-w-site` (1400px), `.bg-night-grid`, `.bg-band`, `.frame-press`,
`.link-sweep`, `.grid-pop`, `.ticker-track`, `.grain`, `.ad-chip`, `.ad-strip`.

### Page structure reproduced

**Home** — fixed `h-10` top bar → breaking ticker → `bg-night-grid` hero (`হৈচৈ!`) →
**ad** → live telemetry → **ad** → category rail → lead story → **ad** →
`bg-band` pipeline (6 steps) → raw-vs-rewritten → `#latest` grid (+ 2 in-feed **ads**) →
pagination → **ad strip** → footer.

**Post detail** — breadcrumb → centred headline block → **ad** → 7/5 body+aside grid →
in-article **ad** → sidebar **ads** → endcap **ad** → comments → related grid (+ **ad**).

---

## 2. Existing ad slots (cloned exactly)

These already exist on the live site; the markup here is byte-faithful.

| slot key | live markup |
|---|---|
| `home_hero_below` | `min-h-[90px]` dashed `border-ink/35`, `bg-paper-deep/40`, shine overlay, `ad-chip` হ, `bg-ink` CTA "স্পনসর হোন", top-right `বিজ্ঞাপন · AD` tag |
| `home_feed_1`, `home_feed_2` | `min-h-[280px]` `border-[1.5px] border-dashed border-ink/45`, `hover:-translate-y-1`, 12×12 chip |
| `home_prefooter_strip` | `.ad-strip` `bg-band`, `border-bandline/25`, `bg-lime` CTA, `AD` tag |
| `post_header_leaderboard` | same as hero-below, placed `mt-10` after the source link |
| `post_sidebar_rect` | `min-h-[250px]` `flex-col` dashed box in the aside |

## 3. New slots proposed (same design language)

`home_ticker_sponsor` (native, in the breaking bar) · `home_category_rail` (native chip) ·
`home_lead_sponsor` (native, under lead story) · `home_insights_below` (billboard) ·
`post_inarticle` (336×280 between paragraphs) · `post_sidebar_sticky` (300×600) ·
`post_endcap` (billboard) · `post_related_infeed` · `category_top_leaderboard` ·
`category_infeed` · `global_rail_right` (160×600) · `global_mobile_anchor` (320×60) ·
`global_footer_strip`.

**20 slots total.** Full registry: `src/lib/ads/slots.ts`.

---

## 4. Templates

`src/lib/ads/templates.ts` — **35 templates** across 17 categories
(product, missing child, election, sponsor, custom, public service, event, job,
real estate, education, health, finance, automotive, NGO/donation, government notice,
obituary, technology).

Coverage per format (requirement was ≥10):

```
leaderboard 35 · billboard 34 · rect 34 · infeed 34
sky 34 · strip 27 · anchor 27 · native 27
```

Each template = `{ kind, palette, formats[], premium, uplift, data }`.
20 render kinds live in `src/components/ads/Creative.tsx`; **10 palettes** in `PALETTES`.
One creative renders correctly in every format — the component reflows for
horizontal / box / tall footprints.

---

## 5. Pricing

`quotePrice(slotKey, days, uplift)` in `src/lib/ads/slots.ts`:

```
gross    = (slot.dayRate + template.uplift) × days
discount = gross × tier.off      // 1d 0% … 365d 50%
vat      = (gross − discount) × 15%
total    = gross − discount + vat
```

Day rates run ৳800 (footer strip) → ৳2,600 (post sticky half-page).

---

## 6. Auto-translate

`src/lib/ads/translate.ts` — 6 languages (bn, en, hi, ar, ur, ms; `dir` aware).
On save, `buildI18n()` writes a bundle into `creatives.i18n`; `serveSlot(slot, lang)`
picks the right variant. Swap `machineTranslate()` for Google/DeepL/Azure —
signature and caching stay identical (`TRANSLATE_API_KEY`, server-side only).

---

## 7. Serving logic

`serveSlot()` (`src/lib/ads/serve.ts`):

1. slot disabled in `slot_config` → render nothing
2. find `bookings` where `slot_key` matches, `status='active'`, `now` inside `[starts_at, ends_at]`
3. order by `priority DESC, id DESC` → winner
4. nothing found → the site's own **house ad** ("আপনার বিজ্ঞাপন এখানে")

Layout never shifts: `.ad-reserve-*` classes reserve each footprint.

---

## 8. Portals

### Client — `/portal`
dashboard (spend, impressions, CTR, live previews) · `/portal/book` 4-step wizard
(slot → template → palette/language → copy + live preview + live quote) ·
`/portal/pay/[id]` (bKash, Nagad, Rocket, card, PayPal, crypto, bank) ·
`/portal/bookings` · `/portal/creatives` (all 6 language variants side by side) ·
`/portal/payments`.

**Fully automatic:** payment captured → booking flips to `active` (or `scheduled`
if dated forward) → the creative appears on the public site immediately.

### Admin — `/admin/ads`
dashboard (occupancy board, revenue by slot, automation log) ·
`/admin/ads/slots` (enable/disable, reprice, see exactly what is rendering) ·
`/admin/ads/bookings` (status, priority, **manual booking composer** incl. free
public-service placements) · `/admin/ads/templates` (filter by format/category,
force palette, preview in any language, coverage meter) ·
`/admin/ads/clients` (approve/block, credit) · `/admin/ads/payments`
(settle cash/bank by hand) · `/admin/ads/activity` (AUTO vs MANUAL audit trail).

Everything the system does automatically, the admin can also do by hand —
every manual action is tagged `manual` and logged.

---

## 9. Public API

```
GET  /api/ads/serve                 → inventory snapshot (all 20 slots)
GET  /api/ads/serve?slot=…&lang=…   → the creative for one slot
POST /api/ads/event                 → { bookingId, slotKey, kind:"impression"|"click" }
```

---

## 10. Data model (`src/db/schema.ts`)

`advertisers` · `campaigns` · `creatives` (data + i18n) · `bookings` · `payments` ·
`slot_config` · `ad_events` · `activity`

```bash
npx drizzle-kit push
npx tsx src/db/seed.ts     # 5 accounts, 6 creatives, 11 bookings, payments, audit log
```

Demo accounts: `admin@hoichoi.example` (admin) · `tanvir@rang.example` (client session used by the portal).

---

## 11. Routes

```
/                        cloned home + 11 ad slots
/post/[slug]             cloned article + 10 ad slots
/category/[slug]         category listing + 4 ad slots
/advertise               public rate card, slot map, template gallery
/portal …                client portal
/admin/ads …             admin ad-ops console
/api/ads/serve|event     ad server
```

---

# v2 — Motion, Studio, Real-time, Analytics

## 12. Motion library (`globals.css` + `src/lib/ads/style.ts`)

**9 entrance** — `fade-up`, `fade-in`, `slide-left`, `slide-right`, `zoom-in`,
`flip-in`, `blur-in`, `pop`, none.
**7 idle loops** — `pulse`, `glow`, `float`, `shine` (sweep), `ken-burns`
(image pan/zoom), `ticker` (scroll), `shake` (attention).
Plus hover-lift, tunable duration (150–2000 ms).

All wrapped in `@media (prefers-reduced-motion: reduce)` → motion-sensitive readers
see a still ad. Chart animations: `drawLine`, `growBar`, `dashRing`, `countUp`.

## 13. Full creative customisation — `CreativeStyle`

| group | controls |
|---|---|
| **Colour** | bg, text, accent, accent-text, secondary, border — free colour pickers, plus 10 preset palettes, optional gradient with angle |
| **Font** | 8 families (Noto Serif Bengali, Noto Sans Bengali, JetBrains Mono, display, slab, hand, condensed, inherit) for heading + body independently |
| **Text style** | head size 10–44px, body 8–20px, weight 400–900, letter-spacing −0.05→0.30em, line-height 90–200%, uppercase/Title Case, italic, underline, left/center/right |
| **Frame** | 7 border styles, radius 0–28px, 6 shadows (incl. newsprint press offset), padding 4–40px, 5 textures (grain, halftone, lines, grid, newsprint) |
| **Image** | URL or sample, fit cover/contain/fill, **8 filters** (grayscale, sepia, duotone, bright, high-contrast, vintage, cool), zoom 100–200%, X/Y focal point, opacity, corner radius |
| **Motion** | entrance, idle loop, speed, hover-lift |

Stored in `creatives.style` (jsonb), resolved by `resolveStyle()` and applied
identically in the studio preview, the console previews and the public site.

## 14. Creative Studio — `/portal/studio` and `/admin/ads/studio`

Three-column live editor: controls (6 tabs) · animated stage · live quote.

- preview re-renders on **every keystroke / slider drag** — no save-refresh loop
- **device switcher** desktop / tablet / mobile (980 / 680 / 360 px)
- language chips re-render the preview through auto-translate, RTL aware
- slot + template switchers keep format compatibility automatically
- live quote panel: duration discount, VAT, **estimated impressions, CTR and CPM**
- style JSON panel for the dev handoff
- admin version adds a client selector and a "free public-service" toggle that
  publishes straight to `active` with priority 8

## 15. Real-time status

`GET /api/ads/status` (no-store) → slot fill, active/pending/review counts,
impressions, clicks, 3-day expiries, per-slot occupancy.

- **`<LiveBar />`** in both consoles — 5–6 s poll, `requestAnimationFrame`
  count-up animation on every metric, pulsing live dot, beat counter,
  pause/resume, and a per-slot chip grid (green = filled, grey = house ad)
- **`<AdPulse />`** on the public `/advertise` page — shows prospective
  advertisers how many slots are open right now

## 16. Analytics — `/admin/ads/analytics`, `/portal/analytics`

Chart kit (`src/components/charts/Charts.tsx`), pure SVG, zero dependencies:

`AreaChart` (multi-series, gradient fill, animated draw-on, hover tooltips) ·
`BarChart` (grow-up animation, peak highlight) · `DonutChart` (animated arcs +
legend with %) · `Sparkline` (per-row trend, red when declining) ·
`Heatmap` (7 days × 8 time buckets, hover zoom) · `Funnel` (6 stages with
step-over-step retention) · `RadialGauge` (half-ring KPI).

Admin sees: 14-day delivery, format mix, slot delivery, daily revenue,
conversion funnel, day×hour heatmap, revenue by payment method, top creatives
with sparklines, CTR / fill / viewability gauges, booking-status mix, category demand.

Client sees the same cut scoped to their own account, plus a plain-language
day-parting recommendation.

Metrics computed in `src/lib/ads/analytics.ts` from real booking rows; the
intra-day curve uses a seeded deterministic function so charts never flicker
between renders.

---

# v3 — Drag-and-drop builder, text variations, live analytics

## 17. Block layout engine (`src/lib/ads/blocks.ts`)

**23 draggable blocks**: badge, headline, sub, body, image, logo, price,
strikethrough, discount, coupon, cta, phone, divider, bullets, rows, countdown,
stats, ribbon, quote, tags, progress, spacer, custom HTML.

`BlockLayout` = `{ cols 1–4, gap, padding, align, valign, direction, blocks[] }`;
each `Block` carries `span`, per-block `align`, `size`, `weight`, `color`, `bg`,
`pad`, `radius`, `hidden` and a text `variant`.

Stored in `creatives.layout` (jsonb). When a layout exists it **overrides** the
fixed template renderer — `Creative` dispatches to `BlockCanvas`.

## 18. 16 text variations (`tv-*`)

Static: outline, hard-shadow, gradient-text, stamp, highlighter.
Animated: typewriter (with caret), marquee, ticker-loop, glitch (RGB split via
`data-text`), neon flicker, karaoke sweep, underline-draw, letter-by-letter,
flip-in, wave.

Per-character variants inject one `<span>` per glyph with staggered delays.
All honour `prefers-reduced-motion`.

## 19. Drag-and-drop builder — `/portal/builder`, `/admin/ads/builder`

- **Palette → canvas**: HTML5 drag-and-drop; double-click or Enter/Space also inserts (keyboard accessible)
- **Reorder**: drag a cell onto another, or ↑/↓ buttons (touch friendly)
- **Cell toolbar**: move, widen/narrow span, hide, duplicate, delete
- **Layout controls**: columns 1–4, row/column flow, horizontal + vertical alignment, gap, padding
- **Inspector**: text/URL/list/key-value editors, all 16 text variants, size, weight, colour, background, padding, radius, span, alignment
- **Device preview**: desktop 980 / tablet 680 / mobile 360
- **Live slot preview** at the real format with the AD tag
- **51 templates** can each be exploded into editable blocks ("customise any template")
- **6 layout presets**: blank, hero, split card, alert, offer/coupon, stats card

## 20. Custom template facility

`custom_templates` table + `saveCustomTemplate` / `deleteCustomTemplate`.
Save any composed layout with a name and reuse it later; admins can mark it
**shared** (`advertiserId = null`) to publish a house template to every account.
Saved templates appear in the builder's left panel with block count and ownership.

## 21. Live analytics — `/api/ads/live` + `<LiveAnalytics />`

`GET /api/ads/live?scope=admin|client&range=1H|24H|7D|30D` streams a fresh tick
(deterministic 2s resolution so all viewers agree).

UI/UX: connection state chip (LIVE / PAUSED / RECONNECTING), poll-rate selector
(2s/5s/10s), range tabs, pause/resume, **6 KPI cards** with count-up animation,
delta badge vs previous sample and inline sparkline, **streaming area chart**
with pulsing head dot, crosshair and hover tooltip, **live event feed** with
slide-in rows, **slot occupancy grid** (filled cells pulse, high-demand cells
shine), and a top-creatives panel with CTR bars.

Scoped identically for admin (all accounts) and client (own campaigns only).

## 22. Route map (v3)

```
/portal/builder          client drag-and-drop builder
/admin/ads/builder       admin builder (+ client picker, free publish, shared templates)
/api/ads/live            streaming analytics tick
custom_templates         saved reusable layouts
```

Template count is now **51**, with 38–51 compatible options per ad format.
