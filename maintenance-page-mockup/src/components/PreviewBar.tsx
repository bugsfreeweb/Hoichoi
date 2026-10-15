"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Zap } from "lucide-react";
import type { SiteSettings, ThemeId } from "@/lib/types";
import { loc, t } from "@/lib/types";
import { THEMES, themeName, themeTagline } from "@/lib/themes";

export function PreviewBar({ id, s }: { id: ThemeId; s: SiteSettings }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const L = loc(s);
  const index = THEMES.findIndex((x) => x.id === id);
  const meta = THEMES[index] ?? THEMES[0];
  const prev = THEMES[(index - 1 + THEMES.length) % THEMES.length];
  const next = THEMES[(index + 1) % THEMES.length];

  async function activate() {
    setBusy(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ patch: { activeTheme: id } }),
      });
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="font-sans-bn fixed inset-x-0 top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-[#1a140d] bg-[#1a140d]/92 px-4 py-2.5 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <Link
          href="/designs"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-[#f3eee1]/75 transition hover:bg-white/10"
        >
          <ArrowLeft size={13} /> {t(s, "gallery")}
        </Link>
        <span className="font-serif-bn grid h-7 w-7 place-items-center rounded-full bg-[#d2202c] text-[13px] font-black text-white">
          {s.brand.mark}
        </span>
        <div className="leading-tight">
          <p className="text-xs font-bold text-[#f3eee1]">{themeName(meta, L)}</p>
          <p className="font-mono-x text-[9px] tracking-[0.2em] text-[#c8f65d]/60 uppercase">{themeTagline(meta, L)}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={`/preview/${prev.id}`}
          className="grid h-8 w-8 place-items-center rounded-full border border-white/15 text-[#f3eee1]/70 transition hover:bg-white/10"
          title={themeName(prev, L)}
        >
          <ChevronLeft size={15} />
        </Link>
        <Link
          href={`/preview/${next.id}`}
          className="grid h-8 w-8 place-items-center rounded-full border border-white/15 text-[#f3eee1]/70 transition hover:bg-white/10"
          title={themeName(next, L)}
        >
          <ChevronRight size={15} />
        </Link>
        <Link
          href="/admin"
          className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-[#f3eee1]/75 transition hover:bg-white/10"
        >
          {t(s, "editSettings")}
        </Link>
        <button
          onClick={activate}
          disabled={busy || s.activeTheme === id}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#d2202c] px-4 py-1.5 text-xs font-bold text-white transition hover:bg-[#a3121d] disabled:opacity-50"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
          {s.activeTheme === id ? t(s, "currentlyLive") : t(s, "useDesign")}
        </button>
      </div>
    </div>
  );
}
