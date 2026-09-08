# Deploy Hoichoi Web to Vercel (exact steps)

## What to upload to GitHub

**Upload the ENTIRE repository** — every file and folder at the root. Do NOT upload only `apps/web`.

The GitHub repo must contain ALL of these at the root:

```
.vercelignore          ← excludes desktop/scraper/mockup from the build
.vercel.json           ← tells Vercel to build apps/web (KEEP THIS)
pnpm-workspace.yaml    ← pnpm workspace definition (REQUIRED)
pnpm-lock.yaml         ← lockfile (REQUIRED)
package.json           ← root package.json (REQUIRED)
turbo.json             ← turbo config
tsconfig.base.json
LICENSE
apps/
├── web/               ← the Next.js app Vercel builds
│   ├── package.json
│   ├── next.config.mjs
│   └── src/
├── desktop/           ← excluded from web build (.vercelignore)
└── scraper/           ← excluded from web build (.vercelignore)
packages/
├── db/                ← @hoichoi/db (imported by web — REQUIRED)
├── llm/               ← @hoichoi/llm (imported by web — REQUIRED)
└── shared-types/      ← @hoichoi/shared-types (imported by web — REQUIRED)
data/                  ← excluded (.vercelignore)
```

**Why the whole repo?** The web app (`apps/web`) imports the workspace packages
`@hoichoi/db`, `@hoichoi/llm`, `@hoichoi/shared-types`. These live in `packages/`,
not in `apps/web`. Uploading only `apps/web` breaks those imports → build fails.
The `.vercelignore` file ensures Vercel *builds* only `apps/web` even though the
whole repo is uploaded.

## Step-by-step

1. **Push the whole repo to GitHub** (public repo for free Actions minutes):
   ```bash
   git init
   git add .
   git commit -m "hoichoi: web + desktop monorepo"
   git branch -M main
   git remote add origin https://github.com/YOUR_USER/hoichoi.git
   git push -u origin main
   ```

2. **Connect to Vercel:**
   - Go <https://vercel.com/new> → Import the `hoichoi` GitHub repo.
   - Vercel auto-detects `vercel.json` → uses `rootDirectory: apps/web`.
   - Framework: Next.js (auto-detected).
   - **Do NOT override the install/build commands** — `vercel.json` handles them.

3. **Set Environment Variables** (Vercel Project → Settings → Environment Variables,
   for All Environments):

   | Variable | Example | Notes |
   |---|---|---|
   | `TURSO_DATABASE_URL` | `libsql://your-db.turso.io` | Remote Turso. **Never use `file:` on Vercel** (ephemeral disk). |
   | `TURSO_AUTH_TOKEN` | `eyJ...` | Only needed for remote `libsql://` URLs. |
   | `NEXT_PUBLIC_SITE_URL` | `https://your-domain.vercel.app` | Used by layout/sitemap OG tags. |
   | `SITE_URL` | `https://your-domain.vercel.app` | Used by layout metadataBase. |
   | `ADMIN_AUTH_SECRET` | generate via `openssl rand -hex 32` | Session signing secret. |
   | `ADMIN_ALLOWED_EMAILS` | `you@example.com` | Comma-separated admin emails. |
   | `STORAGE_ADAPTER` | `local` | Use `local` on Vercel (no S3/R2 needed for dev). |

4. **Create the Turso database** (one-time):
   ```bash
   turso db create hoichoi
   turso db show hoichoi --url     # → set as TURSO_DATABASE_URL
   turso tokens create hoichoi     # → set as TURSO_AUTH_TOKEN
   ```
   Then migrate + seed from your local machine (token lets you run against remote):
   ```bash
   pnpm install
   pnpm --filter db migrate
   pnpm --filter db seed     # or: pnpm --filter db demo
   ```

5. **Deploy.** Vercel reads `vercel.json`:
   - `installCommand`: `pnpm install --no-frozen-lockfile` (installs the whole workspace)
   - `buildCommand`: `pnpm --filter @hoichoi/web build` (builds only the web app)
   - `outputDirectory`: `.next`

## Optional: auto-deploy via GitHub Actions

`.github/workflows/deploy-web.yml` auto-deploys on push to `main`. To enable it,
add these **GitHub Secrets** (Repo → Settings → Secrets and variables → Actions):

- `VERCEL_TOKEN` — from <https://vercel.com/account/tokens>
- `VERCEL_ORG_ID` — from Vercel → Settings → General → your org ID
- `VERCEL_PROJECT_ID` — from your Vercel project → Settings → General → Project ID

You can find ORG_ID + PROJECT_ID immediately by running once in the repo:
```bash
npx vercel link        # creates .vercel/project.json containing both IDs
```

## Common mistakes

| Symptom | Cause | Fix |
|---|---|---|
| `Cannot find module '@hoichoi/db'` | Uploaded only `apps/web`, not the whole repo | Push the entire repo |
| `Lockfile is up to date` build error | Frozen lockfile mismatch | Already handled (`--no-frozen-lockfile`) |
| `file:./data/...` DB errors on Vercel | Used `file:` URL | Use remote Turso `libsql://` URL |
| `ADMIN_AUTH_SECRET is required` | Missing env var | Add the env vars above |
| Build succeeds but site is blank | No posts yet / wrong DB | Run migrate + seed against the remote DB |