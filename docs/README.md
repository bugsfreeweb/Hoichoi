# Docs

Operating and reference documentation for the Hoichoi monorepo.

| File | What it covers |
| --- | --- |
| `DEPLOY_WEB.md` | How the web app (only `apps/web`) ships to Vercel through GitHub, env vars, admin-code login, live `/api/stats`, the admin console shell + dashboard, the `/desk` preview, ad slots, theme toggle, ISR. |
| `DESKTOP.md` | The Tauri 2 desktop app: self-contained pipeline runner, keychain vault, one-time admin codes, backup/reset/sync bar, the 8-tab mockup-parity desk console (Monitor → Ads), and rebuilding the installer. |
| `project-brief.md` | The original design-phase README (project concept, categories, lifecycle, workflows) — preserved as a reference. |
| `ai-provider-strategy.md` | Multi-LLM provider economics (free tiers) and default `llm_providers` config. |
| `architecture-notes.md` | End-to-end system design notes (how the pipeline, media split, provider resolver, dedup, archiving fit together). |
| `coding-agent-prompt.md` | The full build prompt/phase list used to construct the system (historical reference). |
| `database-decision.md` | Why Turso/libSQL was chosen over the alternatives; supersedes the earlier Supabase draft. |
| `design-system.md` | Brand, color tokens, typography, layout spec, and component library (mockup `<->` production). |
| `editorial-policy.md` | The editorial standard the engineering is built to enforce (categories, redaction, approvals). |
| `CONTRIBUTING.md` | Contribution expectations. |
| `CODE_OF_CONDUCT.md` | Contributor code of conduct. |

> `docs/` is the single home for documentation. The historical `all doc files/` stash
> was folded into this directory so the repo root stays clean.