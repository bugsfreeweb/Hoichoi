# হৈচৈ ডেস্ক (HOICHOI)

> **Site empty after deploying?** If *every* Vercel path 404s (including `/api/health`), there is no
> successful deployment yet — that is not a database problem. If the site loads but shows no
> articles, open `/api/health` and read `schemaReady`, `articles` and `hint`.
>
> **Sharing one database:** all tables are namespaced `hoichoi_*`, so this app can safely coexist in
> a Turso database that already holds other tables. It never alters or drops foreign tables.

> **Latest update — desk theme toggle + single desktop app:** the pure-HTML “Option‑A”
> desktop prototype has been removed entirely. The React `desk` app (`/desk`) is now the
> only desktop controller, and it is fully theme‑aware: the **titlebar contains a dark⇄light
> toggle** that flips the whole desk window (titlebar, sidebar, tables, collector, settings)
> between a dark command surface and a light paper layout. A **smart resync** bar sits under
> the desk menubar — one click publishes any desk‑pending items to the web, otherwise it
> pulls the latest collection back from the web (`/api/sync`).
> Reader **reports** work: the “রিপোর্ট করুন” control on every article
> posts to `/api/reports` and editors triage the queue at `/admin/reports`.
> The homepage now polls `/api/stats` every 10 seconds for actual database counts,
> interactive charts and connection status. A real collector heartbeat—not a simulation—
> controls its connected/offline indicator. The old random cron counters have been removed;
> the default Vercel configuration does not schedule collection. Older prototype notes
> below describe the original mockup; this guide supersedes those automation/moderation claims.

স্বয়ংক্রিয় বাংলা সংবাদ কিউরেশন সিস্টেমের পূর্ণ প্রযুক্তি-প্রদর্শনী —
**ফেসবুক ফিড → স্ক্রিনশট আর্কাইভ → হ্যাশ ডিডাপ → LLM পুনর্লিখন → GitHub → Vercel লাইভ**, প্রতি ২ ঘণ্টায়।

- **পাবলিক সাইট** (`/`) — সিনেমাটিক সাইট, লাইভ কালেকশন স্ট্রিম, তুলনা স্লাইডার, বিজ্ঞাপন স্লট, পাবলিক কমেন্ট
- **ডেস্কটপ কন্ট্রোলার** (`/desk`) — ওয়াচলিস্ট, কালেক্টর, ভল্ট, সেটিংস, মডারেশন, বিজ্ঞাপন; ডার্ক⇄লাইট থিম টগল টাইটেলবারে
- **ওয়েব অ্যাডমিন** (`/admin`) — কিউ, ভল্ট, রান-লগ, শিডিউল
- **ব্লুপ্রিন্ট** (`/system`) — আর্কিটেকচার, ডাটাবেস তুলনা, গার্ডরেল

---

## ১) Vercel-এ GitHub দিয়ে ডিপ্লয় (ধাপে ধাপে)

1. **GitHub-এ রিপো পুশ করুন** — এই ফোল্ডারটিই রিপো; `main` ব্রাঞ্চ।
2. **[vercel.com](https://vercel.com) → Add New → Project → GitHub রিপো ইমপোর্ট** — Next.js অটো-ডিটেক্ট হবে (build: `next build`)।
3. **Environment Variables সেট করুন** (Project → Settings → Environment Variables) — `.env.example` দেখুন:
   - `DB_DRIVER=turso`
   - `TURSO_DATABASE_URL=libsql://…turso.io` এবং `TURSO_AUTH_TOKEN=…`
   - `SETUP_KEY=<র্যান্ডম>` এবং `CRON_SECRET=<র্যান্ডম>`
4. **ডিপ্লয়** — এরপর প্রথমবার **এক-ক্লিক সেটআপ** চালান:
   ```
   curl -H "x-setup-key: <SETUP_KEY>" https://<আপনার-ডোমেইন>/api/setup
   ```
   ✅ টেবিল তৈরি + ডেমো কনটেন্ট সিড হয়ে যাবে (তালিকা: `/api/setup`-তে দেখুন)।
5. **অটো-ডিপ্লয়** — GitHub-এ প্রতিটি পুশে Vercel স্বয়ংক্রিয় ডিপ্লয় চলে। (ডেমো সাইট, তাই কোনো শিডিউলড cron নেই।)
6. **স্যান্ডবক্স/লোকে** — `DATABASE_URL` দিলে Postgres মোড (ডিফল্ট); Turso চাইলে `DB_DRIVER=turso` + Turso কী।

> **জরুরি:** DB-এর সংযোগ-স্ট্রিং মিসিং হলেও সাইট **কখনো ক্র্যাশ করে না** —
> এপ স্টার্ট হয় "ডেমো ফেলব্যাক" মোডে (পেজ রেন্ডার হয়, প্রশ্ন খালি থাকে)।
> তাই প্রথম ডিপ্লয়েও হোমপেজ, ডেস্ক, অ্যাডমিন — সব দৃশ্যমান।

---

## ২) ডাটাবেস — Turso (PRIMARY) · Postgres শুধু ব্যাকআপ

**Turso-ই এই প্রজেক্টের ডাটাবেস।** `DB_DRIVER` এখন ডিফল্ট `turso`; Postgres
কোডপাথে আছে শুধুমাত্র কারণ এই স্যান্ডবক্সে একটি লোকাল Postgres ইন্সট্যান্স
আগে থেকেই চলে (প্ল্যাটফর্ম-সাপ্লাইড) — সেটা Turso-র বিকল্প নয়, ফলব্যাক।

| ড্রাইভার | স্কিমা | সেটআপ |
|---|---|---|
| **Turso (libSQL) — PRIMARY** | `src/db/schema-turso.ts` | `/api/setup` অথবা `npx drizzle-kit push --config=drizzle.config.turso.json` |
| Postgres (লোকাল/Neon) — ব্যাকআপ | `src/db/schema.ts` | `DB_DRIVER=postgres` দিলে; `npx drizzle-kit push` + `db/seed.sql` |

**Turso URL দুই রকম:**
```bash
# ক্লাউড (Vercel ডিপ্লয়মেন্ট)
TURSO_DATABASE_URL=libsql://YOUR-DB.turso.io
TURSO_AUTH_TOKEN=…

# লোকাল ডেভ (একই libSQL ডায়ালেক্ট, ফাইলে জমা)
TURSO_DATABASE_URL=file:./data/hoichoi.db
```
ডেভে `file:` দিলে নেট/অ্যাকাউন্ট ছাড়াই পুরো Turso কোডপাথ চলে — Vercel-এ
শুধু URL+token বদলালেই হয়, কোড একই থাকে। চাইলে `TURSO_SYNC_URL` দিয়ে
**embedded replica**: ক্লাউড DB-র লোকাল ক্যাশ, অফলাইনেও ডেস্কটপ কালেক্টর চলে।

> টাইমস্ট্যাম্প: Turso-তে epoch **মিলিসেকেন্ড** (`mode: "timestamp_ms"`) —
> `/api/setup`-এর `unixepoch(...)*1000`-এর সঙ্গে মিল রেখেই স্কিমা লেখা।

---

### FAQ — "আমরা তো Turso ব্যবহার করি, তাহলে Neon কেন দেখাচ্ছিল?"

সংক্ষিপ্ত উত্তর: **আসল ডাটাবেস Turso-ই।** আগের বিল্ডে দুটি ভুল ছিল, এখন ঠিক:

1. **ড্রাইভার ডিফল্ট ছিল Postgres** — এই স্যান্ডবক্সে প্ল্যাটফর্ম-দেওয়া একটি লোকাল
   Postgres আগে থেকেই চলে, তাই `DB_DRIVER` না দেওয়ায় অ্যাপ সেই ফলব্যাকে চলছিল।
   এখন ডিফল্ট **`turso`**; Postgres শুধু তখনই যখন স্পষ্টভাবে `DB_DRIVER=postgres` দেওয়া হয়।
2. **লেবেল ভুল ছিল** — স্ট্যাটাসবারে ড্রাইভারের নাম অনুমান করে "NEON" লেখা হতো।
   এখন `DRIVER_LABEL` সত্যিকারের ড্রাইভার রিপোর্ট করে: **`TURSO`** অথবা `POSTGRES`
   (`/api/health` → `{"ok":true,"driver":"TURSO"}`)।

সাথে দুটি আসল বাগও ধরা পড়েছে ও ঠিক হয়েছে:
- libSQL অ্যাডাপ্টারে `db.execute()` নেই → health probe এখন নিচের ক্লায়েন্ট দিয়ে `ping()` করে
  (টেবিল ছাড়াও চলে, তাই ফ্রেশ Vercel ডিপ্লয়েও healthy)।
- Turso স্কিমা `mode:"timestamp"` (সেকেন্ড) ছিল কিন্তু seed লিখত মিলিসেকেন্ড →
  এখন `mode:"timestamp_ms"`; টাইমস্ট্যাম্প JS-এ গুনে লিটেরাল হিসেবে বসে
  (SQLite-এর যৌগিক মডিফায়ার `-2 hours 26 minutes` NULL দেয় — সেটাই ধরা পড়ে)।

**এখন স্যান্ডবক্সেও Turso চলে** — `TURSO_DATABASE_URL=file:./data/hoichoi.db`
(লোকাল libSQL ফাইল, ক্লাউডের একই ডায়ালেক্ট)। Vercel-এ শুধু বদলাতে হবে:
`libsql://YOUR-DB.turso.io` + `TURSO_AUTH_TOKEN`। কোড একটুকুও বদলাবে না।

## ৩) ফিচার ম্যাপ

| ফিচার | কোথায় |
|---|---|
| পাবলিক কমেন্ট (POST `/api/comments`, মডারেশন ব্যাজ, লাইক) | প্রতিটি প্রতিবেদনের নিচে |
| পাঠক রিপোর্ট (POST `/api/reports` → `/admin/reports` সারি) | প্রতিবেদনের নিচে "রিপোর্ট করুন" |
| বিজ্ঞাপন স্লট (leaderboard / rect / infeed / strip + ডেমো অ্যানালিটিক্স) | হোম + আর্টিকেল পেজ, `src/components/ad-slot.tsx` |
| কালেকশন (ম্যানুয়াল) | `/api/cron/collect` বা ডেস্কটপ কালেক্টর — ডেমোতে শিডিউলড cron নেই |
| স্মার্ট রিসিঙ্ক (ডেস্ক ⇄ ওয়েব এক-ক্লিক) | ডেস্ক মেনুবারের নিচে `DeskSyncControls` + `/api/sync`; ওয়েব অ্যাডমিনে `SyncPanel` |
| থিম টগল (ডার্ক⇄লাইট, localStorage + OS প্রেফারেন্স) | ডেস্কটপ (`/desk`) টাইটেলবার + সাইট হেডার `theme-toggle.tsx` |
| রিভিল-অন-স্ক্রল (no-JS-safe, reuced-motion, safety-timeout) | `src/components/reveal.tsx` |

## ৪) লোকাল ডেভ

```bash
npm install
mkdir -p data                      # Turso ফাইল DB-র জন্য
npm run dev                        # DB_DRIVER=turso (ডিফল্ট)
# টেবিল + ডেমো ডেটা এক ক্লিকে:
curl http://localhost:3000/api/setup
```
Postgres-এ চালাতে চাইলে: `DB_DRIVER=postgres` +
`npx drizzle-kit push` + `psql $DATABASE_URL -f db/seed.sql`।

**ভ্যালিডেশন:** `node --check public/moderation-panel.js` → `npx next typegen` →
`npm exec tsc -- --noEmit` → `npm run build`।

## ৫) নোট

- সব ক্রেডেনশিয়াল অ্যাডমিন **API ভল্টে** (ডেমো মান) — রিপোতে কখনো বাস্তব কী নয়।
- এটি একটি প্রযুক্তি প্রদর্শনী (মকআপ): চরিত্র-ঘটনা কাল্পনিক, ছবি Pexels, সচেতনতামূলক টোন।
