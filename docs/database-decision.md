# Database Decision — Free-Tier Comparison (Sept 2026)

All numbers are for the **free / hobby tier** of each provider. Checked September 2026.

| Provider | Free DB / storage | Vector search | Auth | File storage | Egress | Pauses if idle | Best for |
|---|---|---|---|---|---|---|---|
| **Supabase** | 500 MB Postgres | **Yes (pgvector)** | Yes (50K MAU) | 1 GB | 5 GB / mo | **Yes — 7 days** | This project (all-in-one) |
| **Neon** | 0.5 GB / project, 100 projects | Yes (pgvector) | Yes — Neon Auth (60K MAU) | No (use Cloudflare R2) | 5 GB / mo | No (scale-to-zero) | Serverless apps, branching |
| **Turso** | 5 GB SQLite, 100 DBs | No (libSQL has `vector` but limited) | No (roll your own) | No | n/a (row reads) | No | Edge / multi-region read-heavy |
| **Firebase Firestore** | 1 GB | No native (use Vertex AI) | Yes | 5 GB | 10 GB / mo | No | Mobile-first, vendor-locked |
| **PlanetScale** | Removed free tier (2024) | No | No | No | n/a | n/a | Not viable free |
| **MongoDB Atlas** | 512 MB | Yes (Atlas Vector Search) | No (use Atlas App Services) | No | n/a | No | Document workloads |
| **Upstash Redis** | 10K commands/day | No (KV only) | No | No | n/a | No | Cache, not primary DB |

---

> **⚠️ Update (final decision):** The analysis below (from an earlier draft) picked **Supabase**. The decision was later **revised to Turso (libSQL)**, which is what the repo actually implements (`packages/db`, `pnpm-workspace.yaml`, migrations, and CI all use Turso/libSQL). The reasoner: this project needs only a handful of tables, native `vec0` vector search for semantic dedup, no idle-pause, and a generous free tier — Turso provides all three, while Supabase's free Postgres **pauses after 7 idle days** and its NoSQL/Firebase alternative forces a document model. `README.md` is the authoritative current state; the comparison table below is retained as historical context for the trade-offs weighed.

## Original pick for this project: **Supabase** *(superseded — see note above)*

Reasoning:

1. **pgvector is the killer feature.** Semantic text dedup at scale, in the same DB as your content, with one query. No Pinecone, no Weaviate, no extra bill.
2. **Auth is included.** The web admin panel needs login — Supabase Auth with email + Google is one config step, and RLS policies give you row-level security for free.
3. **Storage is included.** Screenshots and re-encoded media land in Supabase Storage with a typed client, not a separate S3 setup.
4. **One provider, one dashboard, one set of env vars.** Simpler than wiring Neon + Clerk + R2.
5. **Free tier is enough for the first 3–4 months** at 100 posts/day. After that you either compress more aggressively or upgrade to Pro ($25/mo for 8 GB).

### The one gotcha: 7-day idle pause

Free Supabase projects pause after 1 week of no activity. **The GitHub Actions `keep-alive.yml` workflow I included in the prompt fixes this** — it pings the REST API once a day at noon UTC. Cost: 30 seconds of CI time per month.

If you want a no-pause alternative, **Neon** is the runner-up. You'd add:
- A separate auth (Clerk free = 10K MAU, or Supabase Auth anyway).
- A separate file store (Cloudflare R2 free = 10 GB).
- A second GitHub secret for R2.

That's why Supabase wins: it trades a daily ping for a much simpler architecture.

---

## When to switch away from Supabase free

| Trigger | Switch to |
|---|---|
| 1 GB storage fills up | Compress to WebP + offload old screenshots to Cloudflare R2 (free 10 GB) |
| 500 MB DB fills up | Purge `raw_posts` older than 30 days, or upgrade to Supabase Pro ($25/mo, 8 GB) |
| 5 GB egress / mo exceeded | Move screenshot serving to a CDN (Cloudflare free) |
| You need 99.9% uptime SLA | Supabase Pro or migrate to self-hosted Postgres |
| You start doing image-heavy video processing | Move the scraper off GH Actions to a small VPS ($5/mo Hetzner) |

None of these are v1 problems.

---

## Content tables added in v1.1.10 (traffic analytics)

The first-party analytics layer adds two tables, created by
`ensureTrafficTables` in `packages/db/src/client.ts` (runtime `ensureSchema` path)
and by `packages/db/migrations/011_traffic.sql` (server `db:migrate` path):

| Table | Key columns | Notes |
|---|---|---|
| `page_views` | `id`, `visitor_fingerprint`, `session_id`, `path`, `slug`, `post_id`, `country`, `country_code`, `region`, `city`, `os`, `browser`, `device`, `is_bot`, `created_at` | One row per anonymous page view. No raw IP is stored — `visitor_fingerprint` is `sha256(ip\|ua\|yyyy-mm-dd).slice(0,16)` (daily-rotating). Bots and `/admin`,`/desk`,`/api` paths are filtered before insert. |
| `ad_events` | `id`, `visitor_fingerprint`, `session_id`, `slot`, `post_id`, `kind`, `created_at` | `kind` is `view` or `click`; powers the ad views/clicks/CTR group. |

Both are indexed on `created_at` (and `slug` / `slot`) so the range aggregation in
`trafficSnapshot` (`24h | 7d | 30d`) stays cheap. Aggregation is pure SQL
(`COUNT(DISTINCT …)`, `GROUP BY`) — no rollup job, so there is no new cron or
background worker and nothing extra to keep alive on a free tier.

## Content table added in v1.1.10 (post gallery)

The multi-image feature adds one table, created by `ensurePostImagesTable` in
`packages/db/src/client.ts` (runtime `ensureSchema` path) and by
`packages/db/migrations/012_post_images.sql` (server `db:migrate` path):

| Table | Key columns | Notes |
|---|---|---|
| `post_images` | `id`, `post_id`, `path`, `kind`, `position`, `source`, `created_at` | Extra images attached to a post beyond its single `posts.media_path`. `source` is `collector` (mirrored from the source post by the pipeline) or `admin` (added by an operator). Ordered by `position`; `ON DELETE CASCADE` from `posts`. |

Indexed on `(post_id, position)` so `listPostImages` is a straight ordered scan.
`replaceCollectorImages` rewrites only the `collector` rows on re-collection, so an
operator's `admin` additions are never clobbered. The collector mirrors every
fetchable image (cap 8, first → primary), the editor and the public lightbox read
straight from this table, and nothing is denormalised back onto `posts` except the
chosen primary.
