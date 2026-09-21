import { randomUUID } from "node:crypto";
import { getClient, nowIso } from "../src/client";

/**
 * Demo content — makes the public site + admin look alive without a real
 * Facebook scraper. Idempotent: wipes and re-inserts only demo-authored rows
 * (source names prefixed with "ডেমো").
 */

const hoursAgo = (n: number) =>
  new Date(Date.now() - n * 3_600_000).toISOString();

const daysAgo = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toISOString();

interface DemoPost {
  slug: string;
  category: "child-sexual-abuse" | "extramarital-crime" | "missing-children";
  title: string;
  summary: string;
  body: string;
  media: string;
  source: string;
  author: string;
  publishedHoursAgo: number;
  status: "published" | "pending_review" | "archived" | "removed";
  caseStatus?: "active" | "found" | "false-alarm" | "unresolved";
  safetyFlags?: string[];
  flags?: string[];
}

const pexels = (id: number, w = 1200, h = 615) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=${w}&h=${h}`;

const demoPosts: DemoPost[] = [
  {
    slug: "nikhonger-choy-ghontai-fire-ele",
    category: "missing-children",
    title: "নিখোঁজের ছয় ঘণ্টায় ফিরে পেল বাবা-মা: সিসি ক্যামেরা আর প্রতিবেশীর সতর্কতায় উদ্ধার শিশু",
    summary: "মিরপুরে স্কুলফেরত পথে নিখোঁজ হওয়া শিশু ছয় ঘণ্টার মধ্যেই বাড়ি ফিরেছে।",
    body:
      "মিরপুরে স্কুলফেরত পথে নিখোঁজ হওয়া শিশু ছয় ঘণ্টার মধ্যেই বাড়ি ফিরেছে। দ্রুত সাড়া কীভাবে সম্ভব হলো — আর নিখোঁজের প্রথম এক ঘণ্টায় করণীয় চারটি বিষয় জেনে নিন।\n\nঘটনা জানার পর পরিবার দ্রুত নিকটস্থ থানায় অভিযোগ দেয় এবং স্থানীয়রা সামাজিক মাধ্যমে শিশুর সাম্প্রতিক ছবি ছড়িয়ে দেন। রাতে এলাকার একটি ব্যবসা প্রতিষ্ঠানের সিসি ক্যামেরার ফুটেজে মেলে গুরুত্বপূর্ণ সূত্র — দেখা যায় শিশুটি পরিচিত এক প্রতিবেশীর সঙ্গে হেঁটে যাচ্ছিল।\n\nপরে জানা যায়, উদ্বেগে পড়ে শিশুটি প্রতিবেশের এক পরিচিত বাসায় আস্তানা নিয়েছিল; রাত ১১টার মধ্যেই তাকে ভালোবাসার সঙ্গে বাড়িতে ফিরিয়ে আনা হয়। সে সম্পূর্ণ সুস্থ ও নিরাপদ।\n\nযোগাযোগ: জাতীয় শিশু হেল্পলাইন ১০৯ · পুলিশ হেল্পলাইন ৯৯৯",
    media: pexels(7232021),
    source: "মিরপুর সংবাদ",
    author: "মো. রফিকুল ইসলাম",
    publishedHoursAgo: 6,
    status: "published",
    caseStatus: "found",
    safetyFlags: [],
  },
  {
    slug: "viral-video-tei-dhara-porlo-chintai-kari",
    category: "extramarital-crime",
    title: "ভাইরাল ভিডিওতেই ধরা পড়ল ছিনতাইকারী: ফেসবুকের একটি পোস্ট যেভাবে হয়ে গেল প্রমাণ",
    summary: "রাজধানীর এক ব্যস্ত সড়কে ছিনতাইয়ের ঘটনা সিসি টিভি ফুটেজে ধরা পড়েছে।",
    body:
      "রাজধানীর এক ব্যস্ত সড়কে ছিনতাইয়ের ঘটনা সিসি টিভি ফুটেজে ধরা পড়েছে। পরে একজন প্রত্যক্ষদর্শীর ফেসবুকে দেওয়া পোস্ট থেকে ঘটনার বিস্তারিত জানা যায়।\n\nপুলিশ জানিয়েছে, ভুক্তভোগীর অভিযোগের ভিত্তিতে তদন্ত শুরু হয়েছে এবং অভিযুক্ত ব্যক্তিকে শনাক্তের চেষ্টা চলছে। ফেসবুকে ছড়িয়ে পড়া ভিডিওটি প্রমাণ হিসেবে সংরক্ষণ করা হয়েছে।\n\nঅভিযোগ অনুযায়ী, ঘটনার সময় এলাকায় জটলা ছিল এবং ক্যামেরার ফুটেজে অভিযুক্তর পোশাক ও চলাফেরা স্পষ্ট দেখা যায়। পুলিশের বরাত দিয়ে জানা গেছে, প্রাথমিক তথ্যের ভিত্তিতেই অভিযুক্তকে চিহ্নিত করা সম্ভব হয়েছে।\n\nএ ঘটনায় মামলার প্রস্তুতি চলছে বলে সংশ্লিষ্ট থানা সূত্রে জানা গেছে।",
    media: pexels(2422588),
    source: "ঢাকা টাইমস ২৪",
    author: "নাজনীন আক্তার",
    publishedHoursAgo: 9,
    status: "published",
    safetyFlags: [],
  },
  {
    slug: "sedhin-theke-bhanger-mukhe-jawa-sangsar",
    category: "extramarital-crime",
    title: "সন্দেহে ভাঙনের মুখে যাওয়া সংসার বাঁচাল তিন মাসের কাউন্সেলিং — বিশেষজ্ঞরা যা বললেন",
    summary: "পরকীয়া সন্দেহ ও ব্ল্যাকমেইলের অভিযোগে ভাঙনের পথে থাকা একটি সংসার তিন মাসের কাউন্সেলিংয়ে ফিরে পেয়েছে স্থিতি।",
    body:
      "পরকীয়া সন্দেহ ও একতরফা অভিযোগের জেরে ভাঙনের মুখে থাকা একটি সংসার তিন মাসের পেশাদার কাউন্সেলিং শেষে আবারো স্বাভাবিক জীবনে ফিরেছে।\n\nসংশ্লিষ্ট পরিবার-পরামর্শ কেন্দ্রের পক্ষ থেকে জানানো হয়েছে, শুরুর দিকে অভিযোগের ভিত্তিতে পৃথক হয়ে যাওয়ার সিদ্ধান্ত নিয়েছিলেন এক পক্ষ। কাউন্সেলিং সেশনে দুপক্ষের কথা শোনার পর দেখা যায়, অনেক অভিযোগই ভুল বোঝাবুঝি ও তৃতীয় পক্ষের অপপ্রচারের ফল।\n\nবিশেষজ্ঞদের মতে, এ ধরনের সংকটে আইনি ও মনোসামাজিক সাহায্য দুটোই গুরুত্বপূর্ণ। থানায় ব্ল্যাকমেইলের অভিযোগ দায়েরের মতো পরিস্থিতি এড়াতে প্রাথমিক পর্যায়ে পেশাদার পরামর্শ নেওয়ার পরামর্শ দেন তারা।\n\nঘটনার বিস্তারিত তথ্য যাচাই করা সম্ভব হয়নি বলে অভিযোগ ভাষায়ই উপস্থাপন করা হলো।",
    media: pexels(3771085),
    source: "জীবনমুখী",
    author: "ডা. সাবরিনা ইসলাম",
    publishedHoursAgo: 13,
    status: "published",
    safetyFlags: ["unverified_claim"],
  },
  {
    slug: "narir-opor-hensthar-video-viral-er-por",
    category: "extramarital-crime",
    title: "পরকীয়া সম্পর্ক থেকে চাঁদাবাজির অভিযোগ: অন্তরঙ্গ ছবি দেখিয়ে টাকা তোলার ঘটনায় মামলা",
    summary: "অন্তরঙ্গ ছবি ব্যবহার করে চাঁদাবাজির অভিযোগে থানায় মামলা হয়েছে, অভিযুক্তের বিরুদ্ধে তদন্ত শুরু।",
    body:
      "অন্তরঙ্গ ছবি ব্যবহার করে চাঁদাবাজির অভিযোগে রাজধানীর একটি থানায় মামলা দায়ের হয়েছে। ভুক্তভোগীর অভিযোগ, পরিচিত এক ব্যক্তি দীর্ঘদিন ধরে ছবি দেখিয়ে টাকা দাবি করছিলেন।\n\nপুলিশের বরাত দিয়ে জানা গেছে, প্রাথমিক তথ্যের ভিত্তিতে অভিযুক্ত ব্যক্তিকে চিহ্নিত করা হয়েছে এবং তদন্ত চলছে। এ ধরনের ঘটনায় ভুক্তভোগীদের থানায় যোগাযোগ করার পরামর্শ দিয়েছেন সংশ্লিষ্টরা।\n\nসম্পর্কের বিষয়টি এখানে প্রেক্ষাপটমাত্র — আইনি দিক থেকে মূল বিবেচ্য অপরাধটি, অর্থাৎ ব্ল্যাকমেইল ও চাঁদাবাজি। শারীরিক সম্পর্কের অভিযোগ সংক্রান্ত খুঁটিনাটি প্রকাশ করা হলো না।",
    media: pexels(3760067),
    source: "আইন বিষয়ক",
    author: "ব্যারিস্টার সায়রা",
    publishedHoursAgo: 15,
    status: "published",
    safetyFlags: ["unverified_claim"],
  },
  {
    slug: "school-pothe-shishur-nirapotta",
    category: "missing-children",
    title: "স্কুলপথে শিশুর নিরাপত্তা: অভিভাবকদের জন্য পাঁচটি ছোট কিন্তু কার্যকর অভ্যাস",
    summary: "স্কুলগামী শিশুদের নিরাপত্তা নিশ্চিত করতে অভিভাবকদের ছোট ছোট অভ্যাস গড়ে তোলা জরুরি।",
    body:
      "স্কুলগামী শিশুদের নিরাপত্তা নিশ্চিত করতে অভিভাবকদের ছোট ছোট অভ্যাস গড়ে তোলা জরুরি। বিশেষজ্ঞরা পরামর্শ দিয়েছেন, শিশুকে পরিচিত নম্বরগুলো মুখস্থ করানো এবং কাউকে অনুসরণ না করার নিয়ম শেখানো।\n\nনিখোঁজের ঝুঁকি কমাতে শিশুকে স্কুলে পাঠানোর সময় নির্দিষ্ট রুট, সময় ও সহযাত্রী সম্পর্কে নিশ্চিত হওয়া জরুরি। শিশু কোথায় কখন পৌঁছাল — অভিভাবক সবসময় জানেন এমন অভ্যাস গড়ে তোলা উচিত।\n\nসন্দেহজনক পরিস্থিতিতে দ্রুত ৯৯৯ (পুলিশ) এবং ১০৯ (শিশু হেল্পলাইন)-এ যোগাযোগ করার পরামর্শ দেওয়া হয়েছে।",
    media: pexels(8460059),
    source: "শিশু সুরক্ষা বাংলাদেশ",
    author: "মাহমুদা খানম",
    publishedHoursAgo: 22,
    status: "published",
    safetyFlags: [],
  },
  {
    slug: "cumillar-shoi-opohoron-video-asole-ki",
    category: "missing-children",
    title: "কুমিল্লার সেই 'অপহরণ' ভিডিও আসলে কী ছিল? গুজবের পেছনে সত্যটা খুঁজলাম আমরা",
    summary: "গুজবের ভিত্তিতে ছড়িয়ে পড়া একটি অপহরণ-সংক্রান্ত পোস্টের সত্যতা যাচাই করে প্রাথমিকভাবে ভিত্তিহীন বলে জানিয়েছে পুলিশ।",
    body:
      "গত সপ্তাহে কুমিল্লায় একটি ভিডিও ভাইরাল হয়ে পুলিশসহ স্থানীয়দের মধ্যে আতঙ্ক ছড়ায়। পোস্টে এক শিশুকে গাড়িতে তুলে নেওয়ার দাবি করা হয়েছিল।\n\nপুলিশের বরাত দিয়ে ফেসবুক পোস্টে দাবি করা হয়েছে, ঘটনাটি প্রাথমিকভাবে পরীক্ষা করে ভিত্তিহীন বলে মনে হচ্ছে। থানা জানিয়েছে, গুজব ছড়ানো ব্যক্তিদের চিহ্নিত করে আইনি ব্যবস্থা নেওয়া হবে।\n\nসতর্কতা: গুজব ছড়াবেন না। যেকোনো অপহরণ-সংক্রান্ত তথ্য প্রথমে থানা বা ৯৯৯-এ যাচাই করুন। শিশু হেল্পলাইন ১০৯।",
    media: pexels(518543),
    source: "ফ্যাক্ট চেক বিডি",
    author: "তানভীর আহমেদ",
    publishedHoursAgo: 30,
    status: "published",
    caseStatus: "false-alarm",
    safetyFlags: ["unverified_claim"],
  },
  {
    slug: "madrasa-e-shishu-nirjataner-ovijog",
    category: "child-sexual-abuse",
    title: "ধর্মীয় প্রতিষ্ঠানে শিশুর বিরুদ্ধে যৌন নির্যাতনের অভিযোগ: তদন্ত শুরু",
    summary: "সংশ্লিষ্ট প্রতিষ্ঠানে শিশুর বিরুদ্ধে যৌন নির্যাতনের অভিযোগে নিয়মিত মামলার প্রস্তুতি চলছে।",
    body:
      "একটি ধর্মীয় প্রতিষ্ঠানের বিরুদ্ধে ওই শিশুর যৌন নির্যাতনের অভিযোগ উঠেছে। প্রাথমিক তথ্য অনুযায়ী, অভিভাবকদের অভিযোগের ভিত্তিতে সংশ্লিষ্ট থানায় নিয়মিত মামলা দায়েরের প্রস্তুতি চলছে।\n\nঅভিযুক্ত ব্যক্তিকে প্রাথমিকভাবে চিহ্নিত করা হয়েছে বলে থানা সূত্রে জানানো হয়েছে। নির্যাতনের শিকার শিশুটিকে চিকিৎসার জন্য হাসপাতালে ভর্তি রাখা হয়েছে।\n\nঅভিযোগের খুঁটিনাটি বিষয় প্রকাশ করা সম্ভব নয়; শিশু ও প্রতিষ্ঠানের পরিচয় গোপন রাখা হয়েছে। আইনি প্রক্রিয়া শেষ না হওয়া পর্যন্ত অনুমাননির্ভর মন্তব্য থেকে বিরত থাকার আহ্বান জানিয়েছেন সংশ্লিষ্টরা।\n\nসূত্র: ডেমো পেজ (ফেসবুক)",
    media: pexels(5876695),
    source: "ডেমো অ্যাডভোকেসি পেজ",
    author: "—",
    publishedHoursAgo: 40,
    status: "pending_review",
    safetyFlags: ["minor_involved", "needs_double_approval", "redacted"],
    flags: ["redaction_strict: maximum", "requires_double_approval"],
  },
  {
    slug: "barishale-nikhongjo-shishu-udhbar",
    category: "missing-children",
    title: "বরিশালে নিখোঁজ শিশুকে উদ্ধার: সোশ্যাল মিডিয়া ক্যাম্পেইন ও পুলিশের যৌথ প্রচেষ্টায় সাফল্য",
    summary: "বরিশালের এক নিখোঁজ শিশুকে ২৪ ঘণ্টার মধ্যে উদ্ধার করা হয়েছে।",
    body:
      "বরিশালে গতকাল বিকেলে খেলার মাঠ থেকে নিখোঁজ হওয়া শিশুটিকে আজ সকালে উদ্ধার করা হয়েছে। ফেসবুকে ছড়িয়ে দেওয়া ছবি দেখে একজন স্থানীয় বাসিন্দা পুলিশকে খবর দেন।\n\nশিশুটি সুস্থ আছে বলে জানিয়েছে পরিবার। পুলিশ জানিয়েছে, শিশুটিকে কোনো অপরিচিত ব্যক্তির কাছে পাওয়া যায়নি; সে এলাকা চিনতে না পেরে দূরে চলে গিয়েছিল।\n\nনিখোঁজের ঘটনায় যেকোনো তথ্য দিতে পুলিশ হেল্পলাইন ৯৯৯ এবং শিশু হেল্পলাইন ১০৯-এ যোগাযোগের অনুরোধ জানানো হয়েছে।",
    media: pexels(7232021),
    source: "বরিশাল আলো",
    author: "দেলোয়ার হোসেন",
    publishedHoursAgo: 100,
    status: "published",
    caseStatus: "found",
    safetyFlags: [],
  },
  {
    slug: "purono-dak-article-archive-demo",
    category: "extramarital-crime",
    title: "সাত দিন আগের ঘটনা: আর্কাইভ সংগঠিত হওয়ার আগে প্রকাশিত একটি নমুনা প্রতিবেদন",
    summary: "এটি একটি আর্কাইভকৃত নমুনা পোস্ট — সাত দিনের উইন্ডো পার হয়ে গেছে।",
    body:
      "এই প্রতিবেদনটি সাত দিন আগে প্রকাশিত হয়েছিল এবং বর্তমান উইন্ডোর বাইরে। এটি আর্কাইভ থেকে দেখানোর জন্য রাখা একটি নমুনা।\n\nসূত্র: ডেমো পেজ (ফেসবুক)",
    media: pexels(2422588),
    source: "ঢাকা টাইমস ২৪",
    author: "নাজনীন আক্তার",
    publishedHoursAgo: 13 * 24,
    status: "archived",
    safetyFlags: [],
  },
];

async function main() {
  const url = process.env.TURSO_DATABASE_URL ?? "";
  if (url.startsWith("libsql://")) {
    console.error(
      "refusing to seed demo content into the shared cloud DB — point TURSO_DATABASE_URL at a file: URL (or unset it) and retry.",
    );
    process.exit(1);
  }
  const client = getClient();
  const now = nowIso();

  // wipe only demo-authored data
  await client.execute(
    "DELETE FROM posts WHERE source_name LIKE 'ডেমো%' OR source_id LIKE 'demo-%' OR slug LIKE '%demo%' OR slug = 'purono-dak-article-archive-demo'",
  );
  await client.execute("DELETE FROM raw_posts WHERE source_id IN (SELECT id FROM sources WHERE id LIKE 'demo-%')");
  await client.execute("DELETE FROM sources WHERE id LIKE 'demo-%'");
  await client.execute("DELETE FROM pipeline_runs WHERE id LIKE 'demo-%'");
  await client.execute("DELETE FROM submitted_pages WHERE id LIKE 'demo-%'");
  await client.execute("DELETE FROM removal_requests WHERE id LIKE 'demo-%'");

  // sources
  const sources = [
    ["demo-src-mirpur", "মিরপুর সংবাদ", "missing-children"],
    ["demo-src-dhaka24", "ঢাকা টাইমস ২৪", "extramarital-crime"],
    ["demo-src-factcheck", "ফ্যাক্ট চেক বিডি", "missing-children"],
  ] as const;
  for (const [id, name, category] of sources) {
    await client.execute({
      sql: "INSERT INTO sources (id, page_url, page_name, category, is_verified, is_active, created_at) VALUES (?, ?, ?, ?, 1, 1, ?)",
      args: [id, `https://facebook.com/${id}`, name, category, now],
    });
  }

  // posts
  const postIds: string[] = [];
  for (const p of demoPosts) {
    const id = `demo-${randomUUID()}`;
    postIds.push(id);
    const status = p.status;
    const publishedAt = status === "archived" ? daysAgo(13) : hoursAgo(p.publishedHoursAgo);
    const archivedAt = status === "archived" ? daysAgo(6) : null;
    const sourceId = p.slug.includes("madrasa") ? "demo-src-mirpur" : p.slug.includes("cumillar") ? "demo-src-factcheck" : "demo-src-dhaka24";
    await client.execute({
      sql: `INSERT INTO posts
        (id, raw_post_id, source_id, category, title_bn, body_bn, summary_bn,
         media_path, media_kind, source_url, source_name, slug, status, safety_flags,
         embedding, case_status, case_updated_at, original_author_name,
         published_at, archived_at, archive_reason, legal_hold, created_at, updated_at)
        VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 'image', ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, COALESCE(?, NULL), 0, ?, ?)`,
      args: [
        id,
        sourceId,
        p.category,
        p.title,
        p.body,
        p.summary,
        p.media,
        `https://facebook.com/${sourceId}/posts/${id}`,
        p.source,
        p.slug,
        status === "archived" ? "published" : status,
        JSON.stringify(p.safetyFlags ?? []),
        p.caseStatus ?? null,
        p.caseStatus ? publishedAt : null,
        p.author,
        publishedAt,
        archivedAt,
        status === "archived" ? "auto_rollover" : null,
        publishedAt,
        publishedAt,
      ],
    });
  }

  // submissions + removal request
  await client.execute({
    sql: "INSERT INTO submitted_pages (id, page_url, page_name, submitter_email, submitter_name, category, notes, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?)",
    args: ["demo-sub-1", "https://facebook.com/verifiednewsbd", "ভেরিফাইড নিউজ বিডি", "someone@example.com", "আনোয়ার", "missing-children", "স্থানীয় ফ্যাক্ট-চেক পেজ", hoursAgo(5)],
  });
  const removalPostId = postIds[1] ?? postIds[0]!;
  await client.execute({
    sql: "INSERT INTO removal_requests (id, post_id, reason, reporter_email, status, created_at) VALUES (?, ?, ?, ?, 'open', ?)",
    args: ["demo-rm-1", removalPostId, "ঘটনার বর্ণনা ভিন্ন খবরের সঙ্গে সাংঘর্ষিক", "reporter@example.com", hoursAgo(3)],
  });

  // pipeline runs
  for (let i = 0; i < 5; i++) {
    await client.execute({
      sql: "INSERT INTO pipeline_runs (id, started_at, finished_at, status, stats, provider_used, error) VALUES (?, ?, ?, 'completed', ?, ?, NULL)",
      args: [
        `demo-run-${i}`,
        hoursAgo(6 + i * 2),
        hoursAgo(6 + i * 2 - 0.2),
        JSON.stringify({
          scraped: 3,
          deduped: 1,
          rewritten: 2,
          published: 1,
          errors: 0,
        }),
        "Google Gemini 2.0 Flash",
      ],
    });
  }

  console.log(`seeded demo content: ${demoPosts.length} posts, sources, submissions, runs`);
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});