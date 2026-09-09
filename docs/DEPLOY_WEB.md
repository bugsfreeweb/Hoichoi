# Deploying the Web App to Vercel (through GitHub)

The **web app is `apps/web`** — a Next.js (App Router) public site + admin. The
desktop app and scraper are deliberately **not** part of the web deploy. This
page explains the exact, unambiguous path from push → Vercel.

## What ships to Vercel (and what never does)

| Ships | Excluded (`.vercelignore`) |
|---|---|
| `apps/web` | `apps/desktop` (native app — separate product) |
| `packages/db`, `packages/llm`, `packages/shared-types` | `apps/scraper` (runs on the desktop/CI, not serverless) |
| `vercel.json`, `.vercelignore`, `pnpm.*`, `tsconfig.base.json` | `mockup` (static design reference) |

The web app no longer depends on `@hoichoi/scraper` — the two helpers it used
(`purgeExpired`, `mediaRoot`) now live in `@hoichoi/db`. So a web build never
pulls in Playwright/tsx/ffmpeg.

## Database

Uses **Turso (libSQL)**. Set these in Vercel (Project → Settings → Environment
Variables) and as GitHub secrets:

```
TURSO_DATABASE_URL   libsql://...(or file: for local-only; use remote on Vercel)
TURSO_AUTH_TOKEN     (only needed for remote libsql:// URLs)
NEXT_PUBLIC_SITE_URL https://your-domain
SITE_URL             https://your-domain
ADMIN_AUTH_SECRET    openssl rand -hex 32
ADMIN_ALLOWED_EMAILS admin@example.com
STORAGE_ADAPTER      local | r2
```

> `file:` URLs do not work on Vercel (ephemeral filesystem) — use a Turso
> `libsql://` database.

## Option A — Deploy from GitHub Actions (recommended)

> **In place now.** `.github/workflows/deploy-web.yml` is committed. It runs on
> every push to `main` touching `apps/web/**`, `packages/**`, `pnpm-lock.yaml`
> or `vercel.json` — typechecks the web app, then `amondnet/vercel-action`
> deploys **production**. The job **skips itself** (never fails) until the
> Vercel secrets exist.

Live site: `https://hoichoifeed.vercel.app`.

1. Git push the repo.
2. In Vercel create a project, then grab `VERCEL_TOKEN` (Account → Tokens),
   `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` (`vercel pull`, or read them from
   `.vercel/project.json`).
3. Add these repo secrets under GitHub → Settings → Secrets and variables →
   Actions:
   - `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
   - `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`
4. Push to `main` touching `apps/web/**` or `packages/**` → the
   `.github/workflows/deploy-web.yml` workflow typechecks then runs
   `amondnet/vercel-action` with `--prod`. Git push is the only trigger.
   The root `vercel.json` (`rootDirectory: "apps/web"`) drives the build.

## Option B — Vercel Git integration (no custom workflow)

1. Import the repo into Vercel.
2. Use the existing root `vercel.json`:
   - `rootDirectory: "apps/web"` → Vercel builds only the web app.
   - `buildCommand`: `cd ../.. && pnpm --filter @hoichoi/web build`
   - `outputDirectory: ".next"` (+ `/media/**` and `/_next/static/**` cache headers).
3. Add the env vars above. Vercel auto-detects Next.js.

## Local pre-flight (matches CI)

```bash
pnpm install
pnpm --filter @hoichoi/web typecheck
pnpm --filter @hoichoi/web build
```

## Notes

- **Content manager:** `/admin/posts` lets editors update any post's title, body,
  summary, category, case status and published date/time, show/hide it
  (`published`/`removed`), or delete it (admin only). Every change is logged in
  `admin_actions` (target_table `posts`). Editing a title keeps the stable slug
  (URL unchanged). Content lives in the shared Turso DB, so edits reflect on the
  public site immediately. Note: there is no comment system in the schema, so
  "comment" moderation is not applicable.
- **Data control:** `/admin/backup` (admin) adds a content-level export/import
  and a full reset. **Export** downloads a plain-JSON snapshot of all content
  tables (posts, sources, settings, configs, logs — never credentials); HTTPS is
  the transport encryption. **Restore** uploads such a JSON file and replaces
  the live tables row-by-row. **Reset** wipes content/logs and re-seeds
  settings/categories/providers/blocklist defaults while keeping the admin
  user. The desktop app offers the same operations plus credential-bearing,
  passphrase-encrypted backups and one-click local↔Turso sync (see
  `docs/DESKTOP.md`).
- **Centralized branding:** the `settings` row (Turso) now carries the site
  identity — `site_name`, `slogan_bn`, `tagline`, `logo_url`, `favicon_url`,
  `accent_color` — edited from the web admin settings screen **or** the desktop
  (cloud sync), one shared source for web metadata, masthead and footer. Always
  run `pnpm --filter db migrate` (or the app's first boot) against the Turso DB
  once so the new branding columns are added to an existing `settings` table.
- The public rolling-window pages use ISR (`revalidate = 300`, matching the
  `ARCHIVE_VISIBLE_DAYS` / ISR window from the docs), so Vercel serves cached
  HTML and revalidates in the background.
- Sitemap: `apps/web/src/app/sitemap.ts` lists static + category + live post
  URLs; add a production `SITE_URL` so links are absolute.