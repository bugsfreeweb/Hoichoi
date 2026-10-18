# Docs

Operating and reference documentation for the Hoichoi monorepo.

| File | What it covers |
| --- | --- |
| **`SECRETS.md`** | **Start here for automation.** Every required GitHub Actions / Vercel credential: where to obtain it, step-by-step, cost, and exactly what breaks when it is missing. Bangla. |
| **`PIPELINE-TROUBLESHOOTING.md`** | **When content stops arriving.** Diagnosis + fixes for the two real outages: GitHub Actions billing (jobs never start) and Turso `SQLITE_IOERR`; the DB-retry / stale-run-reaper / 3× scrape-retry resilience; why `/admin/setup` shows amber (DB unreachable); and why generated images need the `generate-image` runner. Bangla. |
| `DEPLOY_WEB.md` | How the web app (only `apps/web`) ships to Vercel through GitHub, env vars, admin-code login, live `/api/stats`, the admin console shell (grouped collapsible sidebar) + the shared 5-tab `@hoichoi/dash` dashboard (with live refresh + manual pipeline run), the section-variant switcher folded into Settings → ডিজাইন (`/admin/settings?tab=design`, live preview + reset-to-default), first-party cookie-less traffic analytics (`/api/track` → `page_views`/`ad_events`) and the shared storage analytics, both surfaced as the dashboard's ট্রাফিক ও স্টোরেজ tab (`/admin?tab=traffic`), default post image + brand animation, multi-image posts + lightbox, the `/desk` preview, ad slots, theme toggle + `theme_default` seeding, visitor announcement notices (bell + banner), web-visibility `app_config_json` gating + reset-to-defaults, ISR. |
| `DESKTOP.md` | The Tauri 2 desktop app: self-contained pipeline runner, keychain vault, one-time admin codes, backup/reset/sync bar, the 9-tab desk console (Monitor · Traffic → Ads) whose মনিটর tab renders the shared `@hoichoi/dash` 5-tab dashboard (live refresh + manual run + completion toast) and whose ট্রাফিক tab renders the shared `TrafficView` with a ট্রাফিক/স্টোরেজ sub-tab toggle (shared `StorageView`), with the Settings screen (source/provider/notice managers + web-visibility panel with the count knobs + default post image + brand animation + reset-to-defaults, clipboard/download vault fixes), manual AI image generation from the content queue, gallery-image management in the content-row editor, and rebuilding the installer (incl. the portable package). |
| `project-brief.md` | The original design-phase README (project concept, categories, lifecycle, workflows) — preserved as a reference. |
| `ai-provider-strategy.md` | Multi-LLM provider economics (free tiers) and default `llm_providers` config, including per-provider **purpose** (`text`/`image`), the multi-key API-key override, and on-demand image generation. |
| `architecture-notes.md` | End-to-end system design notes (how the pipeline, media split, provider resolver, dedup, archiving, cookie-less traffic telemetry, storage analytics, and the post-gallery layer fit together). |
| `coding-agent-prompt.md` | The full build prompt/phase list used to construct the system (historical reference), plus a v1.1.10 appendix. |
| `database-decision.md` | Why Turso/libSQL was chosen over the alternatives; supersedes the earlier Supabase draft. Includes the v1.1.10 traffic + post_images tables. |
| `design-system.md` | Brand, color tokens, typography, layout spec, and component library (mockup `<->` production). |
| `editorial-policy.md` | The editorial standard the engineering is built to enforce (categories, redaction, approvals). |
| `CONTRIBUTING.md` | Contribution expectations. |
| `CODE_OF_CONDUCT.md` | Contributor code of conduct. |

> `docs/` is the single home for documentation. The historical `all doc files/` stash
> was folded into this directory so the repo root stays clean.