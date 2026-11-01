"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { Maximize2, X } from "lucide-react";
import type { LiveThemeKey } from "@hoichoi/shared-types";
import LiveTemplate from "@/components/live-templates/LiveTemplate";
import { LivePreviewProvider } from "@/components/live/LiveProvider";
import { LIVE_THEMES } from "@/lib/live-themes";

type PreviewTheme = LiveThemeKey | "auto";
type PreviewStyle = CSSProperties & Record<
  | "--color-paper"
  | "--color-paper-deep"
  | "--color-ink"
  | "--color-ink-soft"
  | "--color-alizarin"
  | "--color-alizarin-deep"
  | "--color-lime"
  | "--color-amberx"
  | "--color-fb"
  | "--color-night"
  | "--color-night-grid"
  | "--color-panel"
  | "--color-band"
  | "--color-bandline"
  | "--color-window"
  | "--color-win-border",
  string
>;

export function LiveThemePreview({
  theme,
  title,
  summary,
}: {
  theme: PreviewTheme;
  title: string;
  summary: string;
}) {
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [expanded, setExpanded] = useState(false);
  const [width, setWidth] = useState(760);
  const [expandedWidth, setExpandedWidth] = useState(760);
  const canvasRef = useRef<HTMLDivElement>(null);
  const expandedCanvasRef = useRef<HTMLDivElement>(null);
  const selected = LIVE_THEMES.find((item) => item.key === theme);
  const template = selected?.key ?? "stage";
  const light = mode === "light";
  const scale = expanded
    ? Math.max(0.25, Math.min(1.5, expandedWidth / 760))
    : Math.max(0.25, Math.min(1, width / 760));
  const previewStyle: PreviewStyle = {
    "--color-paper": light ? "#f3eee1" : "#0a0c10",
    "--color-paper-deep": light ? "#e9e2cf" : "#10141b",
    "--color-ink": light ? "#1a140d" : "#e9e2cf",
    "--color-ink-soft": light ? "#6b6250" : "#8e99a7",
    "--color-alizarin": light ? "#d2202c" : "#fa8b9b",
    "--color-alizarin-deep": light ? "#a3121d" : "#d2202c",
    "--color-lime": light ? "#4a7009" : "#c8f65d",
    "--color-amberx": light ? "#9a4208" : "#ffb454",
    "--color-fb": light ? "#1877f2" : "#8eb8ff",
    "--color-night": "#0a0c10",
    "--color-night-grid": light ? "#f6f1e3" : "#0c1017",
    "--color-panel": light ? "#f6f1e3" : "#0f131a",
    "--color-band": light ? "#f3eee1" : "#1a140d",
    "--color-bandline": light ? "#1a140d" : "#f3eee1",
    "--color-window": light ? "#fffdf7" : "#10141b",
    "--color-win-border": light ? "rgba(26, 20, 13, 0.16)" : "rgba(255, 255, 255, 0.1)",
    backgroundColor: "var(--color-paper)",
    color: "var(--color-ink)",
  };
  const previewTitle = title || "আপনার ইভেন্টের শিরোনাম";
  const previewSummary = summary || "ইভেন্টের সংক্ষিপ্ত বিবরণ এখানে দেখা যাবে।";

  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const element = expandedCanvasRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setExpandedWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [expanded]);

  const canvas = (
    <div
      className="w-full overflow-hidden"
      style={{ height: `${520 * scale}px` }}
    >
      <div
        className="origin-top-left"
        style={{ width: 760, transform: `scale(${scale})` }}
      >
        <div
          className="max-h-[520px] overflow-y-auto overflow-x-hidden"
          data-preview-theme={mode}
          data-preview-template={template}
          style={previewStyle}
        >
          <div className="w-[760px]">
            <LivePreviewProvider event={{ title: previewTitle, summary: previewSummary, template: theme }}>
              <LiveTemplate template={template} />
            </LivePreviewProvider>
          </div>
        </div>
      </div>
    </div>
  );

  function themeToggle() {
    return (
      <div className="flex items-center gap-1" aria-label="প্রিভিউর সাইট থিম">
        {(["light", "dark"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => setMode(value)}
            className={`border px-2 py-1 font-mono-x text-[9px] font-bold uppercase ${mode === value ? "border-ink bg-ink text-paper" : "border-ink/20 text-ink-soft hover:border-ink"}`}
          >
            {value === "light" ? "লাইট" : "ডার্ক"}
          </button>
        ))}
      </div>
    );
  }

  return (
    <section ref={canvasRef} className="overflow-hidden border border-ink/15 bg-paper">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 px-3 py-2.5">
        <div>
          <p className="font-mono-x text-[9px] tracking-[0.16em] text-ink-soft uppercase">লাইভ প্রিভিউ</p>
          <p className="mt-0.5 text-[11px] font-semibold text-ink">
            {selected ? `${selected.bn} · ${selected.en}` : "সাইটের ডিফল্ট থিম"}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {themeToggle()}
          <button type="button" onClick={() => setExpanded(true)} aria-label="প্রিভিউ বড় করে দেখুন" className="border border-ink/20 p-1.5 text-ink-soft transition-colors hover:border-ink hover:text-ink">
            <Maximize2 size={12} />
          </button>
        </div>
      </div>

      {canvas}
      <p className="border-t border-ink/10 px-3 py-2 text-[10px] leading-relaxed text-ink-soft">
        {selected?.features ?? "ইভেন্টে আলাদা থিম না থাকলে সাইটের সংরক্ষিত ডিফল্ট ব্যবহার হবে।"}
      </p>
      {expanded && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-night/85 p-3 backdrop-blur-sm md:p-8" role="dialog" aria-modal="true" aria-label="লাইভ ইভেন্ট থিম প্রিভিউ">
          <section className="w-full max-w-[1200px] overflow-hidden border border-ink/20 bg-paper shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 px-4 py-3">
              <div>
                <p className="font-mono-x text-[9px] tracking-[0.16em] text-ink-soft uppercase">পূর্ণ আকারে প্রিভিউ</p>
                <p className="mt-1 text-[12px] font-bold text-ink">{selected ? `${selected.bn} · ${selected.en}` : "সাইটের ডিফল্ট থিম"}</p>
              </div>
              <div className="flex items-center gap-2">
                {themeToggle()}
                <button type="button" onClick={() => setExpanded(false)} aria-label="প্রিভিউ বন্ধ করুন" className="border border-ink/20 p-1.5 text-ink-soft hover:border-ink hover:text-ink">
                  <X size={14} />
                </button>
              </div>
            </div>
            <div className="max-h-[calc(100vh-130px)] overflow-y-auto overflow-x-hidden p-2 md:p-4">
              <div ref={expandedCanvasRef} className="mx-auto w-full max-w-[1140px]">
                {canvas}
              </div>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
