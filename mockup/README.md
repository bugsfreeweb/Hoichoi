# হইচই ডেস্ক (HOICHOI)

স্বয়ংক্রিয় বাংলা সংবাদ কিউরেশন সিস্টেমের পূর্ণ প্রযুক্তি-প্রদর্শনী —
**ফেসবুক ফিড → স্ক্রিনশট আর্কাইভ → হ্যাশ ডিডাপ → LLM পুনর্লিখন → GitHub → Vercel লাইভ**, প্রতি ২ ঘণ্টায়।

- **পাবলিক সাইট** (`/`) — সিনেমাটিক সাইট, লাইভ কালেকশন স্ট্রিম, তুলনা স্লাইডার, বিজ্ঞাপন স্লট, পাবলিক কমেন্ট
- **ডেস্কটপ কন্ট্রোলার** (`/desk` React · `/option-a.html` **খাঁটি HTML/CSS/JS**) — ওয়াচলিস্ট, কালেক্টর, ভল্ট, সেটিংস; ডার্ক⇄লাইট থিম
- **ওয়েব অ্যাডমিন** (`/admin`) — কিউ, ভল্ট, রান-লগ, শিডিউল
- **ব্লুপ্রিন্ট** (`/system`) — আর্কিটেকচার, ডাটাবেস তুলনা, গার্ডরেল

---

## ১) Vercel-এ GitHub দিয়ে ডিপ্লয় (ধাপে ধাপে)

1. **GitHub-এ রিপো পুশ করুন** — এই ফোল্ডারটিই রিপো; `main` ব্রাঞ্চ।
2. **[vercel.com](https://vercel.com) → Add New → Project → GitHub রিপো ইমপোর্ট** — Next.js অটো-ডিটেক্ট হবে (build: `next build`)।
3. **Environment Variables সেট করুন** (Project → Settings → Environment Variables) — `.env.example` দেখুন:
   - `TURSO_DATABASE_URL=libsql://…turso.io` এবং `TURSO_AUTH_TOKEN=…` ← **প্রধান ডাটাবেস**
   - `SETUP_KEY=<র্যান্ডম>` এবং `CRON_SECRET=<র্যান্ডম>`
   - *(`DB_DRIVER` দেওয়ার দরকার নেই — Turso কী থাকলেই অ্যাপ অটো Turso মোডে চলে)*

   **ডিপ্লয়** — এরপর প্রথমবার **এক-ক্লিক সেটআপ** চালান:
   ```
   curl -H "x-setup-key: <SETUP_KEY>" https://<আপনার-ডোমেইন>/api/setup
   ```
   ✅ টেবিল তৈরি + ডেমো কনটেন্ট সিড হয়ে যাবে (তালিকা: `/api/option-a`-তে দেখুন)।
5. **Vercel Cron** (`vercel.json`) ইতিমধ্যে আছে — `0 */2 * * *`-এ `/api/cron/collect` চলে, একই সাথে GitHub-এ প্রতিটি পুশে অটো-ডিপ্লয়।
6. **লোকাল ডেভ (ঐচ্ছিক)** — প্রোডাকশন সবসময় Turso। Turso কী ছাড়া শুধু লোকাল Postgres-এ চালাতে চাইলে `DB_DRIVER=postgres` + `DATABASE_URL` দিন।

> **জরুরি:** DB-এর সংযোগ-স্ট্রিং মিসিং হলেও সাইট **কখনো ক্র্যাশ করে না** —
> এপ স্টার্ট হয় "ডেমো ফেলব্যাক" মোডে (পেজ রেন্ডার হয়, প্রশ্ন খালি থাকে)।
> তাই প্রথম ডিপ্লয়েও হোমপেজ, ডেস্ক, অ্যাডমিন — সব দৃশ্যমান।

---

## ২) ডাটাবেস — Turso (প্রধান) · Postgres (লোকাল ফলব্যাক)

| ড্রাইভার | ভূমিকা | স্কিমা | সেটআপ |
|---|---|---|---|
| **Turso (libSQL)** | **প্রোডাকশন · ডিফল্ট** | `src/db/schema-turso.ts` | `drizzle-kit push --config=drizzle.config.turso.json` অথবা `/api/setup` |
| **Postgres** | শুধু লোকাল ডেভ ফলব্যাক | `src/db/schema.ts` | `npx drizzle-kit push` + `psql … -f db/seed.sql` অথবা `/api/setup` |

একই অ্যাপ কোড দুই ড্রাইভারেই চলে — `src/db/index.ts`-এর দ্বৈত-ড্রাইভার বুটস্ট্র্যাপ
(Turso-অটো-ডিটেক্ট) এবং `/api/setup`-এর ডায়ালেক্ট-সচেতন SQL-এর জন্য।
প্রোডাকশনে শুধু Turso কী দিলেই চলে; Postgres ঐচ্ছিক।

---

## ৩) ফিচার ম্যাপ

| ফিচার | কোথায় |
|---|---|
| পাবলিক কমেন্ট (POST `/api/comments`, মডারেশন ব্যাজ, লাইক) | প্রতিটি প্রতিবেদনের নিচে |
| বিজ্ঞাপন স্লট (leaderboard / rect / infeed / strip + ডেমো অ্যানালিটিক্স) | হোম + আর্টিকেল পেজ, `src/components/ad-slot.tsx` |
| ২-ঘণ্টার অটোমেশন | desktop cron + **Vercel Cron** `/api/cron/collect` (failover) |
| থিম টগল (ডার্ক⇄লাইট, localStorage + OS প্রেফারেন্স) | Option-A টাইটেলবার |
| রিভিল-অন-স্ক্রল (no-JS-safe, reuced-motion, safety-timeout) | `src/components/reveal.tsx` |

## ৪) লোকাল ডেভ

```bash
npm install

# প্রোডাকশন-সদৃশ (Turso):
#   .env-এ TURSO_DATABASE_URL + TURSO_AUTH_TOKEN দিন, তারপর:
#   curl -H "x-setup-key: <SETUP_KEY>" http://localhost:3000/api/setup

# অথবা লোকাল Postgres ফলব্যাক:
#   DB_DRIVER=postgres npx drizzle-kit push
#   psql postgresql://postgres:postgres@127.0.0.1:5432/app_db -f db/seed.sql

npm run dev
```

**ভ্যালিডেশন:** `node --check public/option-a.js` → `npx next typegen` →
`npm exec tsc -- --noEmit` → `npm run build`।

## ৫) নোট

- সব ক্রেডেনশিয়াল অ্যাডমিন **API ভল্টে** (ডেমো মান) — রিপোতে কখনো বাস্তব কী নয়।
- এটি একটি প্রযুক্তি প্রদর্শনী (মকআপ): চরিত্র-ঘটনা কাল্পনিক, ছবি Pexels, সচেতনতামূলক টোন।
