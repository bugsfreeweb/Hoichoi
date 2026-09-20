import { REPORT_REASONS, type ReportReason, type ReportStatus } from "./moderation-types";

/**
 * Compact seed dataset shared by /api/setup for BOTH drivers (Postgres + Turso).
 * Timestamps are expressed as "hours/days ago" and converted per dialect.
 */

export type SeedArticle = {
  title: string;
  dek: string;
  body: string;
  category: string;
  location: string;
  sourceName: string;
  fbExcerpt: string;
  fbAuthor: string;
  imageUrl: string;
  imageCredit: string;
  hash: string;
  readingMinutes: number;
  featured: boolean;
  status: "published" | "pending" | "duplicate";
  ageH: number; // hours before now (collected)
  pubAgeH: number | null; // hours before now (published)
};

export const SEED_ARTICLES: SeedArticle[] = [
  {
    title:
      "নিখোঁজের ছয় ঘণ্টায় ফিরে পেল বাবা-মা: সিসি ক্যামেরা আর প্রতিবেশীর সতর্কতায় উদ্ধার শিশু",
    dek: "মিরপুরে স্কুলফেরত পথে নিখোঁজ হওয়া শিশু ছয় ঘণ্টার মধ্যেই বাড়ি ফিরেছে। দ্রুত সাড়া কীভাবে সম্ভব হলো — আর নিখোঁজের প্রথম এক ঘণ্টায় করণীয় জেনে নিন।",
    body:
      "মঙ্গলবার বিকেলে মিরপুর-১০ এলাকায় স্কুল থেকে ফেরার পথে ৮ বছরের ওই শিশুকে খুঁজে পাননি পরিবারের লোকজন। পরিবার দ্রুত নিকটতম থানায় অভিযোগ দেয় এবং স্থানীয়রা সামাজিক মাধ্যমে শিশুর সাম্প্রতিক ছবি ছড়িয়ে দেন।\n\nরাতে এলাকার একটি ব্যবসা প্রতিষ্ঠানের সিসি ক্যামেরার ফুটেজে মেলে গুরুত্বপূর্ণ সূত্র — শিশুটিকে দেখা যায় পরিচিত এক প্রতিবেশীর সঙ্গে হেঁটে যেতে। উদ্বেগে পড়ে শিশুটি পরিচিত বাসায় আস্তরণ নিয়েছিল; রাত ১১টার মধ্যেই তাকে বাড়ি ফিরিয়ে আনা হয়। সে সম্পূর্ণ সুস্থ।\n\nশিশু নিখোঁজ হলে প্রথম এক ঘণ্টাই সবচেয়ে জরুরি — সঙ্গে সঙ্গে থানায় লিখিত অভিযোগ, সাম্প্রতিক ছবি প্রচার, কাছাকাছি সিসি ক্যামেরার তালিকা এবং জাতীয় জরুরি সেবা ৯৯৯-এ কল। শিশু সহায়তা হেল্পলাইন ১০৯৮-ও সার্বক্ষণিক সাড়া দেয়।",
    category: "child",
    location: "ঢাকা · মিরপুর",
    sourceName: "মিরপুর আপডেট (ফেসবুক পেজ)",
    fbExcerpt:
      "জরুরি!! মিরপুর ১০ এ ১টা বাচ্চা হারাইছে বিকেলের দিকে। স্কুল থেইকা ফেরেনি এখনো। যে যে দেখবেন নম্বরে কল দেন প্লিজ। শেয়ার করেন সবাই যত পারেন।",
    fbAuthor: "রুমানা আক্তার",
    imageUrl:
      "https://images.pexels.com/photos/7232021/pexels-photo-7232021.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    imageCredit: "Pexels · 112 Uttar Pradesh",
    hash: "a1f3c9e2d4b78056",
    readingMinutes: 4,
    featured: true,
    status: "published",
    ageH: 7,
    pubAgeH: 6,
  },
  {
    title:
      "ভাইরাল ভিডিওতেই ধরা পড়ল ছিনতাইকারী: ফেসবুকের একটি পোস্ট যেভাবে হয়ে গেল প্রমাণ",
    dek: "পথচারীর মোবাইল ক্যামেরায় ধরা পড়া ১৪ সেকেন্ডের ভিডিও ছড়িয়ে পড়ার মাত্র ৩৬ ঘণ্টায় ছিনতাই চক্রের দুই সদস্য গ্রেপ্তার।",
    body:
      "ধানমন্ডির সাতমসজিদ সড়কে মোটরসাইকেলে এসে পথচারীর ব্যাগ ছিনিয়ে নেওয়ার ঘটনাটি ভবনের বারান্দা থেকে ভিডিও করেন এক স্থানীয় বাসিন্দা। কয়েক ঘণ্টায় ভিডিওটি লাখ পার হয়, মন্তব্যে অনেকেই মোটরসাইকেলের নম্বর প্লেট শনাক্ত করেন।\n\nসেই তথ্যের ভিত্তিতে অভিযান চালিয়ে পুলিশ শুক্রবার ভোরে দুজনকে গ্রেপ্তার করে; ব্যাগের জিনিসপত্র উদ্ধার হয়েছে। তদন্তকারী কর্মকর্তা জানান, সামাজিক মাধ্যমে ভাইরাল প্রমাণই মামলার প্রধান ভিত্তি হয়েছে।\n\nআইনজ্ঞদের পরামর্শ — এ ধরনের প্রমাণ ছাড়ার আগে ও পরে মূল ভিডিওটি অবশ্যই পুলিশে হস্তান্তর করতে হবে। সম্পাদনা বা ক্রপ করা ভিডিও প্রমাণ হিসেবে দুর্বল হয়।",
    category: "crime",
    location: "ঢাকা · ধানমন্ডি",
    sourceName: "ঢাকা ট্রাফিক অ্যালার্ট (গ্রুপ)",
    fbExcerpt:
      "ধানমন্ডি ২৭ নং রোডে এইমাত্র ছিনতাই!! ভিডিও করতে পারছিলাম। ছেলেটারা মটরসাইকলে। নম্বর প্লেট দেখেন। পুলিশে দেন কেউ প্লিজ।",
    fbAuthor: "তানভীর হোসেন",
    imageUrl:
      "https://images.pexels.com/photos/12777394/pexels-photo-12777394.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    imageCredit: "Pexels · Mathias Reding",
    hash: "b7d2e81f0a34c569",
    readingMinutes: 3,
    featured: false,
    status: "published",
    ageH: 9,
    pubAgeH: 8,
  },
  {
    title:
      "সন্দেহে ভাঙনের মুখে যাওয়া সংসার বাঁচাল তিন মাসের কাউন্সেলিং — বিশেষজ্ঞরা যা বললেন",
    dek: "সামাজিক মাধ্যমের একটি পুরোনো ছবি ঘিরে সন্দেহ, তারপর অহেতুক তর্ক — রাজশাহীর ওই দম্পতির সংসার প্রায় ভেঙেই যাচ্ছিল। শেষ পর্যন্ত টিকে গেল পেশাদার পরামর্শে।",
    body:
      "রাজশাহীর ওই দম্পতির অশান্তির সূত্রপাত একটি ভুল বোঝাবুঝি থেকে — স্ত্রীর ফেসবুকের একটি পুরোনো ছবি নিয়ে সন্দেহ, এরপর একের পর এক তর্ক। দুই পরিবারের হস্তক্ষেপও প্রথমে কাজে দেয়নি।\n\nসহকারী পরামর্শদাতার সঙ্গে নিয়মিত বৈঠক শুরুর পর ধীরে ধীরে বদলায় চিত্র। তিন মাসের কাউন্সেলিংয়ে উভয়েই শিখে ফেলেন একে অপরের কথা শোনার সংস্কৃতি; এখন সংসারটি আগের চেয়ে অনেক স্থিতাবস্থায়।\n\nসম্পর্ক বিশেষজ্ঞদের পর্যবেক্ষণ — সামাজিক মাধ্যমভিত্তিক সন্দেহে সিদ্ধান্ত নেওয়ার আগে খোলা কথোপকথন, দুই পক্ষের মানসিক চাপ চেনা ও দরকার হলে কাউন্সেলরের সহায়তা নেওয়াই টেকসই পথ।",
    category: "family",
    location: "রাজশাহী",
    sourceName: "রাজশাহীভুবন (পেজ)",
    fbExcerpt:
      "ভাই আমার বন্ধুর বিয়ে ভাঙছি কালকে। বউয়ের ফেসবুকে আগের ছবি দেখে বিশ্বাস করতে পারতাছে না। এখন কি করবো কেউ বলেন?",
    fbAuthor: "সাকিবুর রহমান",
    imageUrl:
      "https://images.pexels.com/photos/17733323/pexels-photo-17733323.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    imageCredit: "Pexels · Macx Converge",
    hash: "c9e47a1b5d803f2a",
    readingMinutes: 4,
    featured: false,
    status: "published",
    ageH: 12,
    pubAgeH: 11,
  },
  {
    title:
      "নারীর ওপর হেনস্তার ভিডিও ভাইরালের পর: আইন কী বলে, ভুক্তভোগীর ধাপে ধাপে করণীয়",
    dek: "ভিডিও ভাইরাল হওয়ার পর সবচেয়ে বড় প্রশ্ন — এরপর কী হবে? প্রমাণ সংরক্ষণ থেকে জিডি, আইনি ধাপগুলো ও বিনামূল্যের সহায়তা নিয়ে এই ব্যাখ্যা।",
    body:
      "সম্প্রতি একটি হেনস্তার ভিডিও সামাজিক মাধ্যমে ছড়িয়ে পড়ার পর করণীয় নিয়ে হাজারো মন্তব্য পড়েছে। কর্তব্য তালিকাটা আসলে সহজ, কিন্তু সঠিক ক্রম জরুরি — প্রথমে নিরাপত্তা নিশ্চিত করুন, তারপর প্রমাণ সংরক্ষণ।\n\nআইনজ্ঞদের তালিকা: ১) দ্রুত কাছের থানায় জিডি করুন — অনলাইনে জিডিও সম্ভব, ২) মূল ভিডিও/স্ক্রিনশট সংরক্ষণ করুন, সম্পাদনা করবেন না, ৩) প্রয়োজনে ডাক্তারি রিপোর্ট রাখুন, ৪) মামলার ধাপগুলোর নথি রাখুন।\n\nসহায়তা পাওয়া যাবে নারী ও শিশু নির্যাতন প্রতিরোধ হেল্পলাইন ১০৯-এ, জাতীয় জরুরি সেবা ৯৯৯-এ এবং জেলা আইন সহায়তা কার্যালয়ে — সবই বিনামূল্যে। ভিডিও ভাইরাল করা ঘটনার বিচার নয়; বিচার হয় আদালতে।",
    category: "crime",
    location: "ঢাকা",
    sourceName: "আইনি সহায়তা বাংলা (পেজ)",
    fbExcerpt:
      "ভিডিওটা দেখছেন সবাই। এতো কথা বললে হবে না আইন কি বলে জানেন কেউ? মেয়েটার পরিবার কি এখন থানায় যাবে নাকি সরাসরি কোর্টে?",
    fbAuthor: "নুসরাত জাহান",
    imageUrl:
      "https://images.pexels.com/photos/38150955/pexels-photo-38150955.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    imageCredit: "Pexels · Александр Лич",
    hash: "d4f8902c7e15a63b",
    readingMinutes: 4,
    featured: false,
    status: "published",
    ageH: 15,
    pubAgeH: 14,
  },
  {
    title:
      "কুমিল্লার সেই ‘অপহরণ’ ভিডিও আসলে কী ছিল? গুজবের পেছনে সত্যটা খুঁজলাম আমরা",
    dek: "সপ্তাহজুড়ে ভাইরাল ভিডিওতে দাবি করা হয়েছে — প্রকাশ্য দিবালোকে শিশু অপহরণ। আমাদের যাচাইয়ে উঠে এসেছে ভিন্ন চিত্র: পারিবারিক ভুল বোঝাবুঝি, যা গুজবে পরিণত হয়।",
    body:
      "গত সপ্তাহে কুমিল্লার একটি জনবহুল সড়কের ৩২ সেকেন্ডের ভিডিও ছড়িয়ে পড়ে প্রচণ্ড আতঙ্ক নিয়ে — ক্যাপশনে লেখা ছিল ‘প্রকাশ্যে শিশু অপহরণ’।\n\nআমাদের যাচাইয়ে থানার নথি ও স্থানীয় সিসিতে মিলেছে ভিন্ন তথ্য — শিশুটিকে কারা নয়, তার নিজ বাবাই ফেরত নিয়ে যাচ্ছিলেন বিবাহবিচ্ছেদ-পরবর্তী জটিলতায়। উভয় পক্ষ পরে থানায় এসে সমঝোতায় পৌঁছেছেন; শিশু এখন নিরাপদে।\n\nগুজব চেনার তিনটি লক্ষণ জরুরি — সময়-তারিখ বিহীন ক্যাপশন, ‘অবশ্যই শেয়ার করুন’ ধাঁচের চাপ, এবং স্থানীয় সূত্রের অনুপস্থিতি। শেয়ারের আগে দশ সেকেন্ডের যাচাই নিজেরও আতঙ্ক কমায়।",
    category: "viral",
    location: "কুমিল্লা",
    sourceName: "কুমিল্লা টক (গ্রুপ)",
    fbExcerpt:
      "কুমিল্লায় আজকে দুপুরে ছেলে তুলে নিয়া গেছে সবার চোখের সামনে!!! ভিডিও দেখেন। অবশ্যই শেয়ার করবেন। আল্লাহ রক্ষা করুক।",
    fbAuthor: "ফয়সাল আহমেদ",
    imageUrl:
      "https://images.pexels.com/photos/14747950/pexels-photo-14747950.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    imageCredit: "Pexels · Connor Scott McManus",
    hash: "f2b84d7a1c96e035",
    readingMinutes: 4,
    featured: false,
    status: "published",
    ageH: 21,
    pubAgeH: 20,
  },
  {
    title:
      "চট্টগ্রামের ভাইরাল সড়ক দুর্ঘটনার ভিডিও: তথ্য যাচাই চলছে, পুনর্লিখন সারিতে",
    dek: "সকাল থেকে ছড়ানো ভিডিওটির সময়-স্থান যাচাই চলছে — ক্যাপশন ও প্রাথমিক তথ্যের অমিল থাকায় আইটেমটি ফ্যাক্ট-গেট অপেক্ষায় আছে।",
    body:
      "চট্টগ্রামের একটি ব্যস্ত সড়কে ছোট দুর্ঘটনার ভিডিও সকাল থেকে ভাইরাল। ভিডিওর ক্যাপশনে বড় দুর্ঘটনার দাবি করা হলেও প্রাথমিক তথ্যে তার মিল পাওয়া যায়নি।\n\nহাসপাতাল ও পুলিশের প্রাথমিক জবাবে হালকা আহতের খবর পাওয়া গেছে, মৃত্যুর অভিযোগ অসত্য। ভিডিওর সঠিক তারিখ নিশ্চিত না হওয়া পর্যন্ত আইটেমটি রিভিউ সারিতেই থাকবে — অটোমেটেড প্রবাহের ফ্যাক্ট-গেট নিয়মেই।\n\nপাঠকের অনুরোধ — অযাচাইকৃত ভিডিও ‘ব্রেকিং’ আখ্যা দিয়ে ছড়াবেন না; ভুল তথ্যের প্রথম খরচটা পোষে তৎক্ষণাৎ তথ্যহীন আতঙ্ক।",
    category: "viral",
    location: "চট্টগ্রাম",
    sourceName: "চট্টগ্রাম লাইভ (পেজ)",
    fbExcerpt:
      "আজকে সকালে চৌমুহনীতে ভয়ংকর এক্সিডেন্ট!! ভিডিও আছে। শেয়ার করেন। কেউ জানেন ভিক্টিমরা কেমন আছে??",
    fbAuthor: "ইমরান চৌধুরী",
    imageUrl:
      "https://images.pexels.com/photos/37736142/pexels-photo-37736142.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    imageCredit: "Pexels · Shaqeeb Al Hasan",
    hash: "d9f28b4e6a15c073",
    readingMinutes: 2,
    featured: false,
    status: "pending",
    ageH: 2,
    pubAgeH: null,
  },
];

/** [name, kind, fbId, handle, topics, checkedMinAgo, postedMinAgo, status, postsToday, health, note] */
export const SEED_SOURCES: Array<[
  string, "page" | "group", string, string, string, number, number,
  "watching" | "paused" | "error", number, number, string,
]> = [
  ["মিরপুর আপডেট", "page", "1744552188412", "@mirpur-update", "শিশু · স্থানীয়", 26, 420, "watching", 3, 98, "প্রধান শিশু-সুরক্ষা সোর্স"],
  ["ঢাকা ট্রাফিক অ্যালার্ট", "group", "9921880317101", "@dhaka-traffic", "অপরাধ · রাস্তা", 26, 540, "watching", 4, 94, "ভিডিও-প্রধান গ্রুপ"],
  ["রাজশাহীভুবন", "page", "4481209930012", "@rajshahibhuvan", "পরিবার · সমাজ", 28, 720, "watching", 1, 91, ""],
  ["আইনি সহায়তা বাংলা", "page", "3301882291044", "@legal-aid-bd", "অপরাধ · আইন", 30, 900, "watching", 2, 96, "ফ্যাক্ট-গেট কঠোর"],
  ["প্যারেন্টিং বাংলা", "group", "7710021883301", "@parenting-bd", "শিশু · অভিভাবক", 32, 1080, "watching", 5, 89, ""],
  ["কুমিল্লা টক", "group", "6100299338841", "@cumilla-talk", "ভাইরাল · গুজব", 34, 1260, "watching", 6, 72, "গুজব ফিল্টার অন"],
  ["সিলেট সংবাদচক্র", "page", "8810221993004", "@sylhet-songbad", "পরিবার · সালিশ", 120, 1800, "paused", 0, 80, "ম্যানুয়াল বিরতি"],
  ["ঢাকা কমিউনিটি অ্যালার্ট", "group", "5501882299001", "@dhaka-alert", "শিশু · পুনরাবৃত্তি", 12, 240, "error", 1, 41, "Graph rate-limit 429"],
];

export const SEED_KEYS: Array<[string, string, string, string, string, "desktop" | "web" | "both", string, string, string]> = [
  ["Facebook Graph টোকেন", "facebook", "FB_GRAPH_TOKEN", "EAAx••••••••X7q2", "EAADEMOxK7q2mZq9vL0demo", "desktop", "rotate", "৩৪ দিন আগে", "পেজ রিড-স্কোপ · ৬০ দিনের টোকেন"],
  ["OpenAI API কী (রিরাইট)", "llm", "OPENAI_API_KEY", "sk-proj-••••••8F3d", "sk-proj-demo4xK9rT7bMzQ8F3d", "desktop", "active", "৯ দিন আগে", "মডেল: gpt-4o-mini · temp 0.3"],
  ["AI Agent PAT (কনটেন্ট)", "github", "AGENT_CONTENT_PAT", "ghp_••••••9aKl", "ghp_demo9aKlPRm2xQwe7Tn", "desktop", "active", "১৮ দিন আগে", "রিপো: hoichoi-content"],
  ["Web API টোকেন", "vercel", "WEB_API_TOKEN", "vcl_••••••Qm81", "vcl_demoQm81Zth4Lok6xN", "web", "active", "২২ দিন আগে", "ডিপ্লয় স্ট্যাটাস রিড-অনলি"],
  ["Turso ডাটাবেস URL", "database", "TURSO_DATABASE_URL", "libsql://••••turso.io", "libsql://demo.turso.io", "both", "active", "৪৫ দিন আগে", "libSQL · ফ্রি টিয়ার"],
  ["Cloudinary (শট CDN)", "storage", "CLOUDINARY_URL", "cloudinary://••••@dk2demo", "cloudinary://demo_key:demo_secret@dk2demo", "both", "rotate", "৬১ দিন আগে", "স্ক্রিনশট হোস্টিং"],
  ["ভল্ট মাস্টার কী", "vault", "VAULT_MASTER_KEY", "•••••••••••• (শুধু env)", "DEMO-MASTER-32B-F8A1C4E7", "both", "active", "৯০ দিন আগে", "AES-256 · ডেস্কটপ env থেকে"],
];

/** [startedMinAgo, trigger, status, collected, duplicates, published, durationSec, note] */
export const SEED_RUNS: Array<[number, string, string, number, number, number, number, string]> = [
  [26, "cron", "success", 5, 1, 3, 268, "নতুন ৩টি প্রকাশিত · চট্টগ্রাম ভিডিও ফ্যাক্ট-গেটে"],
  [146, "cron", "success", 4, 2, 2, 249, "ডুপ্লিকেট: একই ঘটনার দ্বিতীয় ভিডিও"],
  [266, "cron", "success", 6, 1, 4, 302, "সিমহ্যাশে নিকট-দ্বৈত ব্লক"],
  [386, "manual", "success", 3, 0, 3, 214, "অ্যাডমিন ম্যানুয়াল রান · দ্রুত সম্পন্ন"],
  [506, "cron", "partial", 5, 0, 4, 341, "১টি ছবি ডাউনলোড টাইমআউট · পুনঃচেষ্টা সারিতে"],
];

/** [minAgo, level, stage, message] */
export const SEED_LOGS: Array<[number, "info" | "ok" | "warn" | "err", string, string]> = [
  [2, "ok", "SHIP", "Web READY · hoichoi.example · ISR 8.1s"],
  [4, "ok", "LLM", "পুনর্লিখন সম্পন্ন · fact-gate 0.94 · 18s"],
  [6, "ok", "DEDUP", "simhash 0.41 · PASS · unique"],
  [7, "warn", "DEDUP", "simhash 0.91 · BLOCK · মিরপুর নিখোঁজ পুনরাবৃত্তি"],
  [8, "ok", "HASH", "sha256 a1f3c9e2 · NEW"],
  [9, "ok", "SHOT", "Playwright capture shot_0011.png · 1440×900"],
  [11, "ok", "FETCH", "মিরপুর আপডেট · 2 new · ঢাকা ট্রাফিক · 1 video"],
  [14, "info", "CRON", "manual collection · Asia/Dhaka"],
];

/** [articleId, author, body, likes, minAgo] */
export const SEED_COMMENTS: Array<[number, string, string, number, number]> = [
  [1, "রুবাইয়া হক", "আলহামদুলিল্লাহ, বাচ্চা ফিরেছে। সিসি ক্যামেরার ভূমিকা আসলেই অবিস্মরণীয় — প্রতিটি দোকানে লাগানো উচিত।", 24, 30],
  [1, "মাহমুদ হাসান", "প্রথম এক ঘণ্টার তালিকাটা খুব কাজের। ১০৯৮ নম্বরটা আগে জানা ছিল না, ধন্যবাদ।", 17, 60],
  [1, "সনিয়া রহমান", "নিখোঁজের পোস্ট শেয়ার করার সময় ছবি স্পষ্ট রাখুন, টাইম-সারি দিন — উদ্ধারে দ্রুত কাজ হয়।", 9, 180],
  [2, "আরিফুল ইসলাম", "ভিডিও ক্রপ না করে মূল ফাইল পুলিশে দেওয়াটা সবচেয়ে জরুরি — লাইনে নম্বর প্লেটটা স্পষ্ট ছিল।", 31, 40],
  [2, "নাঈম শেখ", "একটা জিনিস মনে রাখবেন: ভাইরাল হওয়া মানে বিচার নয়, বিচার আদালতে। প্রমাণ পুলিশে দিন।", 12, 120],
  [3, "ফারহানা আক্তার", "কাউন্সেলিং নিয়ে এত কথা হয় না, আসলে একই পরিবারের মানুষগুলো অনেক উপকার পায়। ভালো উদ্যোগ।", 8, 300],
];

/**
 * [articleId, reporterName, reporterEmail, reason, details, status, minAgo]
 * Reasons are read from the canonical REPORT_REASONS list, so the demo queue can
 * never hold a value the public API would reject.
 */
export const SEED_REPORTS: Array<[
  number, string, string, ReportReason, string, ReportStatus, number,
]> = [
  [1, "সাদিয়া ইসলাম", "sadia.islam@example.com", REPORT_REASONS[0], "সময় ও এলাকার একটি অংশ মূল পোস্টের সঙ্গে মিলছে না — সম্পাদকীয় যাচাই দরকার।", "open", 65],
  [2, "রাকিব হাসান", "rakib.hasan@example.com", REPORT_REASONS[2], "ভিডিও ক্লিপটি অনুমতি ছাড়া ব্যবহার হয়েছে বলে দাবি; ক্রেডিট লাইন যুক্ত করা উচিত।", "reviewed", 220],
  [3, "নুসরাত জাহান", "nusrat.jahan@example.com", REPORT_REASONS[3], "মন্তব্য অংশে একই ওষুধের বিজ্ঞাপন বারবার আসছে — ফিল্টার দরকার।", "dismissed", 1500],
];
