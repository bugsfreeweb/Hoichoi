# পাইপলাইন সমস্যা সমাধান (report + instructions)

> এই ফাইলটি "সাইটে নতুন কনটেন্ট আসছে না" / "সেটআপ গাইডে সব লাল" জাতীয় সমস্যার
> জন্য। এখানে যা লেখা আছে তা GitHub Actions-এর আসল রান-লগ দেখে নিশ্চিত করা।
> সিক্রেট বানানোর ধাপ `docs/SECRETS.md`-এ; এখানে শুধু **কী ভেঙেছে এবং কী ঠিক করবেন**।

---

## উপসর্গ → কারণ এক নজরে

| উপসর্গ | সম্ভাব্য কারণ | সমাধান |
| --- | --- | --- |
| সাইটে নতুন পোস্ট নেই, Actions-এ কোনো রানই "start" হয়নি | GitHub billing (payment failed / spending limit) | নিচের §1 |
| রান শুরু হয়েছে কিন্তু `SQLITE_IOERR: disk I/O error` দিয়ে মাঝপথে ফেল | Turso/libSQL ডিস্ক I/O (সাইজ/প্ল্যান সীমা বা সাময়িক ডাউন) | নিচের §2 |
| `/admin/setup`-এ সব সিক্রেট "নেই" দেখাচ্ছে | ডেটাবেস-রিড ব্যর্থ, স্টেটাস যাচাই করা যায়নি | নিচের §3 (এখন amber ব্যানার দেখাবে) |
| `/admin/posts/<id>`-এ "ছবি তৈরি করুন" চেপেও ছবি আসছে না | সার্ভারলেসে ছবি সেভ করতে পারছিল না | নিচের §4 |
| রান সফল কিন্তু ডেভ টার্মিনালে প্রতি ৮ ঘণ্টায় নেই | `.github/workflows/pipeline-cron.yml` cron বন্ধ/ডিজেবল | Actions → revive workflow |

---

## §1 GitHub Actions billing

**লক্ষণ (রান লগে হুবহু):**

```
The job was not started because recent account payments have failed or your
spending limit needs to be increased. Please check the 'Billing & plans'
section in your settings
```

এখানে কোডের দোষ নয় — GitHub অ্যাকাউন্টের পেমেন্ট/স্পেন্ডিং লিমিট আটকে দিয়েছে,
তাই staged job **শুরুই হয় না** (তাই লগে কিছুই নেই তার আগে)। Actions-এ রানগুলো
`cancelled`/`failure` দেখাতে পারে।

**ঠিক করার ধাপ:**

1. খুলুন <https://github.com/settings/billing> (একই মূল অ্যাকাউন্ট যেটি রিপো
   মালিক/org-এর সাথে যুক্ত)।
2. **Payment information** — কার্ড মেয়াদোত্তীর্ণ/declined কিনা দেখুন, ঠিক করুন।
3. **Plans and usage → Actions** — ফ্রি মিনিট শেষ হলে খরচের সীমা (spending limit)
   বাড়ান, অথবা মাসিক মিনিট কম ব্যবহার করুন।
   - পাবলিক রিপোতে স্ট্যান্ডার্ড রানার মিনিট সাধারণত ফ্রি, তবে private/overage
     হলে লিমিট লাগে।
4. payment ঠিক করা মাত্র পরের cron রান নিজে থেকেই চলবে। এখনই চালাতে চাইলে:
   Actions → **Pipeline cron** → **Run workflow** (বা অ্যাডমিন থেকে "পাইপলাইন চালাও")।

> নাম বদলে যাওয়া সিক্রেট/cron নয় — বিলিং ঠিক হলেই আবার কনটেন্ট আসবে।

---

## §2 Turso `SQLITE_IOERR: disk I/O error`

**লক্ষণ:** রান বহুক্ষণ (প্রায় ৩০+ মিনিট) ঝুলে থাকে, মিডিয়া মিরর হয়ে যায়
(`[media] mirrored → .../apps/web/public/uploads`), তারপর:

```
LibsqlError: SQLITE_IOERR: SQLite error: disk I/O error
```

এটি সার্ভার-সাইড libSQL ত্রুটি — ডেটাবেস সাইজ/pages প্ল্যানের সীমা ছাড়িয়েছে,
অথবা Turso-র সাময়িক সমস্যা। কোড-রিগ্রেশন নয়।

**ঠিক করার ধাপ:**

1. Turso ড্যাশবোর্ড → আপনার ডেটাবেস → **Usage**: বর্তমান স্টোরেজ/rows-read
   প্ল্যানের সীমার কতটা। লিমিটের কাছে থাকলে:
   - প্ল্যান আপগ্রেড করুন, **অথবা**
   - পুরোনো ডেটা কম করুন: `pnpm --filter scraper exec tsx src/cli.ts purge --days 30`
     (বা `pnpm run purge`)। আর্কাইভ/পার্জ উইন্ডো `ARCHIVE_*` ভেরিয়েবলে টিউন
     করা যায় (§ Variables)।
2. Turso **status** পেজে সাময়িক ইনসিডেন্ট থাকলে অপেক্ষা করুন — কিছুক্ষণেই ঠিক হয়।
3. চাপ কমাতে গ্যালারি মিরর কমান: রিপো ভেরিয়েবল `HOICHOI_GALLERY_MAX` = `4`
   (ডিফল্ট ৮, clamp ০–২৪)। প্রতি পোস্টে কম ছবি = কম I/O।

**কোড এখন এই ত্রুটি সহ্য করে (resilience):**

- `packages/db/src/client.ts` — সাময়িক libSQL ত্রুটি (`SQLITE_BUSY`,
  `SQLITE_LOCKED`, `SQLITE_IOERR`, `disk I/O`, নেটওয়ার্ক blip) এখন স্বয়ংক্রিয়ভাবে
  ব্যাকঅফ + jitter সহ রিট্রাই হয়:
  - `HOICHOI_DB_RETRIES` (ডিফল্ট ৪) — সর্বোচ্চ চেষ্টা
  - `HOICHOI_DB_RETRY_MS` (ডিফল্ট ৬০০) — প্রথম বিরতি, প্রতি চেষ্টায় বাড়ে
- `.github/workflows/pipeline-cron.yml` — `pnpm run scrape` এখন ৩ বার পুরো-রান
  রিট্রাই হয় (প্রতি ব্যর্থতায় ৯০/১৮০ সেকেন্ড বিরতি)। Pipeline idempotent, তাই
  পুরো-রান রিট্রাই নিরাপদ।
- `packages/db/src/index.ts` — `reapStalePipelineRuns()` প্রতিটি রান শুরুতে ৩ ঘণ্টার
  বেশি "running"-এ আটকে থাকা পুরোনো রানকে "failed" মার্ক করে, যাতে স্টেটাস কখনো
  চিরকাল আটকে না থাকে।

---

## §3 `/admin/setup`-এ সব "নেই" দেখানো

আগে: ডেটাবেস-রিড (`recentPipelineRuns`) ব্যর্থ হলে পেজ ত্রুটি গিলে খেত → রান-তালিকা
খালি → প্রতিটি সিক্রেট "missing" দেখাত। এখন (ফিক্সের পর) ডেটাবেসে পৌঁছানো না গেলে:

- উপরে **amber/হলুদ ব্যানার**: "স্ট্যাটাস যাচাই করা যাচ্ছে না"
- প্রতিটি সিক্রেট কার্ডে ধূসর `?` ডট (লাল ✕ নয়) — মানে "যাচাই করা গেল না",
  "নেই" নয়।

তাই লাল দেখলে **আগে §2 (ডেটাবেস) ঠিক করুন**, তারপর গাইড আবার দেখুন।

---

## §4 পোস্ট-এডিটরে "ছবি তৈরি" কাজ করছে না

**কেন:** Vercel সার্ভারলেসে `public/` ফোল্ডার বিল্ড-টাইমে হিমায়িত। রিকোয়েস্টের
সময়ে ফাইল লিখলে তা কখনো সার্ভ হয় না — তাই ছবি সেভ হয়ে দেখাত না।

**এখন কী হয়:** `GH_TRIGGER_TOKEN` + `GH_REPO` সেট থাকলে পোস্ট-এডিটরের
"ছবি তৈরি করুন" বাটন `generate-image.yml` ওয়ার্কফ্লো GitHub Actions-এ পাঠায়।
ওই রান কনটেন্ট-রানারের `media generate` CLI চালায়, যা:

1. ছবিটি `apps/web/public/uploads`-এ মিরর করে,
2. পোস্টের `media_path`-এ যুক্ত করে,
3. ফাইলটি git-এ কমিট করে (Vercel এটাই সার্ভ করে), তারপর deploy hook ping করে।

এডিটর প্যানেল তখন ৮ মিনিট পর্যন্ত নিজে থেকেই দেখে — ছবি এসে ডিপ্লয় শেষ হলে
সাথে সাথে প্রিভিউ দেখিয়ে দেয়।

**যদি ৫০১ আসে** ("সার্ভারে ছবি-রানার কনফিগার করা নেই"): Vercel-এ
`GH_TRIGGER_TOKEN` (repo scope) + `GH_REPO` (যেমন `bugsfreeweb/Hoichoi`) সেট
করুন, অথবা মিডিয়া স্টোরেজ অ্যাডাপ্টার কনফিগার করুন। বিস্তারিত `docs/SECRETS.md`।

> লোকাল/dev-এ (GH টোকেন ছাড়া) ছবি সরাসরি জেনারেট হয়ে `public/uploads`-এ লেখা হয়,
> তাই লোকালি সাথে সাথে দেখা যায়।

---

## §5 রান সফল, তবু নতুন পোস্ট সাইটে দেখা যায় না

- `VERCEL_DEPLOY_HOOK_URL` সেট না থাকলে রান শেষে Vercel রিবিল্ড হয় না — নতুন
  মিডিয়া/পোস্ট পরের বিল্ড পর্যন্ত দেখা যায় না। GitHub → Secrets → Actions-এ
  যোগ করুন (`docs/SECRETS.md`)।
- তারপরও না এলে Vercel → Project → Deployments-এ শেষ ডিপ্লয় সফল কিনা দেখুন।

---

## দ্রুত ডায়াগনস্টিক কমান্ড

```bash
# শেষ কয়েকটি Actions রান (status + কোন commit-এ)
gh run list --repo bugsfreeweb/Hoichoi --limit 15

# একটি রানের বিস্তারিত (কেন ফেল)
gh run view <run-id> --repo bugsfreeweb/Hoichoi

# শুধু ফেল করা স্টেপগুলোর লগ
gh run view <run-id> --repo bugsfreeweb/Hoichoi --log-failed

# অ্যাডমিন থেকে পাইপলাইন ম্যানুয়ালি চালান
#   (ওয়েব: /admin → "পাইপলাইন চালাও"; ডেস্ক: Desk → Monitor)
#   অথবা লোকালি:
pnpm run scrape
pnpm --filter scraper scrape --mock   # অফলাইন ডেমো

# লাইভ সংগ্রহ-স্ট্যাটাস
curl -s https://<your-web>/api/stats
```

লোকালি ডেটাবেস স্টোরেজ কতটা ভরেছে দেখতে: `pnpm --filter scraper exec tsx src/cli.ts storage`
(JSON: DB সাইজ + মিডিয়া ব্যবহার)।

---

## সম্পর্কিত tuning ভেরিয়েবল

| নাম | কোথায় | ডিফল্ট | কাজ |
| --- | --- | --- | --- |
| `HOICHOI_DB_RETRIES` | Actions env | `4` (workflow-এ `5`) | সাময়িক DB ত্রুটিতে সর্বোচ্চ চেষ্টা |
| `HOICHOI_DB_RETRY_MS` | Actions env | `600` (workflow-এ `1500`) | প্রথম ব্যাকঅফ বিরতি (ms), তারপর বাড়ে |
| `HOICHOI_GALLERY_MAX` | Actions env | `8` | প্রতি পোস্টে সর্বোচ্চ কতটি গ্যালারি ছবি মিরর হবে (০–২৪) |

> `pipeline-cron.yml` ও `generate-image.yml` — দুটোতেই DB retry env সেট করা আছে।

---

## সংক্ষেপে রিকভারি চেকলিস্ট

1. GitHub billing ঠিক করুন → Actions → **Pipeline cron** → **Run workflow**।
2. রান লগে `SQLITE_IOERR` দেখলে Turso স্টোরেজ/p্ল্যান দেখুন, দরকারে পুরোনো ডেটা পার্জ করুন।
3. `/admin/setup` খুলে amber ব্যানার নেই, সিক্রেট সব সবুজ — নিশ্চিত করুন।
4. `/api/stats`-এ `collector: working` এবং বাড়তে থাকা `collected` দেখুন।
5. পোস্ট-এডিটরে ছবি-জেনারেটর ৫০১ দিলে `GH_TRIGGER_TOKEN`/`GH_REPO` সেট করুন।
