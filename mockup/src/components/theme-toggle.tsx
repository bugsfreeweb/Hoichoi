"use client";

import { useEffect, useState } from "react";

const THEME_KEY = "hoichoi-theme";
const DARK = "dark";
const LIGHT = "light";

function getPreferredTheme(): "dark" | "light" {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    /* private mode */
  }
  if (typeof window !== "undefined" && window.matchMedia)
    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? LIGHT
      : DARK;
  return DARK;
}

/** Reads/writes the `data-theme` attribute on <html> (used by the desk app and site). */
function applyTheme(theme: "dark" | "light") {
  try {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* noop */
  }
}

/**
 * Dark ⇄ Light theme toggle for the React site and the desk app.
 * Persists to localStorage; falls back to OS prefers-color-scheme.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">(getPreferredTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === DARK ? LIGHT : DARK));

  const isLight = theme === LIGHT;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="থিম পরিবর্তন"
      title={isLight ? "লাইট থিম · ক্লিকে ডার্ক" : "ডার্ক থিম · ক্লিকে লাইট"}
      aria-checked={!isLight}
      role="switch"
      className="relative group flex h-7 w-12 items-center rounded-full border border-ink/20 bg-ink/8 transition-colors focus:outline-none focus:ring-2 focus:ring-lime"
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full shadow transition-transform duration-300 ${
          isLight
            ? "left-5 bg-paper group-hover:bg-paper/90"
            : "left-0.5 bg-ink group-hover:bg-ink/90"
        }`}
      />
      <svg
        className={`absolute left-1 top-1.5 h-3.5 w-3.5 transition-opacity ${
          isLight ? "opacity-100" : "opacity-40"
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <circle cx="12" cy="12" r="4.5" strokeWidth="1.5" />
        <path d="M12 1v2M12 21v2M4.93 4.93l1.41 1.41M16.67 16.67l1.41 1.41M1 12h2M21 12h2M4.93 19.07l1.41-1.41M16.67 7.34l1.41-1.41" strokeWidth="1.5" />
      </svg>
      <svg
        className={`absolute right-1 top-1.5 h-3.5 w-3.5 transition-opacity ${
          isLight ? "opacity-40" : "opacity-100"
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path d="M21 12.79A9 9 0 0 1 11.21 3 7 7 0 1 0 21 12.79z" strokeWidth="1.5" />
      </svg>
    </button>
  );
}