import { useEffect, useState } from "react";

const KEY = "hoichoi-theme";

function initialTheme(): "dark" | "light" {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    /* private mode */
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** ডেস্ক উইন্ডো ডার্ক ⇄ লাইট টগল (mockup option-a `theme-toggle`)। */
export default function ThemeToggle() {
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
      title={dark ? "ডার্ক — লাইটে যান" : "লাইট — ডার্কে যান"}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className={`relative flex h-[18px] w-8 items-center rounded-full border transition-colors ${
        dark ? "border-lime/50 bg-lime" : "border-black/25 bg-transparent"
      }`}
    >
      <span
        className="absolute top-[1.5px] flex h-[13px] w-[13px] items-center justify-center rounded-full bg-[#0a0d12] transition-all duration-300"
        style={{ left: dark ? 16 : 3 }}
      >
        {dark ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#c8f65d" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#ffb454" strokeWidth="2.4" strokeLinecap="round">
            <circle cx="12" cy="12" r="4" /><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
          </svg>
        )}
      </span>
    </button>
  );
}