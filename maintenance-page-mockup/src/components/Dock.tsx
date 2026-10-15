"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LayoutGrid, Newspaper, ShieldCheck } from "lucide-react";
import type { SiteSettings, ThemeId } from "@/lib/types";
import { loc, t } from "@/lib/types";
import { THEMES, themeName } from "@/lib/themes";
import { AmbientSound } from "@/components/blocks";

/** Discreet floating dock: switch design on the fly, jump to the gallery/admin. */
export function Dock({ s, previewTheme }: { s: SiteSettings; previewTheme?: ThemeId }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const active = previewTheme ?? s.activeTheme;
  const L = loc(s);

  function pick(id: ThemeId) {
    if (pathname.startsWith("/preview")) router.push(`/preview/${id}`);
    else {
      fetch("/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ patch: { activeTheme: id } }),
      })
        .then(() => router.refresh())
        .catch(() => {});
    }
  }

  return (
    <div className="font-sans-bn fixed bottom-5 left-1/2 z-50 -translate-x-1/2">
      {open && (
        <div className="mb-3 w-[min(92vw,560px)] rounded-2xl border border-[#1a140d] bg-[#1a140d]/94 p-3 shadow-2xl backdrop-blur-xl">
          <p className="font-mono-x mb-2.5 px-1 text-[10px] tracking-[0.28em] text-[#c8f65d]/70 uppercase">
            {t(s, "pickLook")}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {THEMES.map((tm) => (
              <button
                key={tm.id}
                onClick={() => pick(tm.id)}
                className={`group overflow-hidden rounded-xl border text-left transition ${
                  tm.id === active ? "border-[#c8f65d]" : "border-white/10 hover:border-white/30"
                }`}
              >
                <span
                  className="block h-10 w-full"
                  style={{ background: `linear-gradient(135deg, ${tm.swatch[0]}, ${tm.swatch[1]} 55%, ${tm.swatch[2]})` }}
                />
                <span className="block px-2 py-1.5 text-[10px] font-bold text-[#f3eee1]">{themeName(tm, L)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-1 rounded-full border border-[#1a140d] bg-[#1a140d]/92 p-1.5 shadow-2xl backdrop-blur-xl">
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-[#f3eee1]/80 transition hover:bg-white/10"
          title={t(s, "design")}
        >
          <Newspaper size={15} className={open ? "text-[#c8f65d]" : ""} />
          <span className="max-sm:hidden">{themeName(THEMES.find((x) => x.id === active) ?? THEMES[0], L)}</span>
        </button>
        <Link
          href="/designs"
          className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-[#f3eee1]/80 transition hover:bg-white/10"
          title={t(s, "gallery")}
        >
          <LayoutGrid size={15} />
          <span className="max-sm:hidden">{t(s, "gallery")}</span>
        </Link>
        {s.effects.sound && (
          <span className="px-1" title="Ambient sound">
            <AmbientSound />
          </span>
        )}
        <span className="mx-1 h-5 w-px bg-white/15" />
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 rounded-full bg-[#d2202c] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#a3121d]"
          title={t(s, "admin")}
        >
          <ShieldCheck size={15} />
          <span className="max-sm:hidden">{t(s, "admin")}</span>
        </Link>
      </div>
    </div>
  );
}
