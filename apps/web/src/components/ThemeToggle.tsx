"use client";

import { useEffect, useState } from "react";

const KEY = "hoichoi-theme";

function initialTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "light";
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    /* private mode */
  }
  const cur = document.documentElement.getAttribute("data-theme");
  if (cur === "dark" || cur === "light") return cur;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** ডার্ক ⇄ লাইট থিম সুইচ (mockup option-a `theme-toggle` প্যাটার্ন)। */
export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">(initialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* private mode */
    }
  }, [theme]);

  const dark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="থিম পরিবর্তন"
      title={dark ? "ডার্ক মোড — লাইটে যান" : "লাইট মোড — ডার্কে যান"}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="relative flex h-5 w-9 items-center rounded-full border border-white/20 bg-white/10 px-[3px] transition-colors hover:border-white/40"
    >
      <span
        className={`absolute inline-flex items-center justify-center rounded-full bg-night transition-all duration-300 ${
          dark ? "left-[17px]" : "left-[3px]"
        }`}
        style={{ width: 17, height: 17 }}
      >
        {dark ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#c8f65d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ffb454" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="12" cy="12" r="4" /><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
          </svg>
        )}
      </span>
    </button>
  );
}