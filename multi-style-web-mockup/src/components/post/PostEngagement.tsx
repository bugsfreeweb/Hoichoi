"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import clsx from "clsx";
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Lightbulb,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { Badge, Btn, SectionHead, SectionShell } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/motion";
import type { PostRecord } from "@/lib/posts";
import { bn, bnDateTime } from "@/lib/format";

interface CommentRecord {
  id: number;
  author: string;
  body: string;
  createdAt: string | Date;
}

const COMPLETION_EVENT = "hoichoi:reading-complete";

/** Placed immediately after the article; reaching it marks the story as read. */
export function ReadingCompletionSignal({ slug }: { slug: string }) {
  useEffect(() => {
    const target = document.getElementById(`article-end-${slug}`);
    if (!target) return;
    const mark = () => {
      try {
        window.localStorage.setItem(`hoichoi-read-${slug}`, "done");
      } catch {
        // Current-page state is still signalled if storage is unavailable.
      }
      window.dispatchEvent(new CustomEvent(COMPLETION_EVENT, { detail: { slug } }));
    };
    if (typeof IntersectionObserver !== "undefined") {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            mark();
            observer.disconnect();
          }
        },
        { threshold: 0.65 },
      );
      observer.observe(target);
      return () => observer.disconnect();
    }
    const fallback = () => {
      if (target.getBoundingClientRect().top < window.innerHeight * 0.75) {
        mark();
        window.removeEventListener("scroll", fallback);
      }
    };
    window.addEventListener("scroll", fallback, { passive: true });
    fallback();
    return () => window.removeEventListener("scroll", fallback);
  }, [slug]);

  return <span id={`article-end-${slug}`} className="pointer-events-none block h-2 w-full" aria-hidden />;
}

/* ═══════════════════ পাঠকের শিক্ষা ═══════════════════ */
const LESSONS: Record<string, { headline: string; items: string[]; question: string }> = {
  "missing-child": {
    headline: "সংকটের খবরে যাচাই যেমন জরুরি, শিশুর গোপনীয়তাও তেমন জরুরি।",
    items: ["ছবি ছড়ানোর আগে তারিখ ও মূল উৎস যাচাই করুন।", "অপহরণের মতো গুরুতর দাবি নিশ্চিত না হলে নিশ্চিত ভাষায় লিখবেন না।", "সাহায্য করতে চাইলে যাচাইকৃত পুলিশ বা পরিবারের যোগাযোগপথ ব্যবহার করুন।"],
    question: "নিখোঁজের কোনো পোস্ট শেয়ার করার আগে আপনি কোন দুটি তথ্য মিলিয়ে দেখবেন?",
  },
  "affair-crime": {
    headline: "প্রাথমিক সন্দেহ আর তদন্তে প্রমাণিত কারণ—দুটিকে এক করে দেখা যায় না।",
    items: ["তদন্ত চলাকালে পুলিশের ভাষ্যকে চূড়ান্ত রায় হিসেবে দেখাবেন না।", "নিহত ও পরিবারের মর্যাদা রক্ষায় অপ্রয়োজনীয় ব্যক্তিগত তথ্য এড়িয়ে চলুন।", "ময়নাতদন্ত বা নথি ছাড়া ঘটনার কারণ নিশ্চিত বলা যায় না।"],
    question: "কোন তথ্যটি তদন্তের ফল না আসা পর্যন্ত অনিশ্চিত হিসেবে চিহ্নিত থাকা উচিত?",
  },
  "child-abuse": {
    headline: "শিশু সুরক্ষার ঘটনায় সহমর্মিতা মানে পরিচয় ও মর্যাদা রক্ষা করা।",
    items: ["শিশুর মুখ, নাম, স্কুল বা পরিচয় প্রকাশ করবেন না।", "প্রমাণ হিসেবে ছড়ানো ভিডিও আবার শেয়ার করলে ক্ষতি বাড়তে পারে।", "চিকিৎসা বা পুলিশের অবস্থা নিশ্চিত সূত্র ছাড়া প্রচার করবেন না।"],
    question: "কোন উপায়ে খবর জানানো যায়, যাতে শিশুর পরিচয় প্রকাশ না পায়?",
  },
  fraud: {
    headline: "চাকরি বা বিনিয়োগের প্রতিশ্রুতি যাচাই না করে টাকা পাঠানো ঝুঁকিপূর্ণ।",
    items: ["লাইসেন্স ও নিয়োগকর্তার পরিচয় সরকারি নথিতে মিলিয়ে দেখুন।", "ব্যক্তিগত হিসাব বা তাড়াহুড়োর চাপকে সতর্ক সংকেত হিসেবে নিন।", "প্রতারণার আশঙ্কা হলে রসিদ ও বার্তা সংরক্ষণ করে কর্তৃপক্ষকে জানান।"],
    question: "কোন সরকারি নথি বা প্রতিষ্ঠানের মাধ্যমে চাকরির প্রস্তাব যাচাই করা যায়?",
  },
};

function lessonFor(post: PostRecord) {
  return LESSONS[post.categorySlug] ?? {
    headline: "একটি খবর বুঝতে হলে উৎস, সময়, স্থান ও প্রমাণ—সবকিছুর যোগসূত্র দেখতে হয়।",
    items: ["মূল উৎস ও প্রকাশের তারিখ মিলিয়ে নিন।", "প্রত্যক্ষ তথ্য আর প্রত্যক্ষদর্শীর দাবি আলাদা করে দেখুন।", "যে তথ্য অজানা, সেটিকে অজানা বলাই দায়িত্বশীল সংবাদপাঠ।"],
    question: "এই প্রতিবেদনের কোন তথ্যটি আপনি আরেকটি নির্ভরযোগ্য সূত্রে যাচাই করবেন?",
  };
}

export function PostLesson({
  variant,
  post,
  density,
  previewUnlocked = false,
}: {
  variant: string;
  post: PostRecord;
  density: "compact" | "comfortable" | "spacious";
  previewUnlocked?: boolean;
}) {
  const [unlocked, setUnlocked] = useState(previewUnlocked);
  const [checked, setChecked] = useState<number[]>([]);
  const [answer, setAnswer] = useState<string | null>(null);
  const lesson = useMemo(() => lessonFor(post), [post]);

  useEffect(() => {
    const key = `hoichoi-read-${post.slug}`;
    try {
      if (window.localStorage.getItem(key) === "done") setUnlocked(true);
    } catch {
      // Keep the in-memory state.
    }
    const onComplete = (event: Event) => {
      const detail = (event as CustomEvent<{ slug?: string }>).detail;
      if (detail?.slug === post.slug) setUnlocked(true);
    };
    window.addEventListener(COMPLETION_EVENT, onComplete);
    return () => window.removeEventListener(COMPLETION_EVENT, onComplete);
  }, [post.slug]);

  if (!unlocked) {
    return (
      <SectionShell density={density}>
        <div className="surface mx-auto max-w-4xl rounded-2xl border-dashed p-6 md:p-8">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}><BookOpenCheck className="h-5 w-5" /></span>
            <div>
              <p className="mono-label text-mist-400">পড়া শেষ হলে খুলবে</p>
              <h2 className="font-display-bn mt-2 text-2xl text-mist-100">পড়া শেষে: কী শিখলাম?</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-mist-400">প্রতিবেদনের একেবারে শেষে পৌঁছালে এই লেখার মূল শিক্ষা, যাচাইয়ের পরামর্শ ও ভাবনার প্রশ্ন খুলে যাবে।</p>
            </div>
          </div>
        </div>
      </SectionShell>
    );
  }

  const items = (
    <ul className="space-y-3">
      {lesson.items.map((item, index) => (
        <li key={item} className="flex gap-3 text-[14px] leading-relaxed text-mist-300">
          <span className="font-latin mt-0.5 text-[12px] font-bold" style={{ color: "var(--accent)" }}>{bn(String(index + 1).padStart(2, "0"))}</span>{item}
        </li>
      ))}
    </ul>
  );

  let content: ReactNode;
  if (variant === "quiz") {
    const options = [
      { id: "source", text: "মূল উৎস, তারিখ ও স্থান মিলিয়ে দেখা।", correct: true },
      { id: "headline", text: "শুধু শিরোনাম দেখে দ্রুত শেয়ার করা।", correct: false },
      { id: "image", text: "ছবিটি পরিচিত মনে হলেই সত্য ধরে নেওয়া।", correct: false },
    ];
    content = (
      <div className="surface rounded-2xl p-6 md:p-8">
        <Badge tone="cool"><CircleHelp className="h-3 w-3" /> নিজেকে যাচাই করুন</Badge>
        <h3 className="font-display-bn mt-4 text-2xl leading-snug text-mist-100">খবর শেয়ার করার আগে সবচেয়ে ভালো প্রথম পদক্ষেপ কোনটি?</h3>
        <div className="mt-5 grid gap-2">
          {options.map((option) => (
            <button key={option.id} onClick={() => setAnswer(option.id)} className={clsx("rounded-xl border px-4 py-3 text-left text-[14px] transition-colors", answer === option.id ? option.correct ? "border-mint-500/50 bg-mint-500/10 text-mint-400" : "border-rose-400/40 bg-rose-400/10 text-rose-400" : "border-white/10 text-mist-300 hover:border-white/25")}>
              <span className="mr-2">{answer === option.id ? option.correct ? "✓" : "×" : "○"}</span>{option.text}
            </button>
          ))}
        </div>
        {answer ? <p className="mt-4 text-[13px] text-mist-300">{answer === "source" ? "সঠিক—প্রতিবেদনটির উৎস, সময় ও স্থান মিলিয়ে নিন।" : "আবার ভাবুন: যাচাই করতে মূল উৎস ও তারিখই প্রথম সূত্র।"}</p> : null}
      </div>
    );
  } else if (variant === "checklist") {
    content = (
      <div className="surface rounded-2xl p-6 md:p-8">
        <Badge tone="ok"><CheckCircle2 className="h-3 w-3" /> পাঠকের যাচাই তালিকা</Badge>
        <h3 className="font-display-bn mt-4 text-2xl text-mist-100">পরেরবার খবর পড়লে মনে রাখুন</h3>
        <div className="mt-5 space-y-2.5">
          {lesson.items.map((item, i) => (
            <button key={item} onClick={() => setChecked((old) => old.includes(i) ? old.filter((n) => n !== i) : [...old, i])} className={clsx("flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-[14px] leading-relaxed transition-colors", checked.includes(i) ? "border-mint-500/35 bg-mint-500/5 text-mist-100" : "border-white/8 text-mist-300 hover:border-white/20")}>
              <span className={clsx("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border", checked.includes(i) ? "border-mint-400 bg-mint-400 text-ink-950" : "border-white/20")}>{checked.includes(i) ? <Check className="h-3.5 w-3.5" /> : null}</span>{item}
            </button>
          ))}
        </div>
        <p className="mono-label mt-4 text-mist-400">{bn(checked.length)} / {bn(lesson.items.length)}টি মনে রাখা হয়েছে</p>
      </div>
    );
  } else if (variant === "journal") {
    content = <Journal lesson={lesson} slug={post.slug} />;
  } else if (variant === "fieldguide") {
    content = (
      <div className="surface-hi overflow-hidden rounded-2xl">
        <div className="grid gap-0 md:grid-cols-[0.7fr_1.3fr]">
          <div className="flex flex-col justify-between p-6 md:p-8" style={{ background: "var(--accent-soft)" }}>
            <Lightbulb className="h-7 w-7" style={{ color: "var(--accent)" }} />
            <div><p className="mono-label mt-5 text-mist-400">পাঠকের সহায়িকা</p><h3 className="font-display-bn mt-2 text-2xl leading-snug text-mist-100">{lesson.headline}</h3></div>
          </div>
          <div className="p-6 md:p-8"><h4 className="mono-label mb-4 text-mist-400">এই প্রতিবেদন থেকে শেখা</h4>{items}<div className="mt-6 border-t border-white/8 pt-5"><p className="text-[13px] text-mist-400">ভাবুন তো</p><p className="font-display-bn mt-1 text-lg text-mist-100">{lesson.question}</p></div></div>
        </div>
      </div>
    );
  } else {
    content = (
      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="surface-hi flex flex-col justify-between rounded-2xl p-6 md:p-8">
          <div><Badge tone="ok"><BookOpenCheck className="h-3 w-3" /> পড়া সম্পূর্ণ</Badge><h3 className="font-display-bn mt-4 text-[clamp(1.5rem,3vw,2.2rem)] leading-snug text-mist-100">{lesson.headline}</h3></div>
          <p className="mono-label mt-6 flex items-center gap-2 text-mint-400"><CheckCircle2 className="h-3.5 w-3.5" /> প্রতিবেদনটি শেষ পর্যন্ত পড়েছেন</p>
        </div>
        <div className="surface rounded-2xl p-6 md:p-8"><h4 className="mono-label mb-4 flex items-center gap-2 text-mist-400"><Sparkles className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} /> মূল শিক্ষা</h4>{items}<div className="mt-6 rounded-xl border border-white/8 bg-white/[0.02] p-4"><p className="text-[12px] text-mist-400">নিজেকে প্রশ্ন করুন</p><p className="font-display-bn mt-1 text-[17px] leading-relaxed text-mist-100">{lesson.question}</p></div></div>
      </div>
    );
  }

  return (
    <SectionShell density={density}>
      <Reveal>
        <div className="mx-auto max-w-5xl">
          <SectionHead kicker="পড়া সম্পূর্ণ · শেখার বিরতি" title={<>পড়া শেষে: <span className="text-gradient">কী শিখলাম?</span></>} />
          {content}
        </div>
      </Reveal>
    </SectionShell>
  );
}

function Journal({ lesson, slug }: { lesson: { headline: string; items: string[]; question: string }; slug: string }) {
  const [note, setNote] = useState("");
  useEffect(() => {
    try { setNote(window.localStorage.getItem(`hoichoi-note-${slug}`) ?? ""); } catch { /* ignore */ }
  }, [slug]);
  return (
    <div className="surface rounded-2xl p-6 md:p-8">
      <Badge tone="violet"><Lightbulb className="h-3 w-3" /> ভাবনার ডায়েরি</Badge>
      <h3 className="font-display-bn mt-4 text-2xl leading-snug text-mist-100">{lesson.headline}</h3>
      <p className="mt-4 text-[14px] leading-relaxed text-mist-300">{lesson.question}</p>
      <textarea value={note} onChange={(e) => { setNote(e.target.value); try { window.localStorage.setItem(`hoichoi-note-${slug}`, e.target.value); } catch { /* ignore */ } }} rows={4} maxLength={700} placeholder="নিজের ভাবনা লিখুন — এটি শুধু আপনার ব্রাউজারে সংরক্ষিত থাকবে" className="mt-4 w-full resize-y rounded-xl border border-white/10 bg-ink-950/60 p-4 text-[14px] leading-relaxed text-mist-100 outline-none placeholder:text-mist-400 focus:border-[var(--accent)]" />
      <p className="mono-label mt-2 text-mist-400">এই নোট শুধু আপনার যন্ত্রে সংরক্ষিত থাকবে</p>
    </div>
  );
}

/* ═══════════════════ পাঠকের মন্তব্য ═══════════════════ */
export function PostComments({ variant, post, density }: { variant: string; post: PostRecord; density: "compact" | "comfortable" | "spacious" }) {
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;
    fetch(`/api/posts/${post.slug}/comments`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => { if (alive && data.ok && Array.isArray(data.comments)) setComments(data.comments); })
      .catch(() => { if (alive) setMessage("মন্তব্য আনা যায়নি। আবার চেষ্টা করুন।"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [post.slug]);

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/posts/${post.slug}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author, body }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error ?? "মন্তব্য পাঠানো যায়নি");
      setComments((old) => [data.comment, ...old]);
      setAuthor("");
      setBody("");
      setMessage("আপনার মন্তব্য প্রকাশিত হয়েছে। ধন্যবাদ!");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "মন্তব্য পাঠানো যায়নি");
    } finally {
      setSending(false);
    }
  }

  const form = (
    <form onSubmit={submitComment} className="space-y-3">
      <label className="block"><span className="mb-1.5 block text-[12.5px] text-mist-400">আপনার নাম</span><input required minLength={2} maxLength={60} value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="যে নামে দেখাতে চান" className="w-full rounded-xl border border-white/10 bg-ink-950/60 px-4 py-3 text-[14px] text-mist-100 outline-none placeholder:text-mist-400 focus:border-[var(--accent)]" /></label>
      <label className="block"><span className="mb-1.5 block text-[12.5px] text-mist-400">আপনার মন্তব্য</span><textarea required minLength={4} maxLength={700} rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="ভদ্র ও তথ্যভিত্তিক মতামত লিখুন…" className="w-full resize-y rounded-xl border border-white/10 bg-ink-950/60 px-4 py-3 text-[14px] leading-relaxed text-mist-100 outline-none placeholder:text-mist-400 focus:border-[var(--accent)]" /><span className="mono-label mt-1 block text-right text-mist-400">{bn(body.length)} / {bn(700)}</span></label>
      <button type="submit" disabled={sending} className="sheen inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13.5px] font-semibold text-ink-950 transition-all disabled:cursor-wait disabled:opacity-60" style={{ background: "var(--accent)" }}><Send className="h-4 w-4" />{sending ? "পাঠানো হচ্ছে…" : "মন্তব্য পাঠান"}</button>
      <p aria-live="polite" className={clsx("min-h-5 text-[12.5px]", message.includes("প্রকাশিত") ? "text-mint-400" : "text-rose-400")}>{message}</p>
    </form>
  );

  const list = (
    <div className="space-y-3">
      {loading ? <div className="space-y-2"><div className="shimmer h-20 rounded-xl" /><div className="shimmer h-20 rounded-xl" /></div> : null}
      {!loading && comments.length === 0 ? <div className="rounded-xl border border-dashed border-white/12 p-5 text-[13px] text-mist-400">এখনো কোনো মন্তব্য নেই। প্রথম মতামতটি আপনিই লিখুন।</div> : null}
      {comments.map((comment, index) => (
        <article key={comment.id} className={clsx("border border-white/8 bg-white/[0.02] p-4", variant === "bubbles" ? index % 2 ? "ml-7 rounded-2xl rounded-tr-sm" : "mr-7 rounded-2xl rounded-tl-sm" : "rounded-xl")}>
          <div className="flex items-start justify-between gap-3"><p className="text-[13.5px] font-semibold text-mist-100">{comment.author}</p><time className="mono-label text-mist-400">{bnDateTime(comment.createdAt)}</time></div>
          <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-mist-300">{comment.body}</p>
        </article>
      ))}
    </div>
  );

  let content: ReactNode;
  if (variant === "cards") {
    content = <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]"><div className="surface rounded-2xl p-5">{form}</div><div className="grid gap-3 sm:grid-cols-2">{loading ? <div className="shimmer h-24 rounded-xl" /> : null}{comments.map((comment) => <article key={comment.id} className="surface rounded-xl p-4"><p className="font-display-bn text-lg text-mist-100">{comment.author}</p><p className="mt-1 text-[11px] text-mist-400">{bnDateTime(comment.createdAt)}</p><p className="mt-3 text-[13.5px] leading-relaxed text-mist-300">{comment.body}</p></article>)}{!loading && comments.length === 0 ? <p className="text-[13px] text-mist-400">এখনো কোনো মন্তব্য নেই।</p> : null}</div></div>;
  } else if (variant === "bubbles") {
    content = <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]"><div className="surface-hi rounded-2xl p-5 md:p-6"><p className="mono-label mb-4 text-mist-400">পাঠকের কথোপকথন</p>{list}</div><div className="surface rounded-2xl p-5">{form}</div></div>;
  } else if (variant === "compact") {
    content = <div className="grid gap-5 xl:grid-cols-[1fr_1.15fr]"><div className="surface rounded-2xl p-5">{form}</div><div className="surface rounded-2xl p-5"><p className="mono-label mb-4 text-mist-400">সর্বশেষ মন্তব্য · {bn(comments.length)}</p>{list}</div></div>;
  } else if (variant === "editorial") {
    content = <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]"><div><div className="mb-3 flex items-center gap-2 text-mist-400"><MessageCircle className="h-4 w-4" style={{ color: "var(--accent)" }} /><span className="mono-label">পাঠকের মতামত</span></div><div className="surface-hi rounded-2xl p-5">{form}</div></div><div className="space-y-4">{loading ? <div className="shimmer h-24 rounded-xl" /> : null}{comments.map((comment) => <blockquote key={comment.id} className="border-l-2 pl-5 py-1" style={{ borderColor: "var(--accent)" }}><p className="font-display-bn text-[18px] leading-relaxed text-mist-100">“{comment.body}”</p><footer className="mono-label mt-2 text-mist-400">{comment.author} · {bnDateTime(comment.createdAt)}</footer></blockquote>)}{!loading && comments.length === 0 ? <p className="text-[13px] text-mist-400">প্রথম মতামতটি আপনিই লিখুন।</p> : null}</div></div>;
  } else {
    content = <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]"><div className="surface rounded-2xl p-5 md:p-6"><p className="mono-label mb-4 text-mist-400">আলোচনা · {bn(comments.length)}টি মন্তব্য</p>{list}</div><div className="surface-hi rounded-2xl p-5 md:p-6">{form}</div></div>;
  }

  return (
    <SectionShell id="post-comments" density={density}>
      <Reveal>
        <div className="mx-auto max-w-5xl">
          <SectionHead kicker="পাঠকের আলোচনা" title={<>আপনার <span className="text-gradient">মতামত লিখুন</span></>} desc="তথ্যভিত্তিক ও সৌজন্যপূর্ণ মন্তব্য করুন। মন্তব্য প্রকাশ্যে দেখা যাবে।" right={<Badge tone="cool"><MessageCircle className="h-3 w-3" />{bn(comments.length)}টি মতামত</Badge>} />
          {content}
        </div>
      </Reveal>
    </SectionShell>
  );
}

/* ═══════════════════ ভুল-তথ্য জানান ═══════════════════ */
const REPORT_REASONS = ["ভুল তথ্য", "সূত্রের সমস্যা", "অনুপযুক্ত ভাষা", "পুরোনো তথ্য", "অন্যান্য"] as const;

export function PostReport({ variant, post, density }: { variant: string; post: PostRecord; density: "compact" | "comfortable" | "spacious" }) {
  const [open, setOpen] = useState(variant !== "inline" && variant !== "drawer");
  const [reporter, setReporter] = useState("");
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/posts/${post.slug}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter, reason, details }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error ?? "প্রতিবেদন পাঠানো যায়নি");
      setDone(true);
      setDetails("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "প্রতিবেদন পাঠানো যায়নি");
    } finally {
      setBusy(false);
    }
  }

  const reasonFields = variant === "checklist" ? (
    <div className="grid gap-2 sm:grid-cols-2">
      {REPORT_REASONS.map((item) => <label key={item} className={clsx("flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-[13.5px] transition-colors", reason === item ? "border-[var(--accent)] bg-[var(--accent-soft)] text-mist-100" : "border-white/10 text-mist-300 hover:border-white/25")}><input type="radio" name="reason" checked={reason === item} onChange={() => setReason(item)} className="accent-[var(--accent)]" />{item}</label>)}
    </div>
  ) : (
    <label className="block"><span className="mb-1.5 block text-[12.5px] text-mist-400">কোন ধরনের সমস্যা?</span><select required value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-xl border border-white/10 bg-ink-950 px-4 py-3 text-[14px] text-mist-100 outline-none focus:border-[var(--accent)]"><option value="">একটি কারণ বেছে নিন</option>{REPORT_REASONS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
  );

  const form = done ? (
    <div role="status" className="rounded-xl border border-mint-500/25 bg-mint-500/10 p-5"><CheckCircle2 className="h-5 w-5 text-mint-400" /><h3 className="font-display-bn mt-2 text-xl text-mist-100">ধন্যবাদ, সম্পাদকীয় ডেস্ককে জানানো হয়েছে।</h3><p className="mt-1 text-[13px] text-mist-300">আপনার প্রতিবেদনটি পর্যালোচনার জন্য জমা হয়েছে।</p></div>
  ) : (
    <form onSubmit={submit} className="space-y-3">
      {reasonFields}
      <label className="block"><span className="mb-1.5 block text-[12.5px] text-mist-400">নাম (ঐচ্ছিক)</span><input maxLength={60} value={reporter} onChange={(e) => setReporter(e.target.value)} placeholder="নাম না দিলেও হবে" className="w-full rounded-xl border border-white/10 bg-ink-950/60 px-4 py-3 text-[14px] text-mist-100 outline-none placeholder:text-mist-400 focus:border-[var(--accent)]" /></label>
      <label className="block"><span className="mb-1.5 block text-[12.5px] text-mist-400">বিস্তারিত (ঐচ্ছিক)</span><textarea maxLength={1200} rows={3} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="কোন অংশটি ভুল মনে হয়েছে, সূত্রসহ লিখুন…" className="w-full resize-y rounded-xl border border-white/10 bg-ink-950/60 px-4 py-3 text-[14px] leading-relaxed text-mist-100 outline-none placeholder:text-mist-400 focus:border-[var(--accent)]" /></label>
      {error ? <p role="alert" className="text-[12.5px] text-rose-400">{error}</p> : null}
      <button type="submit" disabled={busy || !reason} className="sheen inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13.5px] font-semibold text-ink-950 transition-all disabled:opacity-50" style={{ background: "var(--accent)" }}><Send className="h-4 w-4" />{busy ? "পাঠানো হচ্ছে…" : "সম্পাদককে পাঠান"}</button>
    </form>
  );

  if (variant === "drawer") {
    return (
      <SectionShell density={density}>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 rounded-2xl border border-white/8 bg-white/[0.02] p-5"><div className="flex items-center gap-3"><AlertTriangle className="h-5 w-5" style={{ color: "var(--accent)" }} /><p className="text-[14px] text-mist-200">প্রতিবেদনে কোনো ভুল বা অসম্পূর্ণ তথ্য পেয়েছেন?</p></div><Btn onClick={() => setOpen(true)} variant="outline" icon={false}>ভুল জানান</Btn></div>
        {open ? <div className="fixed inset-0 z-[100] flex justify-end bg-ink-950/70 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}><div className="h-full w-full max-w-lg overflow-y-auto border-l border-white/10 bg-ink-900 p-6 shadow-2xl"><div className="mb-6 flex items-center justify-between"><div><p className="mono-label text-mist-400">সম্পাদকীয় ডেস্ক</p><h2 className="font-display-bn mt-1 text-2xl text-mist-100">ভুল তথ্য জানান</h2></div><button onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-mist-300" aria-label="বন্ধ করুন"><X className="h-4 w-4" /></button></div>{form}</div></div> : null}
      </SectionShell>
    );
  }

  if (variant === "inline") {
    return (
      <SectionShell density={density} className="!py-6">
        <div className="mx-auto max-w-4xl rounded-2xl border border-white/8 bg-white/[0.02] p-5"><button onClick={() => setOpen((value) => !value)} className="flex w-full items-center gap-3 text-left"><AlertTriangle className="h-4 w-4" style={{ color: "var(--accent)" }} /><span className="flex-1 text-[13.5px] text-mist-300">প্রতিবেদনে ভুল দেখেছেন? সম্পাদকীয় ডেস্ককে জানান।</span><ChevronDown className={clsx("h-4 w-4 text-mist-400 transition-transform", open && "rotate-180")} /></button>{open ? <div className="mt-4 border-t border-white/8 pt-4">{form}</div> : null}</div>
      </SectionShell>
    );
  }

  const content = variant === "steps" ? (
    <div className="grid gap-4 lg:grid-cols-[0.65fr_1.35fr]"><div className="surface rounded-2xl p-5"><p className="mono-label text-mist-400">ধাপ ১</p><h3 className="font-display-bn mt-2 text-xl text-mist-100">সমস্যার ধরন বেছে নিন</h3><div className="mt-5 space-y-2">{REPORT_REASONS.map((item, index) => <button key={item} onClick={() => setReason(item)} className={clsx("flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-[13px]", reason === item ? "border-[var(--accent)] bg-[var(--accent-soft)] text-mist-100" : "border-white/8 text-mist-400")}><span className="mono-label">{bn(index + 1)}</span>{item}</button>)}</div><p className="mono-label mt-4 text-mist-400">ধাপ ২ · প্রয়োজনে ব্যাখ্যা লিখুন</p></div><div className="surface-hi rounded-2xl p-5"><p className="mono-label mb-4 text-mist-400">প্রতিবেদন পাঠান</p>{form}</div></div>
  ) : (
    <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]"><div className="surface rounded-2xl p-6"><AlertTriangle className="h-6 w-6" style={{ color: "var(--accent)" }} /><h3 className="font-display-bn mt-4 text-2xl text-mist-100">একসঙ্গে তথ্য যাচাই করি।</h3><p className="mt-2 text-[14px] leading-relaxed text-mist-400">ভুল, পুরোনো বা অসম্পূর্ণ তথ্য চোখে পড়লে কারণ জানান। সম্পাদকীয় দল প্রতিবেদনটি দেখে প্রয়োজনে সংশোধন করবে।</p><div className="mt-5 flex items-center gap-2 text-[12px] text-mist-400"><ShieldCheck className="h-4 w-4" style={{ color: "var(--accent)" }} /> প্রতিবেদনটি সরাসরি ডেটাবেসে সংরক্ষিত হবে</div></div><div className="surface-hi rounded-2xl p-5 md:p-6">{form}</div></div>
  );

  return (
    <SectionShell id="post-report" density={density}>
      <Reveal><div className="mx-auto max-w-5xl"><SectionHead kicker="সংশোধন ও পাঠক-সহায়তা" title={<>ভুল বা অসম্পূর্ণ তথ্য <span className="text-gradient">জানিয়ে দিন</span></>} desc="প্রতিবেদনটি আরও নির্ভুল করতে আপনার তথ্য সম্পাদকীয় ডেস্কে পাঠান।" />{content}</div></Reveal>
    </SectionShell>
  );
}

export function ReadingFinishedBadge() {
  return <Badge tone="ok"><CheckCircle2 className="h-3 w-3" /> সম্পূর্ণ পড়া হয়েছে</Badge>;
}
