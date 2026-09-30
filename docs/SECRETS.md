# সিক্রেট সেটআপ গাইড

এই ফাইল `packages/shared-types/src/secrets.ts`-এর **অভিজ্ঞতা থেকে** তৈরি। ওয়েব অ্যাডমিনের
`/admin/setup` পেজ ও ডেস্ক অ্যাপের Settings → Secrets প্যানেল — দুটোই একই তালিকা দেখায়। কোথাও
অসম্পত্তি দেখলে এখানে ঠিক করুন, তারপর ওই অংশের UI আপডেট করুন।

> **কখনো কোনো সিক্রেট চ্যাটে লিখবেন না, git-এ কমিট করবেন না, বা স্ক্রিনশটে দেখাবেন না।**
> ফেসবুক সেশন কুকি ও API টোকেন — দুটোই আপনার অ্যাকাউন্টের পূর্ণ ক্ষমতা।

---

## দ্রুত রেফারেন্স

**ন্যূনতম যা লাগবেই (তিনটি):**

| Secret | কোথায় সেট করবেন | এর বাদ দিলে কী হবে |
| --- | --- | --- |
| `TURSO_DATABASE_URL` | GitHub Actions secrets | সাইট ৫০৩ দেবে |
| `TURSO_AUTH_TOKEN` | GitHub Actions secrets | পাইপলাইন চলবে, কোনো পোস্ট সেভ হবে না |
| `FB_SESSION_COOKIE` | GitHub Actions secrets | সব স্ক্র্যাপ ব্যর্থ, শূন্য পোস্ট |

**এছাড়াও লাগবে (যেকোনো একটি):** একটি LLM API কী — `GOOGLE_API_KEY`, `GROQ_API_KEY`,
`OPENROUTER_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `MISTRAL_API_KEY`, বা
`OLLAMA_BASE_URL`।

> ⚠️ `LLM_PROVIDER_KEY` নামে কোনো secret বসাবেন **না**। এটি শুধু UI-তে দেখানো একটি গোষ্ঠীর
> নাম। GitHub-এ কখনো এই নামে কোনো secret তৈরি হবে না, কারণ ওয়ার্কফ্লো এটি পড়ে না।

**প্রস্তাবিত:** `VERCEL_DEPLOY_HOOK_URL` — ছাড়া সাইট চলবে, শুধু নতুন পোস্ট পরের Vercel
বিল্ডে দেখা যাবে।

---

## কোথায় সেট করবেন

### GitHub Actions secrets (পাইপলাইনের জন্য)

1. রিপোজিটরি খুলুন: <https://github.com/bugsfreeweb/Hoichoi>
2. উপরে **Settings** ট্যাব
3. বাঁ পাশে **Secrets and variables → Actions**
4. **New repository secret** বাটন
5. নাম দিন, মান পেস্ট করুন, **Add secret**

> ব্রাউজারে সরাসরি: <https://github.com/bugsfreeweb/Hoichoi/settings/secrets/actions>

**Non-secret টিউনিং ভ্যালু** একই পেজের **Variables** ট্যাবে যায় (secret নয়, তাই দেখা যায়):

| Variable | ডিফল্ট | কাজ |
| --- | --- | --- |
| `MAX_SOURCES_PER_RUN` | ৩০ | এক রানে সর্বোচ্চ কতটি সোর্স |
| `MAX_POSTS_PER_RUN` | ৫০ | এক রানে সর্বোচ্চ কতটি পোস্ট |
| `ARCHIVE_VISIBLE_DAYS` | ৭ | পুরোনো পোস্ট আর্কাইভে যাওয়ার আগে কতদিন দৃশ্যমান থাকবে |
| `ARCHIVE_RETENTION_DAYS` | ৩০ | আর্কাইভ থেকে মুছে ফেলার আগে কতদিন |
| `SCRAPE_REQUEST_DELAY_MS` | ২০০০ | দুই ফেসবুক রিকোয়েস্টের মাঝে বিরতি |

### Vercel environment variables (ওয়েব অ্যাপের জন্য)

এগুলো **Actions secret নয়**, বরং Vercel প্রজেক্টে লাগে — ওয়েবসাইটের "Run pipeline"
বাটন এগুলো ব্যবহার করে:

1. <https://vercel.com> → প্রজেক্ট **hoichoifeed**
2. **Settings → Environment Variables**
3. `GH_TRIGGER_TOKEN` যোগ করুন (GitHub PAT, `repo` স্কোপ সহ)
4. `GH_REPO` যোগ করুন, মান `bugsfreeweb/Hoichoi`
5. **Save** → Vercel অটোমেটিক রিডিপ্লয় করবে

পরে যাচাই করুন: অ্যাডমিন → **সেটিংস** পেজে "পাইপলাইন" বক্সে সবুজ "কনফিগার্ড" দেখানো
উচিত।

---

## প্রতিটি সিক্রেট বিস্তারিত

### 1. `TURSO_DATABASE_URL`

**কাজ:** লাইভ পোস্ট, ক্যাটাগরি ও সেটিংস যেখানে থাকে। পাইপলাইন ও ওয়েবসাইট দুটোই এখানে লেখে।
**মানটি সিক্রেট না** — এটি একটি URL, তবে GitHub-এ secret হিসেবেই রাখা ঠিক।

**কীভাবে পাবেন:**
1. <https://turso.tech> এ গিয়ে লগইন করুন (GitHub দিয়ে সাইন-ইন সহজ)।
2. **New Database** → নাম দিন, যেমন `hoichoi-prod`।
3. **Create** চাপলে Location অংশে `libsql://hoichoi-prod-xxxx.turso.io` দেখাবে।
4. এই লিংকটাই `TURSO_DATABASE_URL`।
5. একই পেজের **Tokens** ট্যাবে গিয়ে আলাদা টোকেন বানান (নিচে দেখুন)।

**খরচ:** ফ্রি টায়ার — প্রায় ৫০০ MB স্টোরেজ, ১০ কোটি রিড/মাস। ছোট সাইটের জন্য যথেষ্ট।

### 2. `TURSO_AUTH_TOKEN`

**কাজ:** Turso ডাটাবেসে **লেখার** অনুমতি। URL ছাড়া এটি থাকলে পাইপলাইন কেবল পড়তে পারবে।

**কীভাবে পাবেন:**
1. Turso ড্যাশবোর্ড → আপনি Database → **Tokens** ট্যাব।
2. **Generate Token** চাপুন।
3. টোকেন **একবারই** দেখা যাবে — সঙ্গে সঙ্গে কপি করে secret হিসেবে সেভ করুন।
4. ভুলে গেলে ডিলিট করে নতুন করে বানান; পুরানো বদলানো যায় না।

**এটি ছাড়া:** পাইপলাইন চলবে, কিন্তু কোনো পোস্ট ডাটাবেসে ঢুকবে না — সবকিছু ফাঁকা মনে হবে।
এটি সবচেয়ে সাধারণ ভুল, তাই রান শূন্য পোস্ট দেখালে **প্রথমে এটি** দেখুন।

### 3. `FB_SESSION_COOKIE`

**কাজ:** উন্মুক্ত ফেসবুক পেজ স্ক্র্যাপ করার লগইন-সেশন।

**কীভাবে পাবেন:**
1. Chrome-এ ফেসবুক লগইন করুন — **আলাদা ব্রাউজার প্রোফাইল** ব্যবহার করুন, যাতে
   ব্যক্তিগত সেশন না হারান।
2. `F12` → **Console** ট্যাব।
3. এই কোডটি পেস্ট করে Enter চাপুন:
   ```js
   copy(document.cookie)
   ```
4. ক্লিপবোর্ডে যা কপি হবে (`c_user=...; xs=...; datr=...`) সেটাই `FB_SESSION_COOKIE`।

**গুরুত্বপূর্ণ:**
- ফেসবুক সেশন শেয়ার, কমিট বা চ্যাটে পাঠাবেন **না**। এটি আপনার সম্পূর্ণ অ্যাকাউন্ট।
- সেশন লক হলে (১–২ সপ্তাহে ঘটে) নতুন করে লগইন করে আবার নিন।
- খরচ: ফ্রি।

### 4. LLM API কী (যেকোনো একটি)

**কাজ:** ফেসবুকের সংক্ষিপ্ত মূল পোস্ট থেকে সংবাদ-ধাঁচের বিস্তারিত বাংলা লেখা হয়।

| প্রোভাইডার | Secret নাম | কোথায় | খরচ |
| --- | --- | --- | --- |
| Google AI Studio | `GOOGLE_API_KEY` | <https://aistudio.google.com/apikey> | ফ্রি টায়ার আছে — **শুরু করার জন্য এটি** |
| Groq | `GROQ_API_KEY` | <https://console.groq.com/keys> | ফ্রি টায়ার, খুব দ্রুত |
| OpenRouter | `OPENROUTER_API_KEY` | <https://openrouter.ai/keys> | পে-পর-টোকেন, একটি কীতে অনেক মডেল |
| Anthropic | `ANTHROPIC_API_KEY` | <https://console.anthropic.com> | পেপার-টোকেন |
| OpenAI | `OPENAI_API_KEY` | <https://platform.openai.com/api-keys> | পেপার-টোকেন |
| Mistral | `MISTRAL_API_KEY` | <https://console.mistral.ai> | ফ্রি টায়ার আছে |
| Ollama (লোকাল) | `OLLAMA_BASE_URL` | নিজের মেশিনে | সম্পূর্ণ বিনামূল্যে |

**কীভাবে পাবেন (Google উদাহরণ):**
1. <https://aistudio.google.com/apikey> খুলুন।
2. **Create API key** চাপুন।
3. যে নাম দেখাবে সেটা অপ্রয়োজনীয় — যেকোনো কিছু দিন।
4. `AIza...` দিয়ে শুরু হওয়া কীটি কপি করে `GOOGLE_API_KEY` নামে secret যোগ করুন।

**এটি ছাড়া:** পোস্ট স্ক্র্যাপ হবে, কিন্তু কোনো পুনর্লিখন হবে না — সব পোস্ট রিভিউ
অপেক্ষায় আটকে থাকবে।

**কোন প্রোভাইডার ব্যবহার হবে:** ডাটাবেসের `learning_providers` টেবিলের সেটিং ঠিক করে।
ওয়েব অ্যাডমিনের **প্রোভাইডার** পেজ থেকে বেছে নিন।

### 5. `VERCEL_DEPLOY_HOOK_URL` (প্রস্তাবিত)

**কাজ:** পাইপলাইন শেষ হলে Vercel-কে সঙ্গে সঙ্গে জানায়, যাতে নতুন পোস্ট সাথে সাথে দেখা যায়।

**কীভাবে পাবেন:**
1. <https://vercel.com> → প্রজেক্ট **hoichoifeed** → **Settings → Git → Deploy Hooks**।
2. **Create Hook** → নাম দিন, যেমন `scraper-ping`।
3. যে URL পাবেন সেটি বসান। এটি ইতিমধ্যে নিরাপদ — শুধু POST করা যায়।

**এটি না দিলেও কী হয়:** সাইট ভাঙবে না; শুধু নতুন পোস্ট Vercel-এর পরবর্তী স্বয়ংক্রিয়
বিল্ড পর্যন্ত দেখা যাবে না। Vercel-এ Git ইন্টিগ্রেশন চালু থাকলে সেটাই যথেষ্ট।

### 6. Vercel ডিপ্লয় ক্রেডেনশিয়াল (ঐচ্ছিক)

`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` — এই তিনটি দিলে GitHub থেকে নিজে
ডিপ্লয় করতে পারে।

**দরকারই নেই** যদি Vercel-এ Git ইন্টিগ্রেশন চালু থাকে (প্রায় সবসময়ই থাকে), কারণ তখন
push করলেই Vercel নিজে বিল্ড করে। এগুলো না দিলে ডিপ্লয় ওয়ার্কফ্লো "not configured"
নোটিস দেবে, কিন্তু কোনো কাজ থামবে না।

- `VERCEL_TOKEN` → <https://vercel.com/account/tokens> → **Create** → টিম স্কোপ দিন
- `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` → প্রজেক্ট → **Settings → General**

### 7. `GH_TRIGGER_TOKEN` + `GH_REPO` (ওয়েব অ্যাপের জন্য)

**কাজ:** ওয়েবসাইটের "Run pipeline" বাটন চাপলে GitHub-কে সরাসরি স্ক্র্যাপ চালু করতে বলে।

**এগুলো GitHub Actions secret নয়** — Vercel-এর environment variable।

**কীভাবে পাবেন:**
1. <https://github.com/settings/tokens> → **Tokens (classic)** → **Generate new token**।
2. **Scope: `repo`** চেক করুন (`repository_dispatch` পাঠাতে এটি লাগে)।
3. Vercel → প্রজেক্ট **hoichoifeed** → **Settings → Environment Variables**:
   - `GH_TRIGGER_TOKEN` = `ghp_...`
   - `GH_REPO` = `bugsfreeweb/Hoichoi`
4. **Save** — Vercel নিজে থেকেই রিডিপ্লয় করবে।

**এটি না দিলে:** ওয়েব বাটন কাজ করবে না, তবে GitHub-এর **Actions** ট্যাব থেকে
**Run workflow** চেপে হাতে চালানো যাবে, অথবা ডেস্ক অ্যাপ থেকে সরাসরি।

---

## যাচাই করার উপায়

1. **ওয়েব অ্যাডমিন:** `/admin/setup` — প্রতিটি সিক্রেটের পাশে সবুজ/লাল বিন্দু,
   কখন হালনাগাদ হয়েছে।
2. **ডেস্ক অ্যাপ:** Settings → GitHub Secrets প্যানেল — একই তালিকা, সাথে লেখা আছে কোথায়
   পাবেন।
3. **GitHub Actions:** রিপোজিটরির **Actions** ট্যাব → একটি রান খুলুন।
   - `❌ missing required secret: FB_SESSION_COOKIE` → ওই নামের secret নেই
   - `❌ no LLM API key` → কোনো LLM key নেই
   - সবুজ টিক ও `collected > 0` → সব ঠিক আছে

---

## সমস্যা হলে

| উপসর্গ | সম্ভাব্য কারণ |
| --- | --- |
| সাইট ৫০৩ দেচ্ছে | `TURSO_DATABASE_URL` ভুল বা নেই |
| রান শূন্য পোস্ট দেখায় | `TURSO_AUTH_TOKEN` নেই — পাইপলাইন পড়তে পারে কিন্তু লিখতে পারে না |
| সব স্ক্র্যাপ ব্যর্থ | `FB_SESSION_COOKIE` শেষ মেয়াদ শেষ; নতুন করে নিন |
| সব পোস্ট রিভিউয় আটকে | কোনো LLM key নেই |
| নতুন পোস্ট সাইটে দেখায় না | `VERCEL_DEPLOY_HOOK_URL` নেই; Vercel-এর পরবর্তী বিল্ডের জন্য অপেক্ষা করুন |
| ওয়েব বাটন কাজ করে না | Vercel-এ `GH_TRIGGER_TOKEN`/`GH_REPO` নেই, অথবা সেভ করার পর রিডিপ্লয় হয়নি |
| "not configured" ডিপ্লয় নোটিস | Vercel ডিপ্লয় ক্রেডেনশিয়াল দেওয়া হয়নি — ঐচ্ছিক, উপেক্ষা করুন |

আরও বিস্তারিত: [`DEPLOY_WEB.md`](./DEPLOY_WEB.md)
