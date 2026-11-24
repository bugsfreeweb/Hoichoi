"use client";

import { useEffect, useRef, useState } from "react";
// The frame vocabulary, not the renderer: this is a client component and
// `@hoichoi/poster` carries sharp and playwright.
import { POSTER_LAYOUTS, POSTER_THEMES } from "@hoichoi/shared-types";

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
  /**
   * The plate's frame, when the operator wants to overrule the desk.
   *
   * Empty is the default and the honest one: the layout is a function of the desk
   * (a breaking story is a banner), so this is the escape hatch for the story
   * where that reads wrong — a profile that would look like a wire bulletin.
   */
  const [layout, setLayout] = useState("");
  const [theme, setTheme] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [via, setVia] = useState<Via | null>(null);
  const [queued, setQueued] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  /**
   * The dynamic poster, which is a different pipeline from the image above:
   * an LLM art director picks the layout and palette, the image model draws
   * only the focal visual, and the headlines are set in HTML. It carries its
   * own state so a "Regenerate Style" click cannot overwrite an image the
   * editor has just approved by accident.
   */
  const [posterBusy, setPosterBusy] = useState(false);
  const [poster, setPoster] = useState<{
    dataUrl: string;
    layout: string;
    palette: string;
    mediaPath: string | null;
    directedBy: string;
  } | null>(null);
  const [posterMsg, setPosterMsg] = useState<string | null>(null);

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
          layout: layout || undefined,
          theme: theme || undefined,
          attach: true,
        }),
      });
      const j = (await res.json().catch(() => null)) as
        | {
            media_path?: string;
            provider?: string;
            model?: string;
            error?: string;
            warning?: string;
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
      setMsg(
        `✓ ছবি তৈরি হয়েছে (${j?.provider ?? "?"} · ${j?.model ?? "?"}) ও পোস্টে যুক্ত হয়েছে${
          j?.warning ? ` · স্টোরেজ সতর্কতা: ${j.warning}` : ""
        }`,
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "ছবি তৈরি ব্যর্থ");
    } finally {
      setBusy(false);
    }
  };

  /**
   * Generate a fresh design for this story. Every click is a new art-direction
   * pass, and the route rotates the layout/palette against the last five
   * posters, so "Regenerate Style" always produces a visibly different page
   * rather than a new photograph in the same frame.
   */
  const regenerateStyle = async () => {
    setPosterBusy(true);
    setPosterMsg(null);
    try {
      const res = await fetch("/api/generate-poster", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ postId, regenerate: true, attach: true, format: "webp" }),
      });
      const j = (await res.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: string;
            warnings?: string[];
            design?: { layout?: string; palette?: { label?: string }; directed_by?: string };
            image?: { data_url?: string; media_path?: string | null; attached?: boolean };
          }
        | null;
      if (!res.ok || !j?.ok || !j.image?.data_url) {
        throw new Error(j?.error ?? `HTTP ${res.status}`);
      }
      setPoster({
        dataUrl: j.image.data_url,
        layout: j.design?.layout ?? "—",
        palette: j.design?.palette?.label ?? "—",
        mediaPath: j.image.media_path ?? null,
        directedBy: j.design?.directed_by ?? "fallback",
      });
      if (j.image.attached && j.image.media_path) {
        baseRef.current = j.image.media_path;
        setPreview(previewSrc(j.image.media_path));
        onAttached(j.image.media_path);
      }
      setPosterMsg(
        `✓ নতুন পোস্টার · ${j.design?.layout ?? "—"} · ${j.design?.palette?.label ?? "—"}${
          j.warnings?.length ? ` · ${j.warnings[0]}` : ""
        }`,
      );
    } catch (e) {
      setPosterMsg(`✕ ${e instanceof Error ? e.message : "পোস্টার তৈরি ব্যর্থ"}`);
    } finally {
      setPosterBusy(false);
    }
  };

  const downloadPoster = () => {
    if (!poster) return;
    const a = document.createElement("a");
    a.href = poster.dataUrl;
    a.download = `poster-${poster.layout}-${postId.slice(0, 8)}.webp`;
    document.body.appendChild(a);
    a.click();
    a.remove();
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
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">পোস্টার লেআউট</span>
          <select className={field} value={layout} onChange={(e) => setLayout(e.target.value)}>
            <option value="">— ডেস্ক অনুযায়ী —</option>
            {POSTER_LAYOUTS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">পোস্টার থিম</span>
          <select className={field} value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="">— ডেস্ক অনুযায়ী —</option>
            {POSTER_THEMES.map((t) => (
              <option key={t} value={t}>
                {t}
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

      <div className="mt-5 border-t border-ink/15 pt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h5 className="font-sans-bn text-[13px] font-bold text-ink">🎨 ডাইনামিক পোস্টার (১৬:৯)</h5>
          <span className="font-mono-x text-[10px] text-ink-soft">
            ৫ লেআউট × ৫ প্যালেট · বাংলা টেক্সট HTML-এ, ছবিতে নয়
          </span>
        </div>
        <p className="mt-1 text-[11px] text-ink-soft">
          এআই আর্ট ডিরেক্টর গল্প বুঝে লেআউট ও রং বাছেন; টাইপোগ্রাফি ব্রাউজারে রেন্ডার হয় — যুক্তাক্ষর নিখুঁত থাকে।
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            className={btnLime}
            onClick={() => void regenerateStyle()}
            disabled={posterBusy}
            type="button"
          >
            {posterBusy ? "🎨 ডিজাইন হচ্ছে…" : "🎲 রিজেনারেট স্টাইল"}
          </button>
          <button
            className="border-2 border-ink bg-paper px-4 py-2.5 text-[13px] font-bold text-ink transition hover:bg-lime disabled:opacity-40"
            onClick={downloadPoster}
            disabled={!poster}
            type="button"
          >
            ⬇ পোস্টার ডাউনলোড
          </button>
          {poster && (
            <span className="text-[11px] text-ink-soft">
              {poster.layout} · {poster.palette} ·{" "}
              {poster.directedBy === "llm" ? "আর্ট ডিরেক্টর" : "ফলব্যাক প্ল্যানার"}
            </span>
          )}
        </div>

        {posterMsg && (
          <p className={`mt-2 text-[11px] ${posterMsg.startsWith("✕") ? "text-red-700" : "text-ink-soft"}`}>
            {posterMsg}
          </p>
        )}

        {poster && (
          <div className="mt-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={poster.dataUrl}
              alt="ডাইনামিক পোস্টার প্রিভিউ"
              className="w-full max-w-2xl border border-ink/20 object-contain"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function previewSrc(p: string): string {
  return /^https?:\/\//i.test(p) ? p : `/uploads/${p.replace(/\\/g, "/")}`;
}
