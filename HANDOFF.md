# HANDOFF — হৈচৈ / Hoichoi

This file is the single operating handoff between agents working on this repository.
It is written in English on purpose; application interface copy is Bengali.

**Read this file first, every time. Work only after pulling the latest `main`.**
When you finish any task, update this file (status, commits, next steps, surprises)
and push it with your code.

---

## 1. Start here

```bash
cd "E:/Personal AI/HuggingFace/WritterBOT"   # adjust if the home copy differs
git pull --rebase origin main
cat HANDOFF.md
git log --oneline -10
```

Then read the sections below that match the task. Do not start by redesigning
anything. The current priority is correctness, trust and small verified fixes.

### Rules that are not negotiable

- Commit and push after each completed task.
- If the remote moved, `git pull --rebase origin main`; **never force-push**.
- Terminal commands, logs, commit messages and status output are English.
- Bengali is for real app UI copy only.
- Do not print `.env`, credentials, tokens or whole config files. Search for the
  name you need and never echo the value.
- A task is not done until the user-visible surface is checked: run the test,
  open the page, or inspect the rendered output.
- Do not ask for confirmation between steps in a planned sequence.
- Do not redesign the UI. Fix labels, badges, states and readability.

---

## 2. Snapshot at handoff

- Date: **2026-11-26**
- Repository: `https://github.com/bugsfreeweb/Hoichoi.git`, branch `main`
- Production: **https://hoichoifeed.vercel.app**
- Last production-verified commit at creation of this file: **`4c931f9`**
  (the desktop option-colour fix is in this handoff commit; check `/api/health`
  after it deploys)
- Database: Turso/libSQL, **49 migrations applied**
- Media CDN: `https://cdn.jsdelivr.net/gh/bugsfreeweb/HoichoiMedia@main/media/<relative path>`
  Production has no `MEDIA_GITHUB_TOKEN`, so the DB media fallback is live.
- Latest observed public totals: roughly **1,500 published posts**; the exact
  values are in `/api/stats`.
- Latest manual pipeline run:
  `sources=36 scraped=81 rewritten=8 published=7 review=1 duplicates=62 failed=30`
- Latest media repair: `checked=848 missing=0 failed=0`
- Facebook ingestion: **30 Facebook sources + 6 news sources**; the latest raw
  rows were scraped at `2026-11-26T09:39Z`. The collector already turns those
  posts into published stories automatically; no manual Facebook export is in
  the loop.
- Outbound auto-posting **to** a Facebook Page is not implemented. It needs a
  Page id and a token with `pages_manage_posts`; do not invent one.
- Open GitHub code-scanning alerts: **0** after `922db21` fixed the four
  hostname-substring findings in `source-type.ts` / `taxonomy.ts`.
- Root `Bangla Fonts/` is intentionally gitignored. The tracked library is
  `packages/bangla-fonts/`.

Volatile numbers must be re-read from the app, not trusted from this snapshot.

---

## 3. Repository map

```text
apps/web        Next.js public site + admin console + API
apps/desktop    Tauri desktop app for the desk
apps/scraper    collectors, rewrite pipeline, taxonomy, media repair CLI
packages/db     Drizzle schema, migrations, settings, verification, posters
packages/llm    provider chain, art director, image prompts
packages/poster Chromium HTML/CSS poster renderer
packages/shared-types shared contracts and poster/design types
packages/bangla-fonts bundled Unicode Bangla families (47 families / 106 faces)
```

Important files:

- `apps/web/src/app/api/generate-poster/route.ts` — poster API
- `packages/poster/src/design/{layouts,styles,portrait-styles,tokens,render}.ts`
- `apps/scraper/src/taxonomy.ts` — fixed desks and category guards
- `apps/scraper/src/pipeline.ts` — collect → rewrite → gate → publish
- `apps/scraper/src/media-backfill.ts` — media repair
- `packages/db/src/verification.ts` — evidence/grade model
- `apps/web/src/components/admin/settings/TypographySection.tsx` — font studio
- `apps/desktop/src/screens/Settings.tsx` — desktop font settings
- `apps/desktop/src/index.css` — desktop theme tokens
- `apps/web/src/app/globals.css` — public/admin typography and theme tokens
- `apps/web/src/lib/github-alerts.ts` — admin-only security alerts

---

## 4. Local setup

```bash
pnpm install
pnpm db:migrate
pnpm typecheck
pnpm --filter @hoichoi/web build
```

Useful focused checks:

```bash
# packages
pnpm --filter @hoichoi/db test
pnpm --filter @hoichoi/scraper test

# poster renderer
cd packages/poster && npx tsx src/__tests__/design-poster.test.ts

# web scripts are a long chain; run one suspect file directly
cd apps/web && npx tsx scripts/bangla-fonts.test.ts
cd apps/web && npx tsx scripts/trust-surfaces.test.ts
```

Local web server (avoid 3000 if another dev server is running):

```bash
cd apps/web && npx next start -p 3118
```

Stop it on Windows Git Bash:

```bash
netstat -ano | grep ':3118' | grep LISTENING | awk '{print $5}' | head -1 \
  | xargs -r -I{} taskkill //PID {} //F
```

---

## 5. Production and deployment

- Vercel builds `apps/web` from the repository. `deploy-web.yml` may log that the
  CLI token is absent; **workflow success does not prove the live HTML changed**.
- Poll the real commit:

```bash
curl -s https://hoichoifeed.vercel.app/api/health \
  | grep -o '"commit":"[^"]*"'
```

- Poll roughly every 10 s. A deploy usually takes 2–5 minutes; the Vercel queue
  can occasionally take longer. If it is clearly stuck, `VERCEL_DEPLOY_HOOK_URL`
  exists in the local `.env` and can be POSTed without printing the value.
- Always verify at least one affected page returns `200`.

### Admin login for curl / Playwright

```bash
cd packages/db && npx tsx ../../.tmp/make-code.ts
```

Take the printed code and POST `/api/auth/login` with:

```json
{ "email": "admin@hoichoi.io", "code": "<code>" }
```

Add `headers: { origin: "https://hoichoifeed.vercel.app" }`, otherwise the app
returns `403 cross-site request refused`. Codes expire quickly. A `401` and a
30-second navigation timeout usually means the code was minted too long ago.

Playwright scripts live in `apps/web/.scratch/` and are gitignored. Useful ones:

- `check-font-slots.cjs`
- `check-font-contrast.cjs`
- `check-moderation-desk.cjs`
- `regen-poster.cjs` — accepts `POST_ID` and `ADMIN_CODE`

---

## 6. Recent work that is already done

Do not redo these unless a regression is proven.

### Posters
- Posters print **headline + photo + badge + brand + factual footer only**.
  Description paragraphs, bullets and pull-quotes are deliberately not rendered.
- Headline type was enlarged and balanced after prose removal.
- `editorial_magazine_grid` centres its headline in the copy column.
- `breaking_spotlight` vertically centres its badge/headline block.
- Portrait `split_right_media` copy panel is 50% and the photo starts at 52%.
- All five layouts were rendered and checked at 16:9 and 4:5.
- Internal style captions (`CINEMATIC PHOTOJOURNALISM`, duplicate badge/date
  captions) were removed from the poster markup. A poster shows only the brand,
  badge, headline, photo, source/date footer and watermark.

### Bilingual
- `?lang=en` is written to the shared locale cookie by middleware and forwarded,
  so a shared English link is English on the first paint. Public footer and the
  admin rail/service strip are translated.
- Untranslated admin page headings/descriptions are known and listed in section 9.

### Category / taxonomy
- `canonicalDesk()` and `guardCategory()` enforce the fixed taxonomy.
- A technology outlet's security incident does not land on `economy`.
- Clear world/health/tech headlines leave `misc`; promotion out of `misc` uses
  **the headline only**, because body text caused false positives.
- 48 existing rows were reclassified with `admin_actions` audit rows.
- Editors can correct a desk in `/admin/moderation` with `CategoryPicker`.

### Media repair
- The eight-hourly workflow runs bounded `media repair --limit 60` before the
  media commit, with `continue-on-error: true`.

### Security alerts
- The admin `SecurityAlertsPanel` can dismiss a GitHub code-scanning alert with
  a reason (`false positive`, `won't fix`, `used in tests`) and an optional
  comment. The action is audited as `security.alert_dismiss`.
- The GitHub reader compares **hostname labels** for `sourceTypeFromUrl` /
  `inferSourceType`; the four `js/incomplete-url-substring-sanitization` alerts
  are fixed in code rather than dismissed.

### Font dropdowns
- Web admin font selects pin `colorScheme: light`, white background and
  `#141414` text so options stay readable in dark and light themes.
- Desktop `select option` / `optgroup` get the same explicit light surface.
  The closed control still follows the app theme.
- Verified inside the real Tauri WebView2 window (not only Vite/Chromium):
  dark theme closed control `rgb(233,230,218)` on `rgb(10,12,16)`, options
  `rgb(20,20,20)` on `rgb(255,255,255)`; light theme closed control already
  white with dark ink.

---

## 7. Trust invariants

These are product rules, not suggestions.

- The AI rewrite score and the human verification grade are different things.
  Only the verification grade can create a badge.
- `verified` requires a named reviewer, an evidence URL and a supported claim.
- A corruption word inside a denial is not evidence.
- A technology outlet files technology, not corruption, even when covering a
  lawsuit or allegation against a tech company.
- A poster may not invent a quotation. Footer source/date are facts.
- A collected photo is credited; it is not called illustrative.
- Never claim auto-featured. Use `প্রধান সংবাদ / LEAD STORY`, and
  `মানব যাচাই বাকি` when the post is not eligible.
- Repository security findings are admin-only.
- A localized panel is not a localized page: server-rendered page chrome needs
  `serverBi()` too.
- i18n keys are camelCase; badge labels resolve through a `LABEL` map.
- Dedup reporting comes from pipeline run stats, not a fresh pHash scan.

---

## 8. Known technical traps

- Bengali text must be shaped by Chromium (HarfBuzz). Do not move poster text to
  SVG `<text>`; librsvg mis-shapes conjuncts.
- Image providers accept `"16:9" | "4:3" | "1:1" | "9:16"`, not `"3:4"`.
- `posts.media_path` is relative by contract. Render URLs through `mediaUrl()`.
- Saved posters are PNG; inline previews are quality-88 WebP.
- Count Bengali copy in code points or graphemes, never `.length`.
- Clipping cuts must happen on grapheme boundaries.
- A JS string carrying a regex literal must double the backslash.
- New settings tabs must be deep-linkable (`?tab=<key>`).
- A new font slot must fall back to its legacy role, otherwise choosing nothing
  changes existing typography.
- Per-surface fonts work by locally remapping the three legacy tokens inside
  `.bn-surface-*`; look there before rewriting utility classes.
- A Lipighor face chosen for any surface still owes the attribution link.
- Server-safe helpers belong in `lib/`, not in `"use client"` components.
- Vercel is serverless: only bytes in git, the remote CDN or the DB can be served.
- Playwright `locator.evaluate()` with a TypeScript arrow body can fail with
  `ReferenceError: __name is not defined`; pass a plain string.
- Python heredocs: set `PYTHONIOENCODING=utf-8` for Bangla; use raw strings for
  regex escapes. Printing Bangla to a cp1252 console raises `UnicodeEncodeError`.
- `sharp` is not resolvable from the repo root; run it from `apps/web`.
- The Git `LF will be replaced by CRLF` warning is harmless.

---

## 9. Current next steps (priority order)

1. **Outbound Facebook auto-post.** Ingestion is already working (30 Facebook
   sources + 6 news). Publishing our stories **to** a Facebook Page is the one
   missing piece. It needs operator-supplied `FACEBOOK_PAGE_ID` and
   `FACEBOOK_PAGE_TOKEN` (`pages_manage_posts`). Do not hard-code or commit
   either; wire it as a deployment secret and make a failed post non-fatal.
2. **Bilingual admin page copy.** The shell and public footer are fixed. Remaining
   Bangla on English admin screens is page headings/descriptions (dashboard
   section names, settings descriptions) and `LiveDeskMonitor`. Fix copy only,
   never layout.
3. **Poster regressions.** Newly generated posters are description-free. Saved
   poster images are immutable: regenerate a post once if it still shows an old
   poster with prose.
4. **Category quality sweep.** Re-run the category audit after a fresh collector
   run. Prefer manual correction through `/admin/moderation` over new heuristics.
5. **Facebook preview refresh.** Open the post URL in Facebook Sharing Debugger
   and re-scrape to confirm the 4:5 `og:image` and 1080×1350 dimensions.
6. **Security alerts.** Weekly: `gh api
   repos/bugsfreeweb/Hoichoi/code-scanning/alerts?state=open`. Currently 0.

Do not start by generating lots of posters. Each image costs allowance and the
layout is deterministic enough to verify locally first with
`.tmp/render-all.ts`-style renders.

---

## 10. Handoff log

Append a short entry after every completed task. Keep newest first.

### 2026-11-26 — session stop / handoff
- Production is live at `589f2b5`. Working tree clean.
- Verified today: no description prose in posters; English `?lang=en` first
  paint; English public footer and admin rail; 0 open CodeQL alerts; 30 Facebook
  sources ingesting.
- Left for the next agent: outbound Facebook Page posting (needs secrets) and
  remaining admin page-copy translation. See section 9.

### 2026-11-26 — English admin chrome
- The console rail's Menu/Search labels, its aria labels and the service-status
  strip now read from the same locale. Remaining Bangla in an English admin
  screen is page copy that has not been migrated yet, not the shell.
- Web build passed; `desk-bilingual` 6 checks.

### 2026-11-26 — shared ?lang= links and English footer
- `?lang=en` was documented but ignored: the root layout cannot read a query
  string. Middleware now turns `?lang=` into the same cookie as the toggle and
  forwards it, so the first paint is already English. The matcher now covers the
  public pages, not only `/api`, `/admin` and `/portal`.
- The English footer no longer prints the Bangla site name, Bangla tagline or
  Bangla year; the advertiser login link is bilingual.
- Tests: `desk-bilingual` 6 checks; local `?lang=en` verified with `html lang=en`
  on home/category/about/contact/privacy and an English footer.

### 2026-11-26 — security alert actions + cleaner posters
- Fixed four CodeQL `js/incomplete-url-substring-sanitization` alerts by parsing
  hostnames instead of substring-matching URLs.
- Added admin dismiss-with-reason for GitHub code-scanning alerts, with an audit
  row; the panel states plainly that dismissal is not a fix.
- Removed internal visual-style and duplicate metadata captions from posters.
- Tests: `security-alerts` 6 checks, `design-poster` 11 checks; web build passed.
- Commit: see `git log -1` for this handoff change.

### 2026-11-26 — desktop dropdown contrast verified in Tauri
- Launched the real Tauri app (`tauri dev`) with WebView2 remote debugging and
  probed a generated `.field` select in both themes.
- Options: `rgb(20,20,20)` on `rgb(255,255,255)`; dark closed control keeps its
  dark surface. The CSS rule is live in WebView2, not just in Chromium.
- Commit: `a435c28` (no code change after verification).

### 2026-11-26 — font dropdown visibility
- Web font selects pinned to a light popup surface; verified in both themes with
  Playwright (12 selects, 48 options, `rgb(20,20,20)` on `rgb(255,255,255)`).
- Desktop option/optgroup CSS added for WebView2.
- Commit: `4c931f9` (web) + this handoff commit (desktop + HANDOFF.md).

### 2026-11-26 — poster layout audit
- Removed prose from posters; rebalanced headline placement in all five layouts.
- Portrait split-right panel reduced to 50%, photo enlarged.
- Commits: `45002a4`, `220ac9f`, `27f0400`.

### 2026-11-26 — category and media reliability
- Taxonomy v2 fixed security/world/health misfiles; 48 rows reclassified.
- Eight-hourly media repair added and exercised (848 checked, 0 missing).
- Commits: `4fe181b`, `3a721b5`.

---

## 11. End-of-task checklist

- [ ] `git pull --rebase origin main` was done before editing.
- [ ] Typecheck/build for the touched package passed.
- [ ] The relevant focused test passed.
- [ ] The deployed surface was checked after the commit.
- [ ] `HANDOFF.md` status, next steps and log were updated.
- [ ] Changes were committed and pushed without force.
