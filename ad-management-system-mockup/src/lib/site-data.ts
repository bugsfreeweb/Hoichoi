export interface Category {
  slug: string;
  name: string;
  color: string;
  count: number;
}

export interface Post {
  slug: string;
  title: string;
  dek: string;
  category: string;
  source: string;
  hash: string;
  shot: string;
  readMin: number;
  publishedAt: string;
  teaser: string;
  body: string[];
  keyPoints: string[];
  raw: string;
  author: string;
  originUrl: string;
}

export const CATEGORIES: Category[] = [
  { slug: "child-sexual-abuse", name: "যৌন নির্যাতন", color: "#2563eb", count: 17 },
  { slug: "extramarital-crime", name: "পরকীয়া অপরাধ", color: "#d2202c", count: 3 },
  { slug: "missing-children", name: "নিখোঁজ শিশু", color: "#0d9488", count: 9 },
  { slug: "health", name: "স্বাস্থ্য", color: "#5f8f0e", count: 12 },
  { slug: "education", name: "শিক্ষা", color: "#b45309", count: 8 },
  { slug: "sports", name: "খেলাধুলা", color: "#0369a1", count: 5 },
  { slug: "environment", name: "পরিবেশ ও দুর্যোগ", color: "#047857", count: 6 },
  { slug: "tech", name: "প্রযুক্তি", color: "#4f46e5", count: 21 },
  { slug: "viral", name: "ভাইরাল", color: "#be123c", count: 14 },
  { slug: "ai", name: "কৃত্রিম বুদ্ধিমত্তা", color: "#037c1b", count: 19 },
  { slug: "law-order", name: "আইন ও বিচার", color: "#7c2d12", count: 7 },
  { slug: "inspiration", name: "অনুপ্রেরণা", color: "#a21caf", count: 4 },
];

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.slug, c]));

const LOREM_BN = [
  "ঘটনাটি নিয়ে সামাজিক যোগাযোগমাধ্যমে ব্যাপক আলোচনা শুরু হলে হৈচৈ ডেস্ক সংশ্লিষ্ট সূত্রের সঙ্গে যোগাযোগ করে। প্রাথমিক যাচাইয়ে দেখা যায়, ছড়িয়ে পড়া তথ্যের একাংশ সঠিক হলেও বাকিটুকু প্রেক্ষাপট ছাড়া উপস্থাপন করা হয়েছিল।",
  "সূত্র জানায়, মূল পোস্টটি প্রথম প্রকাশিত হয় স্থানীয় সময় সকালে। এরপর কয়েক ঘণ্টার মধ্যেই সেটি কয়েক হাজারবার শেয়ার হয়। শেয়ার হওয়া সংস্করণগুলোর মধ্যে অন্তত তিনটি ভিন্ন শিরোনাম পাওয়া গেছে, যার দুটিতেই তথ্যের বিকৃতি ছিল।",
  "হৈচৈর ডুপ্লিকেট-গেট পেরিয়ে আসা রেকর্ডটি SHA-256 ও SimHash দুই স্তরেই নতুন হিসেবে চিহ্নিত হয়। এরপর পুনর্লিখন ডেস্কে ফ্যাক্ট-গেট ০.৯০ থ্রেশহোল্ড অতিক্রম করে এটি প্রকাশের জন্য অনুমোদিত হয়।",
  "বিশ্লেষকদের মতে, এ ধরনের ঘটনায় দ্রুত তথ্য যাচাই না করে শেয়ার করলে ভুল তথ্য ছড়িয়ে পড়ার ঝুঁকি বহুগুণ বেড়ে যায়। তাঁরা পাঠকদের মূল সূত্র যাচাই করে তবেই প্রতিক্রিয়া জানানোর পরামর্শ দিয়েছেন।",
  "প্রতিবেদনটি প্রকাশের সময় পর্যন্ত সংশ্লিষ্ট কর্তৃপক্ষের আনুষ্ঠানিক কোনো বিবৃতি পাওয়া যায়নি। নতুন তথ্য পাওয়া গেলে এই প্রতিবেদন হালনাগাদ করা হবে।",
];

function mk(
  slug: string,
  title: string,
  dek: string,
  category: string,
  source: string,
  hash: string,
  shot: string,
  teaser: string,
  raw: string
): Post {
  return {
    slug,
    title,
    dek,
    category,
    source,
    hash,
    shot,
    readMin: 1 + (hash.charCodeAt(0) % 3),
    publishedAt: "১১ অক্টোবর ২০২৬, ১১:৪৫ AM",
    teaser,
    body: LOREM_BN,
    keyPoints: [
      "কাঁচা ফিডের ভুল বানান ও দ্ব্যর্থক ভাষা বাদ দিয়ে সংবাদমাধ্যমের নির্ভরযোগ্য বাংলায় রচনা।",
      "ঘটনার সময়, স্থান ও প্রেক্ষাপট সংশ্লিষ্ট বিভাগভুক্ত তথ্য হিসেবে সাজানো হয়েছে।",
      "সংবেদনশীল বিষয়ে অভিযুক্তের নাম-পরিচয় প্রকাশ না করে আইনি ও নৈতিক শৃঙ্খলা মেনে লেখা।",
    ],
    raw,
    author: "হৈচৈ ডেস্ক",
    originUrl: "https://news.ycombinator.com",
  };
}

export const POSTS: Post[] = [
  mk(
    "cortextai-97c8d4",
    "CortextAI – ব্যক্তিগত, অফলাইন এআই ওয়ার্কস্পেসের ঘোষণা হ্যাকার নিউজে",
    "হ্যাকার নিউজে একটি পোস্টে CortextAI-কে ইমেইল, নোট, টাস্ক এবং ফাইলের জন্য ব্যক্তিগত, অফলাইন এআই ওয়ার্কস্পেস হিসেবে উপস্থাপন করা হয়েছে।",
    "ai",
    "Hacker News",
    "97c8d4ab",
    "3D0418C2",
    "হ্যাকার নিউজে CortextAI নামের একটি টুল শেয়ার করা হয়েছে, যা সম্পূর্ণ অফলাইনে ব্যক্তিগত ডেটা নিয়ে কাজ করে।",
    "ভাই একটা নতুন AI tool পাইসি!! পুরা অফলাইন চলে, ডাটা কোথাও যায় না 😱 সবাই try koren link comment e"
  ),
  mk(
    "api-3-7-flash-3-8-flash-3-5-3-6-6ac37f",
    "গুগল জেমিনি API‑এর সংস্করণ রাউটিং আপডেট: 3.7‑flash → 3.8‑flash, 3.5 → 3.6",
    "গুগল জেমিনি API-র রিলিজ নোটে জানানো হয়েছে যে 3.7‑flash এখন 3.8‑flash-এ এবং 3.5 সংস্করণ 3.6-এ রুট হবে।",
    "ai",
    "Hacker News",
    "6ac37f10",
    "A91B7E34",
    "পুরোনো সংস্করণের অনুরোধ স্বয়ংক্রিয়ভাবে নতুন সংস্করণে পাঠানো হবে বলে রিলিজ নোটে উল্লেখ করা হয়েছে।",
    "Gemini er version abar change hoise... ekhon 3.8 flash. code change korte hobe naki automatic?"
  ),
  mk(
    "localci-0010e1",
    "Localci – গিটহাব অ্যাকশন জব লোকালভাবে চালানোর নতুন টুল",
    "Hacker News-এ petersunde তার “Localci” নামের টুলটি শেয়ার করেছেন, যা গিটহাব অ্যাকশন জব স্থানীয় মেশিনে চালাতে সাহায্য করে।",
    "tech",
    "Hacker News",
    "0010e1cc",
    "7F2C0D91",
    "CI পাইপলাইন ডিবাগ করতে বারবার পুশ করার ঝামেলা কমাতে টুলটি তৈরি করা হয়েছে বলে জানানো হয়েছে।",
    "github action debug korte korte jibon shesh 😭 ei tool ta try korlam, local e kaj kore"
  ),
  mk(
    "post-ccae4b",
    "ইলেকট্রিক দুইচাকার গাড়ি কিছু নারীর চলাচল বাড়িয়ে দিল, তবে অধিকাংশের জন্য এখনও দূরের স্বপ্ন",
    "একটি প্রতিবেদনে বলা হয়েছে, ইলেকট্রিক স্কুটার কিছু নারীর যাতায়াত সহজ করলেও দামের কারণে বেশিরভাগের নাগালের বাইরে।",
    "environment",
    "Facebook Page",
    "ccae4b22",
    "B4410E77",
    "গ্রামীণ এলাকায় চার্জিং সুবিধার অভাবও বড় বাধা হিসেবে চিহ্নিত হয়েছে।",
    "Amader elakay ekhon onek meye scooty chalay. valo lage dekhte. but dam onek beshi 😔"
  ),
  mk(
    "substack-link-ebb4a9",
    "হ্যাকার নিউজে Substack নিবন্ধের লিঙ্ক শেয়ার করা হল",
    "হ্যাকার নিউজে ব্যবহারকারী ‘zdw’ একটি লিঙ্ক শেয়ার করেছেন, যা Substack‑এর ‘The Awesome Power of Constraint Solvers’ শিরোনামের নিবন্ধের দিকে নির্দেশ করে।",
    "tech",
    "Hacker News",
    "ebb4a9a3",
    "C8812D40",
    "কনস্ট্রেইন্ট সলভার ব্যবহার করে জটিল সমস্যা সমাধানের কৌশল নিয়ে নিবন্ধটি লেখা হয়েছে।",
    "constraint solver er power dekhe obak holam. puzzle solve kora ekdom easy hoye jay"
  ),
  mk(
    "ai-lawsuits-9ab120",
    "এআই কোম্পানিগুলোর বিরুদ্ধে সব মামলার তালিকা প্রকাশিত",
    "একটি উন্মুক্ত ডেটাবেসে কৃত্রিম বুদ্ধিমত্তা প্রতিষ্ঠানগুলোর বিরুদ্ধে দায়ের হওয়া মামলাগুলোর হালনাগাদ তালিকা প্রকাশ করা হয়েছে।",
    "law-order",
    "Hacker News",
    "9ab12077",
    "D1190A55",
    "কপিরাইট, গোপনীয়তা ও প্রতিযোগিতা আইন — তিন ধরনের অভিযোগই তালিকায় রয়েছে।",
    "AI company gulor birudhdhe eto mamla!! list ta dekhen, shocking"
  ),
  mk(
    "fast-mode-6c647a",
    "কৃত্রিম বুদ্ধিমত্তা সেবায় ‘ফাস্ট মোড’-এর কার্যকারিতা নিয়ে হ্যাকার নিউজে প্রশ্ন",
    "কৃত্রিম বুদ্ধিমত্তা প্রযুক্তিতে ‘ফাস্ট মোড’ বৈশিষ্ট্যটি আসলেই কার্যকর কি না তা নিয়ে প্রশ্ন তুলে হ্যাকার নিউজে একটি নতুন লিঙ্ক পোস্ট করা হয়েছে।",
    "ai",
    "Hacker News",
    "6c647a83",
    "E7730B12",
    "অনেক ব্যবহারকারী বলছেন, দ্রুত উত্তর পেতে গিয়ে নির্ভুলতা কমে যাচ্ছে।",
    "fast mode on korle answer quality kome jay mone hoy. apnader ki mone hoy?"
  ),
  mk(
    "sonicwall-sma1000-44ab01",
    "সোনিকওয়াল SMA1000-এ সর্বোচ্চ তীব্রতার দুর্বলতা এখন আক্রমণে ব্যবহৃত হচ্ছে",
    "নিরাপত্তা গবেষকেরা জানিয়েছেন, সোনিকওয়াল SMA1000 ডিভাইসে পাওয়া গুরুতর দুর্বলতাটি সক্রিয়ভাবে কাজে লাগানো হচ্ছে।",
    "tech",
    "Hacker News",
    "44ab0199",
    "F0092C68",
    "প্রতিষ্ঠানগুলোকে দ্রুত প্যাচ প্রয়োগের পরামর্শ দেওয়া হয়েছে।",
    "jader sonicwall ache tara ekhoni patch den!! active attack cholche"
  ),
  mk(
    "resident-evil-7712cd",
    "হ্যাকার নিউজে রেসিডেন্ট ইভিল প্রোটোটাইপ বিশ্লেষণ ভিডিও শেয়ার",
    "একটি দীর্ঘ ভিডিও বিশ্লেষণে রেসিডেন্ট ইভিল গেমের প্রাথমিক প্রোটোটাইপের অদেখা অংশ দেখানো হয়েছে।",
    "viral",
    "Hacker News",
    "7712cd04",
    "A2290F31",
    "গেম ইতিহাস সংরক্ষণের গুরুত্ব নিয়ে আলোচনা তৈরি করেছে ভিডিওটি।",
    "ei video ta must watch! resident evil er purano prototype dekhte pelam 🔥"
  ),
  mk(
    "ukraine-drone-5f31aa",
    "ইউক্রেনের ড্রোন আক্রমণে রাশিয়ার দ্বিতীয় বড় টেক সাইটে আঘাত",
    "সংবাদমাধ্যমের বরাতে জানা গেছে, ইউক্রেনীয় ড্রোন হামলায় রাশিয়ার একটি গুরুত্বপূর্ণ প্রযুক্তি স্থাপনা ক্ষতিগ্রস্ত হয়েছে।",
    "viral",
    "Facebook Page",
    "5f31aa90",
    "B9930C14",
    "স্থাপনাটিতে উৎপাদন সাময়িকভাবে বন্ধ রয়েছে বলে স্থানীয় সূত্র জানিয়েছে।",
    "abar drone attack. news e dekhlam boro ekta factory porse"
  ),
  mk(
    "nadella-brake-28aa41",
    "মাইক্রোসফটের সত্য নাদেলা AI-তে “ইমার্জেন্সি ব্রেক” দাবি",
    "একটি সাক্ষাৎকারে মাইক্রোসফট প্রধান নির্বাহী বলেছেন, কৃত্রিম বুদ্ধিমত্তার উন্নয়নে জরুরি থামার ব্যবস্থা থাকা দরকার।",
    "ai",
    "Hacker News",
    "28aa4160",
    "C4482E09",
    "নিয়ন্ত্রক কাঠামো নিয়েও তিনি মত দিয়েছেন বলে প্রতিবেদনে উল্লেখ আছে।",
    "Nadella bolse AI te emergency brake lagbe. shothik kotha boleche mone hoy"
  ),
  mk(
    "podcast-startup-13bb70",
    "পার্সোনালাইজড পডকাস্ট স্টার্টআপ ‘হাক্স’-এর দল ও প্রযুক্তি যুক্ত হলো বড় প্রতিষ্ঠানে",
    "একটি পডকাস্ট প্রযুক্তি স্টার্টআপের পুরো দল ও প্রযুক্তি অধিগ্রহণের ঘোষণা এসেছে।",
    "tech",
    "Hacker News",
    "13bb7021",
    "D7718A23",
    "চুক্তির আর্থিক পরিমাণ প্রকাশ করা হয়নি।",
    "aro ekta startup acquire hoye gelo. team shoho chole gelo"
  ),
  mk(
    "tumor-report-62cc08",
    "গলায় বড় টিউমার নিয়ে ৫০‑বছরী গৃহিণীর কষ্টের প্রতিবেদন",
    "চিকিৎসা ব্যয়ের অভাবে দীর্ঘদিন ধরে চিকিৎসা করাতে না পারা এক নারীর কথা উঠে এসেছে প্রতিবেদনে।",
    "health",
    "Facebook Page",
    "62cc0845",
    "E1180B77",
    "স্থানীয়রা সহায়তার আহ্বান জানিয়েছেন।",
    "ei apur jonno kichu korun please. tumor ta onek boro hoye gese 😢"
  ),
  mk(
    "renewable-policy-7a9d31",
    "দেশে নবায়নযোগ্য জ্বালানি সম্প্রসারণ ও নীতি সংস্কারের প্রয়োজনীয়তা",
    "একটি গবেষণা প্রতিবেদনে নবায়নযোগ্য জ্বালানির অংশ বাড়াতে নীতিগত সংস্কারের সুপারিশ করা হয়েছে।",
    "environment",
    "Online Newspaper",
    "7a9d3118",
    "F3360D52",
    "সৌর ও বায়ু — দুই খাতেই বিনিয়োগ বাড়ানোর কথা বলা হয়েছে।",
    "solar e invest korle future valo hobe. govt er policy lagbe"
  ),
  mk(
    "pronunciation-tool-91de42",
    "টমটের ফেসবুক পোস্টে শেয়ার করা ইংরেজি উচ্চারণের অনলাইন টুলের লিঙ্ক",
    "একটি ফেসবুক পোস্টে ইংরেজি শব্দের উচ্চারণ শেখার অনলাইন টুলের লিঙ্ক শেয়ার করা হয়েছে।",
    "education",
    "Facebook Page",
    "91de4277",
    "A5520E88",
    "টুলটি বিনামূল্যে ব্যবহার করা যায় বলে পোস্টে দাবি করা হয়েছে।",
    "English pronunciation shikhar free tool. amar onek kaje legeche 👍"
  ),
];

export const POST_MAP = Object.fromEntries(POSTS.map((p) => [p.slug, p]));

export const SITE_STATS = {
  collected: "১৯১",
  published: "১৬",
  duplicates: "০",
  comments: "০",
  lastRun: "১১:৪৫ AM",
};

export const PIPELINE = [
  { n: "01", t: "ফেসবুক ওয়াচলিস্ট", s: "১০ সোর্স · GRAPH READ" },
  { n: "02", t: "ডেস্কটপ কালেক্টর", s: "PLAYWRIGHT SHOT" },
  { n: "03", t: "ডুপ্লিকেট গেট", s: "SHA-256 × SIMHASH" },
  { n: "04", t: "পুনর্লিখন ডেস্ক", s: "LLM + FACT-GATE ০.৯০" },
  { n: "05", t: "AI ইঞ্জিন কমিট", s: "CONTENT/*.JSON" },
  { n: "06", t: "Web লাইভ", s: "ISR · ~৮ সে" },
];
