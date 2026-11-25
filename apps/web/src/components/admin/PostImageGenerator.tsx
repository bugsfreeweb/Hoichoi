"use client";

import { useEffect, useRef, useState } from "react";
// The frame vocabulary, not the renderer: this is a client component and
// `@hoichoi/poster` carries sharp and playwright.
import { POSTER_LAYOUTS, POSTER_THEMES, type PosterAspect } from "@hoichoi/shared-types";

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

interface PosterFrame {
  aspect?: PosterAspect;
  data_url?: string;
  media_path?: string | null;
  width?: number | null;
  height?: number | null;
  attached?: boolean;
  provider?: string | null;
  model?: string | null;
}

interface PosterResponse {
  ok?: boolean;
  error?: string;
  warnings?: string[];
  design?: {
    layout?: string;
    aspect?: PosterAspect;
    palette?: { label?: string };
    directed_by?: string;
    /** Exactly the prompt the image provider received, after composition. */
    image_prompt?: string;
  };
  image?: PosterFrame;
  posters?: Array<{ design?: PosterResponse["design"]; image?: PosterFrame }>;
}

interface PosterPreview {
  dataUrl: string;
  aspect: PosterAspect;
  layout: string;
  palette: string;
  mediaPath: string | null;
  directedBy: string;
  width: number | null;
  height: number | null;
  provider: string | null;
  model: string | null;
  prompt: string | null;
}

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
  socialAspect = "4:5",
  portraitPath = null,
  webImagePath = null,
  shareTitle = "",
  shareDescription = "",
  shareDomain = "hoichoifeed.vercel.app",
  shareUrl = null,
  initialSocialTitle = "",
  initialSocialDescription = "",
}: {
  postId: string;
  onAttached: (mediaPath: string) => void;
  /** The saved share-frame preference, so the switch starts truthful. */
  socialAspect?: "4:5" | "16:9";
  /** Newest stored 4:5 poster, if the page server found one. */
  portraitPath?: string | null;
  /** The post's own image, used when no portrait is chosen or available. */
  webImagePath?: string | null;
  /** Live editor state, so the preview follows what will actually publish. */
  shareTitle?: string;
  shareDescription?: string;
  shareDomain?: string;
  /** Canonical public URL, used to open Facebook's scraper debugger. */
  shareUrl?: string | null;
  /** Saved link-card copy overrides; empty means "use the article". */
  initialSocialTitle?: string;
  initialSocialDescription?: string;
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
  const [posters, setPosters] = useState<PosterPreview[]>([]);
  const [activeAspect, setActiveAspect] = useState<PosterAspect>("16:9");
  const [bothFrames, setBothFrames] = useState(true);
  const [posterMsg, setPosterMsg] = useState<string | null>(null);
  /**
   * The link-preview frame is a per-post preference, saved immediately rather
   * than with the article form: a social card is a publishing decision, and an
   * editor who changes it expects the next share to use it.
   */
  const [shareAspect, setShareAspect] = useState<"4:5" | "16:9">(socialAspect);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  /**
   * Link-card copy is separate from the article headline because the two are
   * read at different widths. Empty means "fall back to the article", which is
   * also how a cleared override is stored — there is no separate clear button.
   */
  const [socialTitle, setSocialTitle] = useState(initialSocialTitle);
  const [socialDescription, setSocialDescription] = useState(initialSocialDescription);
  const [savedSocial, setSavedSocial] = useState({
    title: initialSocialTitle.trim(),
    description: initialSocialDescription.trim(),
  });
  const [socialBusy, setSocialBusy] = useState(false);
  const [socialMsg, setSocialMsg] = useState<string | null>(null);
  /**
   * The two platforms do not render the same card. Facebook can show the 4:5
   * portrait; X only ever takes the landscape `twitter:image`, and it truncates
   * at different widths. One card pretending to be both would be a lie.
   */
  const [previewPlatform, setPreviewPlatform] = useState<"facebook" | "x">("facebook");
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

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
        body: JSON.stringify({
          postId,
          regenerate: true,
          attach: true,
          format: "webp",
          aspects: bothFrames ? ["16:9", "4:5"] : ["16:9"],
        }),
      });
      const j = (await res.json().catch(() => null)) as PosterResponse | null;
      if (!res.ok || !j?.ok) {
        throw new Error(j?.error ?? `HTTP ${res.status}`);
      }
      const frames: PosterPreview[] = (j.posters?.length ? j.posters : [j])
        .filter((p) => Boolean(p.image?.data_url))
        .map((p) => ({
          dataUrl: p.image!.data_url!,
          aspect: p.image!.aspect ?? p.design?.aspect ?? "16:9",
          layout: p.design?.layout ?? "—",
          palette: p.design?.palette?.label ?? "—",
          mediaPath: p.image!.media_path ?? null,
          directedBy: p.design?.directed_by ?? "fallback",
          width: p.image!.width ?? null,
          height: p.image!.height ?? null,
          provider: p.image!.provider ?? null,
          model: p.image!.model ?? null,
          prompt: p.design?.image_prompt ?? null,
        }));
      if (!frames.length) throw new Error("পোস্টার তৈরি হয়নি");
      setPosters(frames);
      setActiveAspect(frames[0]!.aspect);

      const primary = frames[0]!;
      if (j.image?.attached && j.image.media_path) {
        baseRef.current = j.image.media_path;
        setPreview(previewSrc(j.image.media_path));
        onAttached(j.image.media_path);
      }
      setPosterMsg(
        `✓ নতুন পোস্টার · ${primary.layout} · ${primary.palette}${
          frames.length > 1 ? " · ১৬:৯ + ৪:৫" : ""
        }${j.warnings?.length ? ` · ${j.warnings[0]}` : ""}`,
      );
    } catch (e) {
      setPosterMsg(`✕ ${e instanceof Error ? e.message : "পোস্টার তৈরি ব্যর্থ"}`);
    } finally {
      setPosterBusy(false);
    }
  };

  const saveShareAspect = async (next: "4:5" | "16:9") => {
    if (shareBusy || next === shareAspect) return;
    const previous = shareAspect;
    setShareAspect(next);
    setShareBusy(true);
    setShareMsg(null);
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ social_share_aspect: next }),
      });
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(j?.error ?? `HTTP ${res.status}`);
      setShareMsg(
        next === "4:5"
          ? "✓ শেয়ার কার্ড ৪:৫ — ফেসবুক/ইনস্টাগ্রামে পোর্ট্রেট পোস্টার যাবে"
          : "✓ শেয়ার কার্ড ১৬:৯ — পোস্টের মূল ছবি যাবে",
      );
    } catch (e) {
      setShareAspect(previous);
      setShareMsg(`✕ ${e instanceof Error ? e.message : "শেয়ার সেটিং সংরক্ষণ ব্যর্থ"}`);
    } finally {
      setShareBusy(false);
    }
  };

  const saveSocialCopy = async () => {
    const title = socialTitle.trim();
    const description = socialDescription.trim();
    if (socialBusy || (title === savedSocial.title && description === savedSocial.description)) {
      return;
    }
    setSocialBusy(true);
    setSocialMsg(null);
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          social_title: title || null,
          social_description: description || null,
        }),
      });
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(j?.error ?? `HTTP ${res.status}`);
      setSavedSocial({ title, description });
      setSocialMsg(
        title || description
          ? "✓ শেয়ার লেখা সংরক্ষিত"
          : "✓ ওভাররাইড মুছে গেছে — নিবন্ধের শিরোনাম/সারসংক্ষেপ ব্যবহার হবে",
      );
    } catch (e) {
      setSocialMsg(`✕ ${e instanceof Error ? e.message : "শেয়ার লেখা সংরক্ষণ ব্যর্থ"}`);
    } finally {
      setSocialBusy(false);
    }
  };

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyMsg("✓ লিংক কপি হয়েছে");
    } catch {
      // Clipboard access is blocked on insecure origins and in some embedded
      // browsers; the old selection trick still works there.
      const area = document.createElement("textarea");
      area.value = shareUrl;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(area);
      setCopyMsg(ok ? "✓ লিংক কপি হয়েছে" : "✕ কপি ব্যর্থ — ম্যানুয়ালি কপি করুন");
    }
    window.setTimeout(() => setCopyMsg(null), 2500);
  };

  const downloadPoster = () => {
    const chosen = posters.find((p) => p.aspect === activeAspect) ?? posters[0];
    if (!chosen) return;
    const a = document.createElement("a");
    a.href = chosen.dataUrl;
    const suffix = chosen.aspect === "4:5" ? "4x5" : "16x9";
    a.download = `poster-${chosen.layout}-${suffix}-${postId.slice(0, 8)}.webp`;
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

  // The card mirrors the metadata rule: prefer a portrait when the switch says
  // 4:5, fall back to the post's own image when there is no portrait. A fresh
  // render wins over the server prop, so the preview updates in this session.
  const generatedPortrait = posters.find((p) => p.aspect === "4:5")?.dataUrl ?? null;
  const portraitSrc = generatedPortrait ?? (portraitPath ? previewSrc(portraitPath) : null);
  const webSrc = webImagePath ? previewSrc(webImagePath) : null;
  const sharePortrait = shareAspect === "4:5" && Boolean(portraitSrc);
  const shareSrc = sharePortrait ? portraitSrc : webSrc;
  const previewIsX = previewPlatform === "x";
  // X's `summary_large_image` is always landscape and reads its own image tag,
  // so switching the Facebook frame must not change what this tab promises.
  const cardSrc = previewIsX ? webSrc : shareSrc;
  const cardPortrait = !previewIsX && sharePortrait;
  const shareNote = previewIsX
    ? webSrc
      ? "সোর্স: পোস্টের মূল ১৬:৯ ছবি — X ল্যান্ডস্কেপ কার্ড দেখায়।"
      : "পোস্টে ছবি নেই — X কার্ডে ছবি ছাড়া শিরোনাম দেখাবে।"
    : !shareSrc
      ? "কোনো ছবি নেই — লিংক কার্ডে ছবি ছাড়াই শিরোনাম দেখাবে।"
      : sharePortrait
        ? "সোর্স: ৪:৫ পোস্টার"
        : shareAspect === "4:5"
          ? "৪:৫ পোস্টার নেই — পোস্টের মূল ছবি দেখানো হচ্ছে।"
          : "সোর্স: পোস্টের মূল ছবি";
  // Platforms cut by rendered width, not by a hard rule, so these are warnings
  // rather than refusals. Count code points, not UTF-16 units, because a Bengali
  // cluster is often two units and would overstate length.
  const cardTitle = socialTitle.trim() || shareTitle;
  const cardDescription = socialDescription.trim() || shareDescription;
  const titleMax = CARD_LIMITS[previewPlatform].title;
  const descMax = CARD_LIMITS[previewPlatform].desc;
  const titleLength = Array.from(cardTitle.trim()).length;
  const descLength = Array.from(cardDescription.trim()).length;
  const titleWarn = titleLength > titleMax;
  const descWarn = descLength > descMax;

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
          <h5 className="font-sans-bn text-[13px] font-bold text-ink">🎨 ডাইনামিক পোস্টার (১৬:৯ + ৪:৫)</h5>
          <span className="font-mono-x text-[10px] text-ink-soft">
            ৫ লেআউট × ৫ প্যালেট · একই গল্প, দুটি ফ্রেম
          </span>
        </div>
        <p className="mt-1 text-[11px] text-ink-soft">
          এআই আর্ট ডিরেক্টর গল্প বুঝে লেআউট ও রং বাছেন; টাইপোগ্রাফি ব্রাউজারে রেন্ডার হয় — যুক্তাক্ষর নিখুঁত থাকে।
        </p>

        <label className="mt-3 flex w-fit items-center gap-2 text-[11px] font-bold text-ink-soft">
          <input
            type="checkbox"
            checked={bothFrames}
            onChange={(e) => setBothFrames(e.target.checked)}
          />
          ৪:৫ পোর্ট্রেটও তৈরি করুন (ফেসবুক / ইনস্টাগ্রাম)
        </label>

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
            disabled={posters.length === 0}
            type="button"
          >
            ⬇ পোস্টার ডাউনলোড {activeAspect === "4:5" ? "(৪:৫)" : "(১৬:৯)"}
          </button>
          {posters[0] && (
            <span className="text-[11px] text-ink-soft">
              {posters[0].layout} · {posters[0].palette} ·{" "}
              {posters[0].directedBy === "llm" ? "আর্ট ডিরেক্টর" : "ফলব্যাক প্ল্যানার"}
              {posters[0].provider ? ` · ${posters[0].provider}` : ""}
              {posters[0].model ? ` · ${posters[0].model}` : ""}
            </span>
          )}
        </div>

        {posterMsg && (
          <p className={`mt-2 text-[11px] ${posterMsg.startsWith("✕") ? "text-red-700" : "text-ink-soft"}`}>
            {posterMsg}
          </p>
        )}

        <div className="mt-3 border border-ink/15 bg-paper px-3 py-2.5">
          <label className="flex w-fit items-center gap-2 text-[12px] font-bold text-ink">
            <input
              type="checkbox"
              checked={shareAspect === "4:5"}
              disabled={shareBusy}
              onChange={(e) => void saveShareAspect(e.target.checked ? "4:5" : "16:9")}
            />
            ফেসবুক / ইনস্টাগ্রামে ৪:৫ শেয়ার কার্ড
          </label>
          <p className="mt-1 text-[10.5px] text-ink-soft">
            {shareAspect === "4:5"
              ? "লিংক প্রিভিউতে ৪:৫ পোস্টার যাবে; না থাকলে পোস্টের ১৬:৯ ছবি ব্যবহার হবে।"
              : "লিংক প্রিভিউতে পোস্টের মূল ১৬:৯ ছবি যাবে; ৪:৫ পোস্টার সংরক্ষিত থাকবে।"}
          </p>
          {shareMsg && (
            <p className={`mt-1 text-[10.5px] ${shareMsg.startsWith("✕") ? "text-red-700" : "text-ink-soft"}`}>
              {shareMsg}
            </p>
          )}

          <div className="mt-3 grid gap-2 border-t border-ink/10 pt-3">
            <label className="block text-[11px] font-bold text-ink">
              শেয়ার শিরোনাম (ঐচ্ছিক)
              <input
                value={socialTitle}
                maxLength={160}
                disabled={socialBusy}
                onChange={(e) => setSocialTitle(e.target.value)}
                onBlur={() => void saveSocialCopy()}
                placeholder={shareTitle}
                className="mt-1 w-full border border-ink/20 bg-white px-2 py-1.5 text-[12px] font-normal text-ink outline-none focus:border-ink"
              />
            </label>
            <label className="block text-[11px] font-bold text-ink">
              শেয়ার বিবরণ (ঐচ্ছিক)
              <textarea
                value={socialDescription}
                maxLength={400}
                rows={2}
                disabled={socialBusy}
                onChange={(e) => setSocialDescription(e.target.value)}
                onBlur={() => void saveSocialCopy()}
                placeholder={shareDescription}
                className="mt-1 w-full resize-y border border-ink/20 bg-white px-2 py-1.5 text-[12px] font-normal leading-relaxed text-ink outline-none focus:border-ink"
              />
            </label>
            {socialMsg && (
              <p
                className={`text-[10.5px] ${socialMsg.startsWith("✕") ? "text-red-700" : "text-ink-soft"}`}
              >
                {socialMsg}
              </p>
            )}
          </div>

          <div className="mt-3 border-t border-ink/10 pt-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono-x text-[9.5px] uppercase tracking-wide text-ink-soft">
                লিংক প্রিভিউ
              </p>
              <div role="tablist" aria-label="কোন প্ল্যাটফর্মের প্রিভিউ" className="flex gap-1">
                {(
                  [
                    ["facebook", "ফেসবুক"],
                    ["x", "X"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={previewPlatform === id}
                    onClick={() => setPreviewPlatform(id)}
                    className={`border px-2 py-0.5 text-[10px] font-bold ${
                      previewPlatform === id
                        ? "border-ink bg-ink text-paper"
                        : "border-ink/20 text-ink-soft hover:text-ink"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-2 max-w-[360px] overflow-hidden border border-ink/20 bg-white shadow-sm">
              {cardSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cardSrc}
                  alt="শেয়ার কার্ডের ছবি"
                  className="w-full bg-ink/5 object-cover"
                  style={{ aspectRatio: cardPortrait ? "4 / 5" : "1.91 / 1" }}
                />
              ) : (
                <div
                  className="flex items-center justify-center bg-ink/5 text-[11px] text-ink-soft"
                  style={{ aspectRatio: "1.91 / 1" }}
                >
                  ছবি নেই
                </div>
              )}
              <div className="px-3 py-2.5">
                {!previewIsX && (
                  <p className="font-mono-x text-[9px] uppercase tracking-wide text-ink-soft">
                    {shareDomain}
                  </p>
                )}
                <p className="mt-0.5 line-clamp-2 font-serif-bn text-[14px] font-extrabold leading-snug text-ink">
                  {cardTitle || "শিরোনাম"}
                </p>
                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-ink-soft">
                  {cardDescription || "সারসংক্ষেপ"}
                </p>
                {previewIsX && (
                  <p className="mt-1 font-mono-x text-[9px] uppercase tracking-wide text-ink-soft">
                    {shareDomain}
                  </p>
                )}
              </div>
            </div>
            <p className="mt-1.5 text-[10px] text-ink-soft">{shareNote}</p>
            {shareUrl && (
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <button
                  type="button"
                  onClick={() => void copyShareUrl()}
                  className="text-[10.5px] font-bold text-ink underline decoration-ink/40 underline-offset-2 hover:text-alizarin"
                >
                  কপি লিংক
                </button>
                {!previewIsX && (
                  <a
                    href={`https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(shareUrl)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10.5px] font-bold text-ink underline decoration-ink/40 underline-offset-2 hover:text-alizarin"
                  >
                    Facebook ডিবাগারে প্রিভিউ যাচাই করুন ↗
                  </a>
                )}
                {copyMsg && (
                  <span
                    role="status"
                    className={`text-[10px] ${copyMsg.startsWith("✕") ? "text-red-700" : "text-ink-soft"}`}
                  >
                    {copyMsg}
                  </span>
                )}
              </div>
            )}
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 font-mono-x text-[10px]">
              <span className={titleWarn ? "font-bold text-red-700" : "text-ink-soft"}>
                শিরোনাম {bnCount(titleLength)}/{bnCount(titleMax)}
              </span>
              <span className={descWarn ? "font-bold text-red-700" : "text-ink-soft"}>
                বিবরণ {bnCount(descLength)}/{bnCount(descMax)}
              </span>
            </div>
            {titleWarn && (
              <p className="mt-1 text-[10px] text-red-700">
                শিরোনাম {bnCount(titleMax)} অক্ষরের বেশি —{" "}
                {previewIsX ? "X-এ" : "ফেসবুকে"} কেটে যেতে পারে।
              </p>
            )}
            {descWarn && (
              <p className="mt-1 text-[10px] text-red-700">
                বিবরণ {bnCount(descMax)} অক্ষরের বেশি —{" "}
                {previewIsX ? "X-এ" : "ফেসবুকে"} কেটে যেতে পারে।
              </p>
            )}
          </div>
        </div>

        {posters.length > 0 && (
          <div className="mt-3 flex flex-wrap items-start gap-3">
            {/* The editor saw a headline and a style; the model saw this text. It
                used to be invisible, so "the same prompt" could mean two different
                instructions. Show the exact string that was sent. */}
            {posters.map((p) => {
              const active = p.aspect === activeAspect;
              return (
                <button
                  key={p.aspect}
                  type="button"
                  onClick={() => setActiveAspect(p.aspect)}
                  className={`border-2 p-1 text-left transition ${
                    active ? "border-ink bg-lime/20" : "border-ink/20 hover:border-ink/50"
                  }`}
                  aria-pressed={active}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.dataUrl}
                    alt={`${p.aspect} পোস্টার প্রিভিউ`}
                    className="h-64 w-auto border border-ink/15 object-contain"
                  />
                  <span className="mt-1 block font-mono-x text-[10px] text-ink-soft">
                    {p.aspect}
                    {p.width && p.height ? ` · ${p.width}×${p.height}` : ""}
                    {active ? " · নির্বাচিত" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {(() => {
          const chosen = posters.find((p) => p.aspect === activeAspect) ?? posters[0];
          if (!chosen?.prompt) return null;
          return (
            <details className="mt-3 border border-ink/15 bg-paper px-3 py-2 text-[11px] text-ink-soft">
              <summary className="cursor-pointer font-bold text-ink">
                AI-কে পাঠানো ঠিক যে প্রম্পট · {chosen.provider ?? "unknown"}
                {chosen.model ? ` · ${chosen.model}` : ""}
              </summary>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-mono-x text-[10.5px] leading-relaxed">
                {chosen.prompt}
              </pre>
            </details>
          );
        })()}
      </div>
    </div>
  );
}

/** Where each platform starts cutting a large-image card, in code points. */
const CARD_LIMITS = {
  facebook: { title: 60, desc: 110 },
  x: { title: 70, desc: 200 },
} as const;

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"] as const;

function bnCount(n: number): string {
  return String(Math.max(0, Math.trunc(n)))
    .split("")
    .map((d) => BN_DIGITS[Number(d)] ?? d)
    .join("");
}

function previewSrc(p: string): string {
  if (/^https?:\/\//i.test(p) || p.startsWith("/")) return p;
  return `/uploads/${p.replace(/\\/g, "/")}`;
}
