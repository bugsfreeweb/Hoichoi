"use client";

import { useEffect, useRef, useState } from "react";

interface ImageProvider {
  id: string;
  displayName: string;
  providerKey: string;
  model: string;
  isFreeTier: boolean;
  envVar: string;
  hasKey: boolean;
  supportsImage: boolean;
}

interface Options {
  providers: ImageProvider[];
  suggestedPrompt: string;
  aspectRatios: string[];
  sizes: string[];
  styles: string[];
  qualities: string[];
}

type Via = "runner" | "local";

/** How often the panel re-checks for a queued image. */
const POLL_MS = 6000;
/** Give up after this long and tell the operator where to look. */
const POLL_MAX_MS = 8 * 60 * 1000;

const field =
  "mt-1 w-full border border-ink/30 bg-paper px-3 py-2 text-[13px] focus:outline-none";
const btnLime =
  "border-2 border-ink bg-lime px-4 py-2.5 text-[13px] font-bold text-ink transition hover:bg-paper disabled:opacity-50";

/**
 * Manual image generator for the post editor.
 *
 * The pipeline fills missing heroes automatically, but when it can't (no key,
 * sensitive category, provider outage) an editor needs a way to produce an
 * exact image on demand — this panel. It offers a prompt plus the option knobs
 * each backend understands, lets the editor pick the provider, and attaches the
 * result to the post.
 */
export function PostImageGenerator({
  postId,
  onAttached,
}: {
  postId: string;
  onAttached: (mediaPath: string) => void;
}) {
  const [opts, setOpts] = useState<Options | null>(null);
  const [providerId, setProviderId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [size, setSize] = useState("");
  const [style, setStyle] = useState("");
  const [quality, setQuality] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [via, setVia] = useState<Via | null>(null);
  const [queued, setQueued] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  /** `media_path` as of the last successful check — the poll watches for a change. */
  const baseRef = useRef<string | null>(null);
  const attachedRef = useRef(onAttached);
  attachedRef.current = onAttached;

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/posts/${postId}/generate-image`, { cache: "no-store" });
        const j = (await res.json()) as Partial<Options> & {
          error?: string;
          via?: string;
          media_path?: string | null;
        };
        if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`);
        setVia(j.via === "runner" ? "runner" : "local");
        baseRef.current = j.media_path ?? null;
        setOpts({
          providers: j.providers ?? [],
          suggestedPrompt: j.suggestedPrompt ?? "",
          aspectRatios: j.aspectRatios ?? [],
          sizes: j.sizes ?? [],
          styles: j.styles ?? [],
          qualities: j.qualities ?? [],
        });
        setPrompt(j.suggestedPrompt ?? "");
        const first = (j.providers ?? []).find((p) => p.hasKey && p.supportsImage);
        setProviderId(first?.id ?? "");
      } catch (e) {
        setErr(e instanceof Error ? e.message : "ছবি-জেনারেটর লোড ব্যর্থ");
      }
    })();
  }, [postId]);

  const generate = async () => {
    if (!prompt.trim()) {
      setErr("প্রম্পট লিখুন।");
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    setPreview(null);
    try {
      const res = await fetch(`/api/posts/${postId}/generate-image`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt,
          providerId: providerId || undefined,
          aspectRatio: aspectRatio || undefined,
          size: size || undefined,
          style: style || undefined,
          quality: quality || undefined,
          negativePrompt: negativePrompt || undefined,
          attach: true,
        }),
      });
      const j = (await res.json().catch(() => null)) as
        | {
            media_path?: string;
            provider?: string;
            model?: string;
            error?: string;
            queued?: boolean;
            message?: string;
          }
        | null;
      if (!res.ok) throw new Error(j?.error ?? `HTTP ${res.status}`);

      // Handed to the GitHub Actions runner: the image does not exist yet, so
      // there is nothing to preview — start watching for it instead.
      if (j?.queued) {
        setQueued(true);
        setMsg(j.message ?? "ছবি তৈরি হচ্ছে…");
        return;
      }

      if (j?.media_path) {
        setPreview(previewSrc(j.media_path));
        baseRef.current = j.media_path;
        onAttached(j.media_path);
      }
      setMsg(`✓ ছবি তৈরি হয়েছে (${j?.provider ?? "?"} · ${j?.model ?? "?"}) ও পোস্টে যুক্ত হয়েছে`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "ছবি তৈরি ব্যর্থ");
    } finally {
      setBusy(false);
    }
  };

  // Poll the API until a queued image has been attached *and* Vercel has
  // rebuilt with it in `public/uploads`. Checking `media_path` alone is not
  // enough: the post can reference the file before the new build serves it, so
  // the preview would still 404 for a minute or two.
  useEffect(() => {
    if (!queued) return;
    const started = Date.now();

    const imageLoads = async (url: string): Promise<boolean> => {
      try {
        const res = await fetch(url, { method: "HEAD", cache: "no-store" });
        return res.ok;
      } catch {
        return false;
      }
    };

    const tick = async () => {
      try {
        const res = await fetch(`/api/posts/${postId}/generate-image`, { cache: "no-store" });
        if (!res.ok) return;
        const j = (await res.json()) as { media_path?: string | null };
        const cur = j.media_path ?? null;
        if (cur && cur !== baseRef.current) {
          const src = previewSrc(cur);
          if (await imageLoads(src)) {
            baseRef.current = cur;
            setPreview(src);
            setQueued(false);
            setStatus(null);
            setMsg("✓ ছবি তৈরি হয়েছে ও পোস্টে যুক্ত হয়েছে");
            attachedRef.current(cur);
            return;
          }
          setStatus("ছবি পোস্টে যুক্ত হয়েছে — ডিপ্লয় শেষ হওয়ার অপেক্ষায়…");
        }
        if (Date.now() - started > POLL_MAX_MS) {
          setQueued(false);
          setStatus(null);
          setErr(
            "সময় শেষ — ছবিটি এখনো দেখা যাচ্ছে না। GitHub-এর generate-image রান চেক করুন (Actions ট্যাব), তারপর পেজটি রিফ্রেশ করুন।",
          );
        }
      } catch {
        /* a transient poll failure must not stop the loop */
      }
    };

    const timer = setInterval(() => void tick(), POLL_MS);
    void tick();
    return () => clearInterval(timer);
  }, [queued, postId]);

  const available = (opts?.providers ?? []).filter((p) => p.supportsImage);
  const usable = available.some((p) => p.hasKey);

  return (
    <div className="mt-4 border border-ink/15 bg-paper p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-sans-bn text-[14px] font-bold text-ink">✨ এআই দিয়ে ছবি তৈরি করুন</h4>
        {opts && (
          <span className="font-mono-x text-[10px] text-ink-soft">
            {via === "runner"
              ? "GitHub Actions রানারে তৈরি হবে (মিডিয়া সার্ভারে সংরক্ষিত হয়)"
              : available.length === 0
                ? "কোনো ইমেজ প্রোভাইডার নেই (purpose = image)"
                : usable
                  ? `${available.length} প্রোভাইডার সক্রিয়`
                  : "কী সেট করা নেই — একটি প্রোভাইডার কী যোগ করুন"}
          </span>
        )}
      </div>

      {err && (
        <p className="mt-3 border border-alizarin bg-alizarin/10 px-3 py-2 text-[12.5px] font-bold text-ink">
          ✕ {err}
        </p>
      )}
      {msg && (
        <p className="mt-3 border border-cat-teal bg-cat-teal/10 px-3 py-2 text-[12.5px] font-bold text-ink">{msg}</p>
      )}
      {status && <p className="mt-3 text-[12.5px] text-ink-soft">{status}</p>}

      <div className="mt-3">
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">প্রম্পট</span>
          <textarea
            className={field}
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="ছবিতে কী থাকবে বর্ণনা করুন…"
          />
        </label>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">প্রোভাইডার</span>
          <select className={field} value={providerId} onChange={(e) => setProviderId(e.target.value)}>
            <option value="">স্বয়ংক্রিয় (ফ্রি আগে)</option>
            {available.map((p) => (
              <option key={p.id} value={p.id} disabled={!p.hasKey}>
                {p.displayName} · {p.model}
                {p.hasKey ? "" : " (কী নেই)"}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">অনুপাত (aspect ratio)</span>
          <select className={field} value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
            <option value="">— ডিফল্ট —</option>
            {(opts?.aspectRatios ?? []).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">সাইজ</span>
          <select className={field} value={size} onChange={(e) => setSize(e.target.value)}>
            <option value="">— ডিফল্ট —</option>
            {(opts?.sizes ?? []).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">স্টাইল</span>
          <select className={field} value={style} onChange={(e) => setStyle(e.target.value)}>
            <option value="">— ডিফল্ট —</option>
            {(opts?.styles ?? []).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">কোয়ালিটি</span>
          <select className={field} value={quality} onChange={(e) => setQuality(e.target.value)}>
            <option value="">— ডিফল্ট —</option>
            {(opts?.qualities ?? []).map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">যা থাকবে না (negative)</span>
          <input
            className={field}
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            placeholder="text, logo, watermark…"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          className={btnLime}
          onClick={() => void generate()}
          disabled={busy || queued || !prompt.trim()}
        >
          {busy
            ? "ছবি তৈরি হচ্ছে…"
            : queued
              ? "⏳ রানারে তৈরি হচ্ছে…"
              : via === "runner"
                ? "🪄 ছবি তৈরি করুন (সার্ভারে)"
                : "🪄 ছবি তৈরি + যুক্ত করুন"}
        </button>
        <span className="text-[11px] text-ink-soft">
          {via === "runner"
            ? "ছবিটি GitHub Actions-এ তৈরি হয়ে মিডিয়া ফোল্ডারে সংরক্ষিত হবে — ডিপ্লয় শেষ হলে এখানেই দেখাবে।"
            : "তৈরি হলে ছবিটি সাথে সাথে এই পোস্টে যুক্ত হয়ে যায়; চাইলে পরে বদলাতে পারবেন।"}
        </span>
      </div>

      {preview && (
        <div className="mt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="h-40 w-auto max-w-full border border-ink/20 object-contain" />
        </div>
      )}
    </div>
  );
}

function previewSrc(p: string): string {
  return /^https?:\/\//i.test(p) ? p : `/uploads/${p.replace(/\\/g, "/")}`;
}
