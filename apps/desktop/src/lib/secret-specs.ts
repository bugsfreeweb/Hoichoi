/**
 * Local copy of the secrets catalogue.
 *
 * The desktop app is deliberately dependency-free — `bundle-runner.mjs` inlines
 * it into the Tauri binary, so pulling in `@hoichoi/shared-types` would drag a
 * workspace dependency into that build for data alone.
 *
 * This file must stay in sync with `packages/shared-types/src/secrets.ts`.
 * The shape is structurally compatible, so a spec object from either source can
 * be passed to `SecretRow` interchangeably.
 */

export type SecretRequirement = "required" | "recommended" | "optional";

export interface SecretSpec {
  name: string;
  labelBn: string;
  purposeBn: string;
  requirement: SecretRequirement;
  isSecretValue: boolean;
  howToBn: string[];
  dashboardUrl?: string;
  dashboardLabelBn?: string;
  envExample: string;
  costNoteBn?: string;
  ifMissingBn: string;
}

/** LLM keys — any single one satisfies the rewrite requirement. */
export const LLM_SECRET_NAMES = [
  "GOOGLE_API_KEY",
  "GROQ_API_KEY",
  "OPENROUTER_API_KEY",
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "MISTRAL_API_KEY",
  "OLLAMA_BASE_URL",
];

export const SECRET_SPECS: SecretSpec[] = [
  {
    name: "TURSO_DATABASE_URL",
    labelBn: "Turso ডাটাবেস URL",
    purposeBn:
      "লাইভ পোস্ট, ক্যাটাগরি ও সেটিংস যেখানে সংরক্ষিত হয়। পাইপলাইন ও ওয়েবসাইট দুটোই এই একই ডাটাবেসে লেখে।",
    requirement: "required",
    isSecretValue: false,
    howToBn: [
      "turso.tech এ গিয়ে লগইন করুন (GitHub দিয়ে সাইন-ইন সবচেয়ে সহজ)।",
      "ড্যাশবোর্ড → New Database → একটি নাম দিন (যেমন hoichoi-prod)।",
      "Create চাপার পর Location অংশে দেখবেন libsql://hoichoi-prod-xxxx.turso.io",
      "ঠিক এই লিংকটাই TURSO_DATABASE_URL হিসেবে বসাবেন।",
      "একই পেজে Tokens ট্যাবে গিয়ে একটি Auth Token তৈরি করুন — এটি আলাদা সিক্রেট।",
    ],
    dashboardUrl: "https://turso.tech",
    dashboardLabelBn: "Turso ড্যাশবোর্ড",
    envExample: 'TURSO_DATABASE_URL="libsql://hoichoi-prod-xxxx.turso.io"',
    costNoteBn: "ফ্রি টায়ার: প্রায় ৫০০ MB স্টোরেজ ও ১০ কোটি রিড/মাস। ছোট সাইটের জন্য যথেষ্ট।",
    ifMissingBn:
      "পাইপলাইন প্রথম ধাপেই থেমে যাবে, আর ওয়েবসাইটের ডেটাবেস পড়তে পারবে না (৫০৩)।",
  },
  {
    name: "TURSO_AUTH_TOKEN",
    labelBn: "Turso Auth Token",
    purposeBn:
      "Turso ডাটাবেসে লেখার অনুমতি। URL ছাড়া এটি ছাড়লে পাইপলাইন কেবল পড়তে পারবে, কোনো নতুন পোস্ট সেভ হবে না।",
    requirement: "required",
    isSecretValue: true,
    howToBn: [
      "Turso ড্যাশবোর্ড → আপনি Database → Tokens ট্যাব।",
      "Generate Token চাপুন।",
      "টোকেনটি একবারই দেখা যাবে — সেটি কপি করে সঙ্গে সঙ্গে secret হিসেবে সেভ করুন।",
      "ভুলে গেলে টোকেনটি ডিলিট করে নতুন করে বানান; পুরানো বদলে যায় না।",
    ],
    dashboardUrl: "https://turso.tech",
    dashboardLabelBn: "Turso টোকেন",
    envExample: 'TURSO_AUTH_TOKEN="eyJhbGciOi..."',
    ifMissingBn: "পাইপলাইন চলবে, কিন্তু কোনো পোস্ট ডাটাবেসে ঢুকবে না — সবকিছু ফাঁকা মনে হবে।",
  },
  {
    name: "FB_SESSION_COOKIE",
    labelBn: "Facebook সেশন কুকি",
    purposeBn:
      "উন্মুক্ত ফেসবুক পেজ স্ক্র্যাপ করার জন্য লগইন-সেশন। এটি না থাকলে স্ক্র্যাপার ফেসবুকে ঢুকতে পারে না।",
    requirement: "required",
    isSecretValue: true,
    howToBn: [
      "Chrome-এ ফেসবুক লগইন করুন (আলাদা একটি ব্রাউজার প্রোফাইল ব্যবহার করুন)।",
      "DevTools খুলুন: F12 → Console ট্যাব।",
      "এই কোডটি পেস্ট করে Enter চাপুন:\n    copy(document.cookie)",
      "ক্লিপবোর্ডে যা কপি হবে (c_user=...; xs=...; datr=...) সেটিই FB_SESSION_COOKIE।",
      "ফেসবুক সেশন কখনো শেয়ার, গিট-এ কমিট বা চ্যাটে পাঠাবেন না।",
    ],
    dashboardUrl: "https://facebook.com",
    dashboardLabelBn: "ফেসবুক (লগইন করে ডিভাইস টুল)",
    envExample: 'FB_SESSION_COOKIE="c_user=10000xxx; xs=AbCdEf...; datr=..."',
    costNoteBn: "ফ্রি। তবে ফেসবুক সেশন লক হলে নতুন লগইন দিয়ে আবার নিতে হয়।",
    ifMissingBn:
      "সব সোর্স স্ক্র্যাপ ব্যর্থ হবে; পাইপলাইন শূন্য পোস্ট নিয়ে শেষ হবে।",
  },
  {
    name: "LLM_PROVIDER_KEY",
    labelBn: "LLM প্রোভাইডার API কী (যেকোনো একটি)",
    purposeBn:
      "ফেসবুকের মূল পোস্ট পুনর্লিখন করে সংবাদ-ধাঁচের বিস্তারিত লেখা হয়। কোন প্রোভাইডারটি ব্যবহার হবে তা ডাটাবেসের লার্নিং_প্রোভাইডার সেটিং ঠিক করে।",
    requirement: "required",
    isSecretValue: true,
    howToBn: [
      "নিচের প্রোভাইডারদের যেকোনো একটি বেছে নিন — সবাই বাংলা লিখতে পারে।",
      "Google AI Studio → Get API key → Create API key (সবচেয়ে সহজ, ফ্রি টায়ার আছে)।",
      "অথবা Groq → console.groq.com → API Keys → Create API Key (খুব দ্রুত)।",
      "OpenRouter → openrouter.ai/keys → Create key (একটি কীতে অনেক মডেল)।",
      "Anthropic/OpenAI/Mistral-এর নিজস্ব কনসোল থেকেও নিতে পারেন।",
      "যে কী নিলেন সেই নামে secret যোগ করুন (যেমন GOOGLE_API_KEY বা GROQ_API_KEY)।",
    ],
    dashboardUrl: "https://aistudio.google.com/apikey",
    dashboardLabelBn: "Google AI Studio (ফ্রি, সবচেয়ে সহজ)",
    envExample:
      "GOOGLE_API_KEY=\"AIza...\"   # বা GROQ_API_KEY / OPENROUTER_API_KEY / ANTHROPIC_API_KEY",
    costNoteBn:
      "Google AI Studio ও Groq-এ ফ্রি টায়ার আছে যা ছোট সাইটের জন্য যথেষ্ট। OpenRouter পে-পর-টোকেন।",
    ifMissingBn:
      "পোস্ট স্ক্র্যাপ হবে, কিন্তু কোনো পুনর্লিখন হবে না — সব পোস্ট 'unreviewed' হিসেবে আটকে থাকবে।",
  },
  {
    name: "VERCEL_DEPLOY_HOOK_URL",
    labelBn: "Vercel Deploy Hook",
    purposeBn:
      "পাইপলাইন শেষ হলে ওয়েবসাইটে নতুন পোস্ট দেখানোর জন্য Vercel-কে সঙ্গে সঙ্গে জানায়।",
    requirement: "recommended",
    isSecretValue: true,
    howToBn: [
      "vercel.com → প্রজেক্ট (hoichoifeed) → Settings → Git → Deploy Hooks।",
      "Create Hook → নাম দিন (যেমন scraper-ping) → Create।",
      "যে URL পাবেন সেটি এখানে বসান। এটি ইতিমধ্যে নিরাপদ — শুধু POST করা যায়।",
      "এটি না দিলেও সাইট চলবে, শুধু নতুন পোস্ট পরের Vercel বিল্ডে দেখা যাবে।",
    ],
    dashboardUrl: "https://vercel.com",
    dashboardLabelBn: "Vercel → Settings → Git → Deploy Hooks",
    envExample:
      'VERCEL_DEPLOY_HOOK_URL="https://api.vercel.com/v1/integrations/deploy/..."',
    costNoteBn: "ফ্রি।",
    ifMissingBn:
      "সাইট ভাঙবে না; নতুন পোস্ট Vercel-এর পরবর্তী স্বয়ংক্রিয় বিল্ড পর্যন্ত দেখা যাবে না।",
  },
  {
    name: "VERCEL_TOKEN",
    labelBn: "Vercel API Token",
    purposeBn:
      "ওয়েব অ্যাপ ডিপ্লয় GitHub থেকে করতে। এটি না থাকলে Vercel নিজের Git ইন্টিগ্রেশন দিয়ে ডিপ্লয় করে, তাই বাধ্যতামূলক নয়।",
    requirement: "optional",
    isSecretValue: true,
    howToBn: [
      "vercel.com → Account Settings → Tokens → Create।",
      "Scope: নিজের টিম সিলেক্ট করুন।",
      "তৈরি হওয়া টোকেনটি একবারই দেখা যাবে, কপি করে রাখুন।",
    ],
    dashboardUrl: "https://vercel.com/account/tokens",
    dashboardLabelBn: "Vercel টোকেন",
    envExample: 'VERCEL_TOKEN="xxxxxxxx"',
    ifMissingBn: "ডিপ্লয় ওয়ার্কফ্লো 'not configured' নোটিস দেবে; Vercel নিজে ডিপ্লয় করবে।",
  },
  {
    name: "VERCEL_ORG_ID",
    labelBn: "Vercel Org ID",
    purposeBn: "Vercel টোকেনের সঙ্গে যুক্ত করতে হলে টিম আইডি লাগে।",
    requirement: "optional",
    isSecretValue: false,
    howToBn: [
      "vercel.com → প্রজেক্ট → Settings → General।",
      "Project ID ও Org ID দুটোই এক জায়গায় দেখা যাবে।",
      "যেটার পাশে 'orgId' লেখা সেটাই এখানে বসান।",
    ],
    dashboardUrl: "https://vercel.com",
    dashboardLabelBn: "Vercel → Settings → General",
    envExample: 'VERCEL_ORG_ID="team_xxxxxxxx"',
    ifMissingBn: "ডিপ্লয় ওয়ার্কফ্লো 'not configured' নোটিস দেবে।",
  },
  {
    name: "VERCEL_PROJECT_ID",
    labelBn: "Vercel Project ID",
    purposeBn: "কোন প্রজেক্টে ডিপ্লয় করতে হবে তা নির্দেশ করে।",
    requirement: "optional",
    isSecretValue: false,
    howToBn: [
      "vercel.com → প্রজেক্ট (hoichoifeed) খুলুন।",
      "Settings → General ট্যাবে যান।",
      "'Project ID' লেখা মানটি কপি করুন — এটি vercel CLI-এর প্রজেক্ট শনাক্ত করার জন্য।",
    ],
    dashboardUrl: "https://vercel.com",
    dashboardLabelBn: "Vercel → Settings → General",
    envExample: 'VERCEL_PROJECT_ID="prj_xxxxxxxx"',
    ifMissingBn: "ডিপ্লয় ওয়ার্কফ্লো 'not configured' নোটিস দেবে।",
  },
  {
    name: "GH_TRIGGER_TOKEN",
    labelBn: "GitHub Trigger Token (ওয়েব সাইটের জন্য)",
    purposeBn:
      "ওয়েবসাইটের 'Run pipeline' বাটন চাপলে GitHub-কে সরাসরি বলে দেয় যেন স্ক্র্যাপ চালু হয়। এটি ওয়েব অ্যাপে সেট করতে হয়, Actions secret-এ নয়।",
    requirement: "optional",
    isSecretValue: true,
    howToBn: [
      "github.com → Settings (আপনার প্রোফাইল) → Developer settings।",
      "Personal access tokens → Tokens (classic) → Generate new token (classic)।",
      "Scope: repo চেক করুন (repository_dispatch পাঠাতে এটি লাগে)।",
      "টোকেনটি Vercel-এর প্রজেক্ট → Settings → Environment Variables-এ যোগ করুন, নাম দিন GH_TRIGGER_TOKEN।",
      "সাথে GH_REPO=bugsfreeweb/Hoichoi ও যোগ করুন।",
    ],
    dashboardUrl: "https://github.com/settings/tokens",
    dashboardLabelBn: "GitHub PAT (classic)",
    envExample: 'GH_TRIGGER_TOKEN="ghp_..."\nGH_REPO="bugsfreeweb/Hoichoi"',
    ifMissingBn:
      "ওয়েবসাইটের 'Run pipeline' বাটন কাজ করবে না; লোকালি `pnpm scrape` দিয়ে স্ক্র্যাপ করতে হবে।",
  },
];

/** Whether a spec is satisfied by the given set of present secret names. */
export function specSatisfied(spec: SecretSpec, present: string[]): boolean {
  if (spec.requirement !== "required") return true;
  const names = spec.name === "LLM_PROVIDER_KEY" ? LLM_SECRET_NAMES : [spec.name];
  return names.some((n) => present.includes(n));
}
