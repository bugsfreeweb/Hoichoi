"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { BookmarkCheck, Clock3, CornerDownLeft, Search, X } from "lucide-react";
import { playClick } from "@/lib/sound";
import { bn } from "@/lib/format";

interface Hit {
  slug: string;
  title: string;
  dek: string;
  category: string;
  image: string;
  readMinutes: number;
}

async function fetchHits(params: string, signal?: AbortSignal): Promise<Hit[]> {
  try {
    const res = await fetch(`/api/search?${params}`, { signal, cache: "no-store" });
    const data = await res.json();
    return Array.isArray(data.hits) ? data.hits : [];
  } catch {
    return [];
  }
}

function Row({ hit, onPick }: { hit: Hit; onPick: () => void }) {
  return (
    <Link
      href={`/post/${hit.slug}`}
      onClick={onPick}
      className="group flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-white/[0.06]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={hit.image} alt="" className="h-12 w-16 shrink-0 rounded-lg object-cover" />
      <span className="min-w-0 flex-1">
        <span className="mono-label block" style={{ color: "var(--accent)" }}>
          {hit.category}
        </span>
        <span className="font-display-bn line-clamp-1 block text-[15px] text-mist-100">{hit.title}</span>
      </span>
      <span className="mono-label hidden shrink-0 items-center gap-1 text-mist-400 sm:flex">
        <Clock3 className="h-3 w-3" /> {bn(hit.readMinutes)} মি
      </span>
    </Link>
  );
}

export default function SearchButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [latest, setLatest] = useState<Hit[]>([]);
  const [saved, setSaved] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = () => {
    setOpen(false);
    setQ("");
  };

  // "/" opens search from anywhere that isn't a text field; Esc closes it
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape") {
        setOpen(false);
        setQ("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // when opened: focus, lock page scroll, load the idle lists (latest + saved)
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    const ctl = new AbortController();
    void fetchHits("", ctl.signal).then(setLatest);
    let slugs: string[] = [];
    try {
      slugs = JSON.parse(window.localStorage.getItem("hoichoi-saved") ?? "[]");
    } catch {
      /* ignore */
    }
    if (slugs.length) void fetchHits(`slugs=${encodeURIComponent(slugs.join(","))}`, ctl.signal).then(setSaved);
    else setSaved([]);
    return () => {
      document.body.style.overflow = "";
      window.clearTimeout(t);
      ctl.abort();
    };
  }, [open]);

  // debounced query
  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (!term) {
      setHits([]);
      setBusy(false);
      return;
    }
    setBusy(true);
    const ctl = new AbortController();
    const t = window.setTimeout(async () => {
      const found = await fetchHits(`q=${encodeURIComponent(term)}`, ctl.signal);
      if (!ctl.signal.aborted) {
        setHits(found);
        setBusy(false);
      }
    }, 220);
    return () => {
      window.clearTimeout(t);
      ctl.abort();
    };
  }, [q, open]);

  const term = q.trim();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          playClick(720);
          setOpen(true);
        }}
        aria-label="খুঁজুন"
        title="খুঁজুন (/)"
        className={clsx(
          "grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 text-mist-300 transition-colors hover:border-white/25 hover:text-mist-100",
          className,
        )}
      >
        <Search className="h-4 w-4" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[120] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="প্রতিবেদন খুঁজুন">
          <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-md" onClick={close} />
          <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-white/15 bg-ink-900 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3.5">
              <Search className="h-4.5 w-4.5 shrink-0 text-mist-400" />
              <input
                ref={inputRef}
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="শিরোনাম, বিষয় বা ট্যাগ লিখে খুঁজুন…"
                aria-label="খোঁজার শব্দ"
                className="w-full bg-transparent text-[16px] text-mist-100 outline-none placeholder:text-mist-400"
              />
              {busy ? <span className="mono-label shrink-0 animate-pulse text-mist-400">খোঁজা হচ্ছে…</span> : null}
              <button onClick={close} aria-label="বন্ধ করুন" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-mist-300 hover:bg-white/5">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[56vh] overflow-y-auto p-2.5">
              {term ? (
                hits.length ? (
                  <>
                    <p className="mono-label px-2.5 pb-1.5 pt-1 text-mist-400">{bn(hits.length)}টি ফলাফল</p>
                    {hits.map((h) => (
                      <Row key={h.slug} hit={h} onPick={close} />
                    ))}
                  </>
                ) : busy ? null : (
                  <p className="px-3 py-8 text-center text-[14px] text-mist-400">“{term}” — এই নামে কোনো প্রতিবেদন পাওয়া যায়নি। অন্য শব্দে চেষ্টা করুন।</p>
                )
              ) : (
                <>
                  {saved.length ? (
                    <>
                      <p className="mono-label flex items-center gap-1.5 px-2.5 pb-1.5 pt-1 text-mist-400">
                        <BookmarkCheck className="h-3 w-3 text-mint-400" /> আপনার সংরক্ষিত পাঠ
                      </p>
                      {saved.map((h) => (
                        <Row key={`s-${h.slug}`} hit={h} onPick={close} />
                      ))}
                    </>
                  ) : null}
                  <p className="mono-label px-2.5 pb-1.5 pt-3 text-mist-400">সর্বশেষ প্রতিবেদন</p>
                  {latest.map((h) => (
                    <Row key={`l-${h.slug}`} hit={h} onPick={close} />
                  ))}
                </>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-white/10 bg-ink-950/50 px-4 py-2.5">
              <span className="mono-label text-mist-400">খুলতে <kbd className="rounded border border-white/15 px-1.5">/</kbd> · বন্ধ করতে <kbd className="rounded border border-white/15 px-1.5">Esc</kbd></span>
              <span className="mono-label flex items-center gap-1 text-mist-400"><CornerDownLeft className="h-3 w-3" /> ক্লিক করে পড়ুন</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
