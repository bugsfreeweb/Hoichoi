/**
 * Tailwind for the desk window.
 *
 * Plain JavaScript on purpose. This file is a `.js` under `"type": "module"`, so
 * `import type { Config } from "tailwindcss"` and `satisfies Config` were
 * TypeScript syntax sitting in a JavaScript file: Node never cared (Vite strips
 * it), but CodeQL's JavaScript extractor cannot parse it and failed the whole
 * scan with a syntax error on this path. The JSDoc annotation gives an editor the
 * same completions without asking a `.js` file to be a `.ts` file.
 *
 * @type {import("tailwindcss").Config}
 */
import dashPreset from "../../packages/dash/tailwind-preset.js";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}", "../../packages/dash/src/**/*.{ts,tsx}"],
  presets: [dashPreset],
  theme: {
    extend: {
      colors: {
        // dark "desk console" palette — tokens flip via CSS vars (see index.css)
        night: "var(--color-night)",
        "night-grid": "var(--color-night-grid)",
        panel: "var(--color-panel)",
        // legacy light tokens kept for compatibility (overridden in index.css)
        paper: "#f3eee1",
        "paper-deep": "#e8e0cd",
        ink: "#0a0c10",
        "ink-soft": "#4a4a4a",
        alizarin: "#d2202c",
        "alizarin-deep": "#a01820",
        lime: "#c8f65d",
        amberx: "#f5b800",
        "cat-blue": "#2563eb",
        "cat-teal": "#0d9488",
        "sky-300": "#7cc3ff",
        "sky-400": "#4aa3ff",
        "rose-300": "#ff6b6b",
        "rose-400": "#f34f4f",
      },
      fontFamily: {
        "serif-bn": ['var(--font-serif-bn, "Noto Serif Bengali", serif)'],
        "sans-bn": ['var(--font-sans-bn, "Hind Siliguri", sans-serif)'],
        "meta-bn": ['var(--font-meta-bn, "Hind Siliguri", sans-serif)'],
        sans: ['"Space Grotesk"', "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
        "mono-x": ['"JetBrains Mono"', "monospace"],
      },
      opacity: {
        6: "0.06",
        8: "0.08",
        12: "0.12",
        15: "0.15",
        35: "0.35",
        45: "0.45",
        55: "0.55",
      },
    },
  },
  plugins: [],
};