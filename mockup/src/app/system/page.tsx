import Link from "next/link";
import {
  Rss,
  AppWindow,
  Fingerprint,
  Sparkles,
  GitBranch,
  Triangle,
  Globe2,
  Database,
  KeyRound,
  Camera,
  Scan,
  Bot,
  FileJson,
  ShieldCheck,
  ArrowRight,
  CircleCheck,
  Scale,
  BadgeCheck,
  Gauge,
} from "lucide-react";
import Reveal from "@/components/reveal";
import { toBn } from "@/lib/data";

export const dynamic = "force-dynamic";

const PIPELINE = [
  {
    icon: Rss,
    tag: "01 · SOURCE",
    title: "ফেসবুক ওয়াচলিস্ট",
    color: "text-sky-300",
    border: "hover:border-sky-300/60",
    points: [
      "নির্বাচিত পেজ/গ্রুপের উন্মুক্ত ফিড পর্যবেক্ষণ",
      "ভিডিও, ছবি ও টেক্সট — অরিজিনাল লিংকসহ",
      "রেট-লিমিট মেনে ব্যাক-অফ কালেকশন",
    ],
  },
  {
    icon: AppWindow,
    tag: "02 · DESKTOP APP",
    title: "হৈচৈ ডেস্ক (Tauri)",
    color: "text-lime",
    border: "hover:border-lime/60",
    points: [
      "Tauri + React — নেটিভ, হালকা, সবদিককার",
      "Playwright হেডলেস: পূর্ণ পোস্টের স্ক্রিনশট",
      "প্রতি ২ ঘণ্টার অভ্যন্তরীণ ক্রন + ম্যানুয়াল রান",
    ],
  },
  {
    icon: Fingerprint,
    tag: "03 · DEDUP",
    title: "ডুপ্লিকেট ইঞ্জিন",
    color: "text-amberx",
    border: "hover:border-amberx/60",
    points: [
      "SHA-256 এক্সাক্ট হ্যাশ Postgres ইনডেক্সে",
      "SimHash/cosine ≥ 0.87 — নিকট-দ্বৈতও ব্লক",
      "স্ক্রিনশটে pHash পারসেপচুয়াল মিল",
    ],
  },
  {
    icon: Sparkles,
    tag: "04 · REWRITE",
    title: "এআই পুনর্লিখন ডেস্ক",
    color: "text-rose-300",
    border: "hover:border-rose-300/60",
    points: [
      "LLM + বাংলা সম্পাদকীয় স্টাইল-গাইড প্রম্পট",
      "ফ্যাক্ট-গেট: দাবি যাচাই, অমীমাংসিত অভিযোগ ফিল্টার",
      "সংবেদনশীল বিষয়ে নাম-পরিচয় স্বয়ংক্রিয় মাস্কিং",
    ],
  },
  {
    icon: GitBranch,
    tag: "05 · REPO",
    title: "AI Agent কনটেন্ট",
    color: "text-violet-300",
    border: "hover:border-violet-300/60",
    points: [
      "content/*.json + assets/screenshots/*.png",
      "প্রতি প্রকাশনায় স্বয়ংক্রিয় কমিট ও ট্যাগ",
      "CI: স্কিমা যাচাই + ইমেজ অপ্টিমাইজ",
    ],
  },
  {
    icon: Triangle,
    tag: "06 · SHIP",
    title: "Web অটো-ডিপ্লয়",
    color: "text-white",
    border: "hover:border-white/60",
    points: [
      "main-এ পুশ মানেই প্রোডাকশন ডিপ্লয়",
      "ISR — প্রতি পোস্টে পৃষ্ঠা স্বয়ংক্রিয় পুনর্নির্মাণ",
      "রোলব্যাক এক ক্লিকে, স্ট্যাটাস ডেস্কটপে ফেরত",
    ],
  },
];

const DB_OPTIONS = [
  {
    name: "Turso (libSQL)",
    badge: "বেছে নেওয়া",
    badgeStyle: "bg-lime text-night",
    desc: "SQLite-সামঞ্জস্যপূর্ণ, এজ-রিপ্লিকেটেড, ফ্রি টিয়ারে ৯ GB পর্যন্ত। Web-এর মতো আঞ্চলিক এজ নেটওয়ার্কের সঙ্গে দুর্দান্ত ম্যাচ — রিড-লেটেন্সি খুব কম।",
    fit: "ডুপ্লিকেট হ্যাশ ইনডেক্স + রান-লগ + কমেন্ট স্টেট — সব এক ফাইলে; DB_DRIVER=turso দিলেই চলে।",
  },
  {
    name: "Neon Postgres",
    badge: "ব্যাকআপ ড্রাইভার",
    badgeStyle: "border border-white/20 text-white/70",
    desc: "সার্ভারলেস Postgres — ০.৫ GB ফ্রি, ব্রাঞ্চিং ও অটো-স্কেল। Prose ও full-text সার্চ দরকার হলে পছন্দ। স্যান্ডবক্স-লোকাল ডিফল্ট এই ড্রাইভার।",
    fit: "একই অ্যাপ কোড — শুধু DB_DRIVER=postgres দিলেই Postgres মোড।",
  },
  {
    name: "Supabase",
    badge: "Auth/Storage হলে",
    badgeStyle: "border border-white/20 text-white/70",
    desc: "Postgres-ই, সঙ্গে Auth ও স্টোরেজ ফ্রি ফ্ল্যানে। স্ক্রিনশট আর্কাইভ সরাসরি Supabase Storage-এ রাখা যায়।",
    fit: "অ্যাডমিনে লগিন-ভিত্তিক রোল দরকার হলে সবচেয়ে দ্রুত পথ।",
  },
];

const GUARDRAILS = [
  {
    icon: Scale,
    title: "অ্যাট্রিবিউশন সবসময়",
    text: "প্রতিটি প্রতিবেদনে মূল সোর্স, স্ক্রিনশট ও সংগ্রহ-সময় সংরক্ষিত — পাঠক ও আইন দুটোর কাছেই স্বচ্ছ।",
  },
  {
    icon: BadgeCheck,
    title: "ফ্যাক্ট-গেট বাধ্যতামূলক",
    text: "অযাচাইকৃত দাবি প্রকাশের আগেই থামে। স্কোর ০.৯-এর নিচে হলে আইটেম 'রিভিউ' সারিতে যায়, লাইভে নয়।",
  },
  {
    icon: ShieldCheck,
    title: "নীতিমালা-সচেতন কালেকশন",
    text: "ফেসবুকের শর্তাবলী মেনে শুধুই উন্মুক্ত/অনুমতিপ্রাপ্ত সোর্স — Graph API বা নিজস্ব মনিটরড পেজ; লগিন-স্ক্র্যাপিং নয়।",
  },
  {
    icon: Gauge,
    title: "খরচ নিয়ন্ত্রিত",
    text: "হ্যাশ-গেটে ডুপ্লিকেট আগেই বাদ পড়ায় LLM কল কমে; ফ্রি টিয়ারেই পুরো লাইন চলে।",
  },
];

export default function SystemPage() {
  return (
    <main className="bg-night-grid min-h-screen pb-20 text-[#e9e6da]">
      {/* hero */}
      <section className="mx-auto max-w-[1400px] px-4 pt-14 md:px-8">
        <Reveal>
          <p className="font-mono-x text-[10.5px] tracking-[0.28em] text-lime uppercase">
            SYSTEM BLUEPRINT · HOICHOI PIPELINE
          </p>
          <h1 className="mt-3 max-w-3xl font-serif-bn text-[36px] leading-[1.25] font-black text-white md:text-[56px]">
            ফিরোজা না, <span className="text-lime">প্রবাহ</span> — ফিড থেকে
            সাইটে একটানা অটোমেশন।
          </h1>
          <p className="mt-5 max-w-2xl text-[14px] leading-relaxed text-white/55">
            ডেস্কটপ নেটিভ অ্যাপই কন্ট্রোলর। সে-ই ফেসবুক সোর্স পর্যবেক্ষণ করে,
            স্ক্রিনশট আর্কাইভ করে, ডুপ্লিকেট বাদ দিয়ে বাংলায় পুনর্লিখন করে
            AI Agent-এ কমিট দেয় — আর Web সঙ্গে সঙ্গে লাইভ করে। সব ক্রেডেনশিয়াল
            থাকে এনক্রিপ্টড অ্যাডমিন ভল্টে; রিপোতে নয়।
          </p>
        </Reveal>
      </section>

      {/* pipeline grid */}
      <section className="mx-auto mt-14 max-w-[1400px] px-4 md:px-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {PIPELINE.map((n, i) => (
            <Reveal key={n.title} delay={i * 60}>
              <div
                className={`panel panel-hover group relative h-full rounded-2xl p-6 ${n.border}`}
              >
                <div className="flex items-start justify-between">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] ${n.color}`}
                  >
                    <n.icon size={19} strokeWidth={1.8} />
                  </span>
                  <span className="font-mono-x text-[9px] tracking-[0.24em] text-white/30">
                    {n.tag}
                  </span>
                </div>
                <h3 className="mt-5 font-serif-bn text-[19px] font-extrabold text-white">
                  {n.title}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {n.points.map((p) => (
                    <li
                      key={p}
                      className="flex items-start gap-2.5 text-[12px] leading-relaxed text-white/55"
                    >
                      <span className="mt-[7px] h-1 w-1 shrink-0 rotate-45 bg-lime/80" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>

        {/* animated flow line */}
        <div className="mt-8 flex items-center gap-3">
          <span className="font-mono-x text-[9px] tracking-[0.24em] whitespace-nowrap text-white/35 uppercase">
            FEED → LIVE · {toBn(2)}H LOOP
          </span>
          <div className="flow-line flex-1 rounded-full" />
          <Globe2 size={14} className="text-lime" />
        </div>
      </section>

      {/* vault + contract */}
      <section className="mx-auto mt-16 grid max-w-[1400px] gap-4 px-4 lg:grid-cols-2 md:px-8">
        <Reveal>
          <div className="panel h-full rounded-2xl p-7">
            <p className="flex items-center gap-2 font-mono-x text-[9.5px] tracking-[0.24em] text-alizarin uppercase">
              <KeyRound size={11} /> ক্রেডেনশিয়াল আর্কিটেকচার
            </p>
            <h3 className="mt-3 font-serif-bn text-[22px] font-extrabold text-white">
              এক ভল্ট, দুই ক্লায়েন্ট, শূন্য হার্ডকোড
            </h3>
            <ul className="mt-5 space-y-3.5">
              {[
                "সব কী অ্যাডমিন প্যানেলে AES-256 এনক্রিপ্টড হয়ে জমা — মাস্টার কী শুধুই ডেস্কটপের env-এ।",
                "ডেস্কটপ অ্যাপ ও ওয়েব সার্ভার স্কোপ অনুযায়ী কী টানে (desktop · web · both)।",
                "AI Agent রিপোতে কোনো সিক্রেট নেই — Web env-এ শুধু পড়ার-টোকেন।",
                "রোটেশন ট্র্যাকিং সহ; ৩০ দিন পেরোলে ড্যাশবোর্ডে অ্যাম্বার সতর্কতা।",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 text-[12.5px] leading-relaxed text-white/55">
                  <CircleCheck size={13} className="mt-0.5 shrink-0 text-lime" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal delay={90}>
          <div className="panel h-full overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
              <p className="flex items-center gap-2 font-mono-x text-[9.5px] tracking-[0.24em] text-white/45 uppercase">
                <FileJson size={11} className="text-amberx" /> কনটেন্ট কন্ট্রাক্ট ·
                content/item.json
              </p>
              <Scan size={13} className="text-white/30" />
            </div>
            <pre className="scroll-slim overflow-x-auto p-6 font-mono-x text-[11px] leading-[1.85] text-white/70">
{`{
  "id": "a1f3-c9e2",
  "title_bn": "নিখোঁজের ছয় ঘণ্টায়…",
  "dek_bn": "মিরপুরে স্কুলফেরত…",
  "body_md": "…পুনর্লিখিত অনুচ্ছেদ…",
  "category": "child",
  "source": {
    "platform": "facebook",
    "page": "মিরপুর সংবাদ",
    "post_url": "https://…",
    "screenshot": "assets/shot_0001.png"
  },
  "hash": { "sha256": "…", "phash": "…" },
  "status": "published",
  "collected_at": "…", "published_at": "…"
}`}
            </pre>
            <div className="flex items-center justify-between border-t border-white/8 px-6 py-3.5 font-mono-x text-[9px] tracking-[0.18em] text-white/35 uppercase">
              <span className="flex items-center gap-2">
                <Bot size={11} className="text-lime" /> LLM WRITES · CI VALIDATES
              </span>
              <span className="flex items-center gap-2">
                <Camera size={11} className="text-amberx" /> SCREENSHOT PINNED
              </span>
            </div>
          </div>
        </Reveal>
      </section>

      {/* DB recommendation */}
      <section className="mx-auto mt-16 max-w-[1400px] px-4 md:px-8">
        <Reveal>
          <div className="flex items-center gap-3">
            <Database size={18} className="text-lime" />
            <h2 className="font-serif-bn text-[28px] font-black text-white md:text-[34px]">
              ফ্রি-টিয়ার ডাটাবেস — কোনটা কেন
            </h2>
          </div>
          <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-white/50">
            রুলটি সরল: <span className="text-white/80">AI Agent = ডেলিভারি লেয়ার</span>{" "}
            (স্ট্যাটিক কনটেন্ট), <span className="text-white/80">Turso = মস্তিষ্ক</span>{" "}
            (ডুপ্লিকেট হ্যাশ ইনডেক্স, রান-লগ, কিউ, কমেন্ট, ক্রেডেনশিয়াল-মেটা)।
            JSON-ফাইলে স্টেট রাখলে দুই ঘণ্টার লুপে রেস-কন্ডিশন ও ব্লোট আসবেই। দুটি
            ড্রাইভারই কোডে আছে — <code className="font-mono-x text-[11px] text-lime">DB_DRIVER=turso</code>{" "}
            বা <code className="font-mono-x text-[11px] text-lime">postgres</code>; স্কিমা যথাক্রমে{" "}
            <code className="font-mono-x text-[11px] text-white/70">schema-turso.ts</code> ও{" "}
            <code className="font-mono-x text-[11px] text-white/70">schema.ts</code>।
          </p>
        </Reveal>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {DB_OPTIONS.map((db, i) => (
            <Reveal key={db.name} delay={i * 80}>
              <div className="panel panel-hover flex h-full flex-col rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <p className="font-latin text-[18px] font-bold text-white">
                    {db.name}
                  </p>
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-bold ${db.badgeStyle}`}
                  >
                    {db.badge}
                  </span>
                </div>
                <p className="mt-4 flex-1 text-[12px] leading-relaxed text-white/55">
                  {db.desc}
                </p>
                <p className="mt-5 border-t border-white/8 pt-4 text-[11px] leading-relaxed text-lime/90">
                  {db.fit}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* guardrails */}
      <section className="mx-auto mt-16 max-w-[1400px] px-4 md:px-8">
        <Reveal>
          <h2 className="font-serif-bn text-[28px] font-black text-white md:text-[34px]">
            দায়িত্বশীল অটোমেশনের চার স্তম্ভ
          </h2>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {GUARDRAILS.map((g, i) => (
            <Reveal key={g.title} delay={i * 70}>
              <div className="panel panel-hover h-full rounded-2xl p-6">
                <g.icon size={18} className="text-amberx" strokeWidth={1.9} />
                <p className="mt-4 font-serif-bn text-[15.5px] font-bold text-white">
                  {g.title}
                </p>
                <p className="mt-2.5 text-[11.5px] leading-relaxed text-white/50">
                  {g.text}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* cta */}
      <section className="mx-auto mt-16 max-w-[1400px] px-4 md:px-8">
        <Reveal>
          <Link
            href="/desk"
            className="group flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-lime/30 bg-lime/[0.06] px-6 py-6 transition-all duration-300 hover:bg-lime/[0.1]"
          >
            <div>
              <p className="font-serif-bn text-[20px] font-extrabold text-white">
                অপশন A চালু করতে চান?
              </p>
              <p className="mt-1 text-[12px] text-white/55">
                হৈচৈ ডেস্ক — Tauri কন্ট্রোলার, ওয়াচলিস্ট, কালেক্টর ও ভল্ট এক জানালায়।
              </p>
            </div>
            <span className="flex items-center gap-2 rounded-xl bg-lime px-5 py-3 text-[13px] font-bold text-night transition-transform duration-300 group-hover:scale-[1.03]">
              ডেস্কটপ অ্যাপ খুলুন
              <ArrowRight
                size={15}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </span>
          </Link>
        </Reveal>
      </section>
    </main>
  );
}
