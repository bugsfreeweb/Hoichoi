"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check, Loader2 } from "lucide-react";
import type { SiteSettings, ThemeId } from "@/lib/types";
import { loc, t } from "@/lib/types";
import { themeDesc, themeName, themeTagline, type ThemeMeta } from "@/lib/themes";
import { FitPreview } from "@/components/themes/registry";

export function DesignCard({
  meta,
  s,
  active,
}: {
  meta: ThemeMeta;
  s: SiteSettings;
  active: boolean;
}) {
  const [hover, setHover] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const L = loc(s);

  async function activate() {
    setBusy(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ patch: { activeTheme: meta.id as ThemeId } }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <article
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`font-sans-bn group relative overflow-hidden rounded-2xl border-2 bg-white transition duration-300 ${
        active ? "border-[#1a140d] shadow-[6px_6px_0_#1a140d]" : "border-[#1a140d]/15 hover:border-[#1a140d]/50"
      }`}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#0a0c10]">
        <FitPreview id={meta.id} s={s} paused={!hover} className="h-full w-full" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-70" />
        {active && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-[#c8f65d] px-2.5 py-1 text-[10px] font-bold tracking-[0.16em] text-[#1a140d] uppercase">
            <Check size={11} /> {t(s, "liveNow")}
          </span>
        )}
        <span className="font-mono-x absolute right-3 bottom-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] text-white/70 opacity-0 backdrop-blur transition group-hover:opacity-100">
          {hover ? "▶ running" : "❚❚ paused"}
        </span>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-serif-bn text-lg font-extrabold text-[#1a140d]">{themeName(meta, L)}</h3>
            <p className="font-mono-x mt-0.5 text-[10px] tracking-[0.2em] text-[#d2202c] uppercase">{themeTagline(meta, L)}</p>
          </div>
          <span className="flex items-center gap-1 pt-1">
            {meta.swatch.map((c) => (
              <span key={c} className="h-4 w-4 rounded-full border border-[#1a140d]/20" style={{ background: c }} />
            ))}
          </span>
        </div>
        <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-[#1a140d]/65">{themeDesc(meta, L)}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {meta.tags.map((tag) => (
            <span
              key={tag}
              className="font-mono-x rounded-full border border-[#1a140d]/15 bg-[#f3eee1] px-2.5 py-1 text-[10px] tracking-wide text-[#6b6250] uppercase"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 border-t-2 border-[#1a140d]/10 px-5 py-3.5">
        <Link
          href={`/preview/${meta.id}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a140d] px-4 py-2 text-xs font-bold text-[#f3eee1] transition hover:bg-[#d2202c]"
        >
          {t(s, "fullScreen")} <ArrowUpRight size={13} />
        </Link>
        <button
          onClick={activate}
          disabled={busy || active}
          className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#1a140d] px-4 py-[7px] text-xs font-bold text-[#1a140d] transition hover:bg-[#1a140d] hover:text-[#f3eee1] disabled:opacity-45"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : null}
          {active ? t(s, "activeDesign") : t(s, "makeActive")}
        </button>
        <span className="font-mono-x ml-auto hidden text-[10px] text-[#6b6250] sm:block">best: {meta.bestFor}</span>
      </div>
    </article>
  );
}
