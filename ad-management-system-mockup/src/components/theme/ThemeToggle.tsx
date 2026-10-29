"use client";

import { useEffect, useRef, useState } from "react";

export type ThemeMode = "light" | "dark" | "obsidian";

const OPTIONS: { id: ThemeMode; label: string; short: string; icon: string; detail: string }[] = [
  { id: "light", label: "লাইট", short: "Light", icon: "☼", detail: "উষ্ণ নিউজপ্রিন্ট" },
  { id: "dark", label: "ডার্ক", short: "Dark", icon: "◐", detail: "সফট চারকোল" },
  { id: "obsidian", label: "অবসিডিয়ান", short: "Obsidian", icon: "◈", detail: "ডিপ OLED ব্ল্যাক" },
];

function readTheme(): ThemeMode {
  if (typeof document === "undefined") return "light";
  const value = document.documentElement.dataset.theme;
  return value === "dark" || value === "obsidian" ? value : "light";
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme === "light" ? "light" : "dark";
  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (themeColor) themeColor.content = theme === "light" ? "#f5f3ee" : theme === "dark" ? "#111720" : "#090b0f";
  try {
    window.localStorage.setItem("hoichoi-theme", theme);
  } catch {
    // Private browsing can disable storage; theme still applies for this session.
  }
  window.dispatchEvent(new CustomEvent("hoichoi-theme-change", { detail: theme }));
}

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const current = OPTIONS.find((x) => x.id === theme) ?? OPTIONS[0];

  useEffect(() => {
    setTheme(readTheme());
    const onTheme = (event: Event) => {
      const next = (event as CustomEvent<ThemeMode>).detail;
      if (next === "light" || next === "dark" || next === "obsidian") setTheme(next);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === "hoichoi-theme") setTheme(readTheme());
    };
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("hoichoi-theme-change", onTheme);
    window.addEventListener("storage", onStorage);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("hoichoi-theme-change", onTheme);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function choose(next: ThemeMode) {
    applyTheme(next);
    setTheme(next);
    setOpen(false);
  }

  return (
    <div ref={root} className={`theme-control ${compact ? "theme-control-compact" : ""}`}>
      <button
        type="button"
        className="theme-trigger"
        aria-label={`থিম: ${current.label}. থিম নির্বাচন খুলুন`}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`বর্তমান থিম: ${current.label}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`theme-trigger-orb theme-orb-${theme}`} aria-hidden="true">{current.icon}</span>
        {!compact ? <span className="theme-trigger-label">{current.short}</span> : <span className="sr-only">{current.short}</span>}
        <svg className="theme-chevron" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div className="theme-menu" role="menu" aria-label="থিম নির্বাচন">
          <p className="theme-menu-kicker">APPEARANCE</p>
          {OPTIONS.map((option) => (
            <button
              type="button"
              key={option.id}
              role="menuitemradio"
              aria-checked={theme === option.id}
              className={`theme-option ${theme === option.id ? "theme-option-active" : ""}`}
              onClick={() => choose(option.id)}
            >
              <span className={`theme-option-swatch theme-orb-${option.id}`} aria-hidden="true">{option.icon}</span>
              <span className="theme-option-copy">
                <span className="theme-option-name">{option.label} <small>{option.short}</small></span>
                <span className="theme-option-detail">{option.detail}</span>
              </span>
              {theme === option.id ? (
                <svg className="theme-option-check" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m5 12 4 4L19 6" />
                </svg>
              ) : null}
            </button>
          ))}
          <p className="theme-menu-foot">আপনার পছন্দ এই ডিভাইসে সংরক্ষিত থাকবে</p>
        </div>
      ) : null}
    </div>
  );
}
