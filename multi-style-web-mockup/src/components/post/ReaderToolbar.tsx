"use client";

import { useEffect, useState, type ReactNode } from "react";
import clsx from "clsx";
import {
  Bookmark,
  BookmarkCheck,
  Check,
  Link2,
  Minus,
  Pause,
  Play,
  Plus,
  Printer,
  Quote,
  Share2,
  Square,
  Type,
} from "lucide-react";
import { playClick } from "@/lib/sound";
import { bn } from "@/lib/format";

const SIZE_KEY = "hoichoi-reading-size";
const SAVE_KEY = "hoichoi-saved";

/* ═════════ টেক্সট-থেকে-কথা · প্রতিবেদন শুনুন ═════════ */
function useSpeech(text: string) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const start = () => {
    if (!supported || !text.trim()) return;
    playClick(760);
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text.replace(/\s+/g, " ").trim().slice(0, 4500));
    utter.lang = "bn-BD";
    utter.rate = 0.96;
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith("bn"));
    if (voice) utter.voice = voice;
    const stop = () => {
      setSpeaking(false);
      setPaused(false);
    };
    utter.onend = stop;
    utter.onerror = stop;
    window.speechSynthesis.speak(utter);
    setSpeaking(true);
    setPaused(false);
  };
  const pause = () => {
    playClick(520);
    window.speechSynthesis.pause();
    setPaused(true);
  };
  const resume = () => {
    playClick(640);
    window.speechSynthesis.resume();
    setPaused(false);
  };
  const stop = () => {
    playClick(420);
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
  };
  return { supported, speaking, paused, start, pause, resume, stop };
}

export type ToolsVariant = "bar" | "floating" | "inline" | "sidebar" | "compact";

export default function ReaderToolbar({
  slug,
  title,
  source,
  author,
  publishedAt,
  plainText,
  variant = "bar",
  className,
}: {
  slug: string;
  title: string;
  source: string;
  author: string;
  publishedAt: Date;
  plainText: string;
  variant?: ToolsVariant | string;
  className?: string;
}) {
  const speech = useSpeech(`${title}. ${plainText}`);
  const [size, setSize] = useState(1);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState<"link" | "cite" | null>(null);

  // load persisted preferences once
  useEffect(() => {
    try {
      const raw = Number(window.localStorage.getItem(SIZE_KEY));
      if (raw >= 0.85 && raw <= 1.35) setSize(raw);
    } catch {
      /* storage unavailable */
    }
    try {
      const list: string[] = JSON.parse(window.localStorage.getItem(SAVE_KEY) ?? "[]");
      setSaved(list.includes(slug));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, [slug]);

  // apply + persist, but only after the stored value has been read (otherwise 1 overwrites it)
  useEffect(() => {
    if (!ready) return;
    document.documentElement.style.setProperty("--reading-scale", String(size));
    try {
      window.localStorage.setItem(SIZE_KEY, String(size));
    } catch {
      /* ignore */
    }
  }, [size, ready]);

  const toggleSave = () => {
    playClick(saved ? 480 : 900);
    try {
      const list: string[] = JSON.parse(window.localStorage.getItem(SAVE_KEY) ?? "[]");
      const next = saved ? list.filter((s) => s !== slug) : [slug, ...list].slice(0, 60);
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event("hoichoi-saved-changed"));
    } catch {
      /* ignore */
    }
    setSaved(!saved);
  };

  const copy = async (kind: "link" | "cite") => {
    playClick(780);
    const url = `${window.location.origin}/post/${slug}`;
    const dateStr = new Intl.DateTimeFormat("bn-BD", { timeZone: "Asia/Dhaka", year: "numeric", month: "long", day: "numeric" }).format(new Date(publishedAt));
    const citation = `হৈচৈ সম্পাদকীয় ডেস্ক। "${title}"। হৈচৈ, ${dateStr}। মূল উৎস: ${source}। লেখক: ${author}। প্রবেশ: ${url}`;
    try {
      await navigator.clipboard.writeText(kind === "cite" ? citation : url);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      /* clipboard unavailable (insecure context) */
    }
  };

  const share = async () => {
    playClick(860);
    if (navigator.share) {
      try {
        await navigator.share({ title, url: window.location.href });
        return;
      } catch {
        /* cancelled */
      }
    }
    void copy("link");
  };

  /* ── pieces ── */
  const btn =
    "group inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-[12.5px] font-medium text-mist-300 transition-all hover:border-white/25 hover:bg-white/[0.07] hover:text-mist-100";
  const iconBtn =
    "grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-mist-300 transition-all hover:border-white/25 hover:bg-white/[0.07] hover:text-mist-100";

  const listen = speech.supported ? (
    <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
      {!speech.speaking ? (
        <button onClick={speech.start} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-ink-950 transition-all hover:brightness-110" style={{ background: "var(--accent)" }} title="প্রতিবেদনটি শুনুন">
          <Play className="h-3.5 w-3.5" /> শুনুন
        </button>
      ) : (
        <>
          <button onClick={speech.paused ? speech.resume : speech.pause} className="grid h-7 w-7 place-items-center rounded-full text-mist-200 hover:bg-white/10" title={speech.paused ? "চালু করুন" : "বিরতি"}>
            {speech.paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </button>
          <button onClick={speech.stop} className="grid h-7 w-7 place-items-center rounded-full text-rose-400 hover:bg-white/10" title="বন্ধ করুন">
            <Square className="h-3 w-3" />
          </button>
          <span className="mono-label pr-2 text-mint-400">
            <span className="mr-1 inline-block h-1.5 w-1.5 animate-ping rounded-full bg-current" />
            পড়া হচ্ছে
          </span>
        </>
      )}
    </div>
  ) : null;

  const sizer = (
    <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-1.5 py-1">
      <Type className="ml-1 h-3.5 w-3.5 text-mist-400" />
      <button onClick={() => setSize((s) => Math.max(0.85, Number((s - 0.05).toFixed(2))))} className="grid h-6 w-6 place-items-center rounded-full text-mist-300 hover:bg-white/10 hover:text-mist-100" title="লেখা ছোট করুন" aria-label="লেখা ছোট করুন">
        <Minus className="h-3 w-3" />
      </button>
      <span className="mono-label w-9 text-center text-mist-300">{bn(Math.round(size * 100))}%</span>
      <button onClick={() => setSize((s) => Math.min(1.35, Number((s + 0.05).toFixed(2))))} className="grid h-6 w-6 place-items-center rounded-full text-mist-300 hover:bg-white/10 hover:text-mist-100" title="লেখা বড় করুন" aria-label="লেখা বড় করুন">
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );

  const actions: { key: string; label: string; done?: string; Icon: typeof Bookmark; DoneIcon?: typeof Check; on: () => void; active?: boolean; title: string }[] = [
    { key: "save", label: "সংরক্ষণ", done: "সংরক্ষিত", Icon: Bookmark, DoneIcon: BookmarkCheck, on: toggleSave, active: saved, title: saved ? "সংরক্ষণ থেকে সরান" : "সংরক্ষণ করুন" },
    { key: "cite", label: "উদ্ধৃতি", done: "কপি হয়েছে", Icon: Quote, DoneIcon: Check, on: () => void copy("cite"), active: copied === "cite", title: "উদ্ধৃতি কপি করুন" },
    { key: "link", label: "লিংক", done: "কপি হয়েছে", Icon: Link2, DoneIcon: Check, on: () => void copy("link"), active: copied === "link", title: "লিংক কপি করুন" },
    { key: "share", label: "ভাগ", Icon: Share2, on: () => void share(), title: "ভাগ করুন" },
    { key: "print", label: "প্রিন্ট", Icon: Printer, on: () => { playClick(560); window.print(); }, title: "প্রিন্ট করুন" },
  ];

  const labelled = (a: (typeof actions)[number]) => {
    const I = a.active && a.DoneIcon ? a.DoneIcon : a.Icon;
    return (
      <button key={a.key} onClick={a.on} className={btn} title={a.title}>
        <I className={clsx("h-3.5 w-3.5", a.active && "text-mint-400")} />
        {a.active && a.done ? a.done : a.label}
      </button>
    );
  };
  const iconOnly = (a: (typeof actions)[number], cls = iconBtn) => {
    const I = a.active && a.DoneIcon ? a.DoneIcon : a.Icon;
    return (
      <button key={a.key} onClick={a.on} className={cls} title={a.title} aria-label={a.title}>
        <I className={clsx("h-4 w-4", a.active && "text-mint-400")} />
      </button>
    );
  };

  const wrap = (node: ReactNode) => <div className={className}>{node}</div>;

  /* compact — only the two things readers actually reach for */
  if (variant === "compact") {
    return wrap(
      <div className="mx-auto flex max-w-fit flex-wrap items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.02] p-1.5">
        {listen}
        {sizer}
      </div>,
    );
  }

  /* inline — a plain row of icons under the headline, no card */
  if (variant === "inline") {
    return wrap(
      <div className="flex flex-wrap items-center gap-2 border-y border-white/8 py-3">
        {listen}
        {sizer}
        <span className="mx-1 hidden h-6 w-px bg-white/10 sm:block" />
        {actions.map((a) => iconOnly(a))}
      </div>,
    );
  }

  /* floating — a pill pinned to the bottom of the screen while you read */
  if (variant === "floating") {
    return (
      <div className={className}>
        <div className="fixed bottom-5 left-1/2 z-[60] flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center gap-2 overflow-x-auto rounded-full border border-white/15 bg-ink-900/90 p-1.5 shadow-[0_18px_44px_-16px_rgba(0,0,0,0.7)] backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {listen}
          {sizer}
          {actions.slice(0, 3).map((a) => iconOnly(a, "grid h-9 w-9 shrink-0 place-items-center rounded-full text-mist-300 transition-colors hover:bg-white/10 hover:text-mist-100"))}
        </div>
      </div>
    );
  }

  /* sidebar — a vertical rail on wide screens, falls back to the bar below xl */
  if (variant === "sidebar") {
    return (
      <div className={className}>
        <div className="fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-stretch gap-2 rounded-2xl border border-white/12 bg-ink-900/90 p-2 backdrop-blur-xl xl:flex">
          {speech.supported ? (
            <button onClick={speech.speaking ? speech.stop : speech.start} className={iconBtn} title={speech.speaking ? "বন্ধ করুন" : "শুনুন"} aria-label="শুনুন">
              {speech.speaking ? <Square className="h-4 w-4 text-rose-400" /> : <Play className="h-4 w-4" style={{ color: "var(--accent)" }} />}
            </button>
          ) : null}
          <button onClick={() => setSize((s) => Math.min(1.35, Number((s + 0.05).toFixed(2))))} className={iconBtn} title="লেখা বড় করুন" aria-label="লেখা বড় করুন"><Plus className="h-4 w-4" /></button>
          <span className="mono-label text-center text-mist-400">{bn(Math.round(size * 100))}%</span>
          <button onClick={() => setSize((s) => Math.max(0.85, Number((s - 0.05).toFixed(2))))} className={iconBtn} title="লেখা ছোট করুন" aria-label="লেখা ছোট করুন"><Minus className="h-4 w-4" /></button>
          <span className="my-0.5 h-px bg-white/10" />
          {actions.map((a) => iconOnly(a))}
        </div>
        <div className="surface flex flex-wrap items-center gap-2 rounded-2xl p-3 xl:hidden">
          {listen}
          {sizer}
          {actions.map(labelled)}
        </div>
      </div>
    );
  }

  /* bar — full toolbar (default) */
  return wrap(
    <div className="surface flex flex-wrap items-center gap-2 rounded-2xl p-3">
      {listen}
      {sizer}
      {actions.map(labelled)}
    </div>,
  );
}
