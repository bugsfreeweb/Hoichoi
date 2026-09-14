import type { Config } from "tailwindcss";

/** Design tokens straight from design-system.md + mockup.html. */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--color-paper)",
        "paper-deep": "var(--color-paper-deep)",
        ink: "var(--color-ink)",
        "ink-soft": "var(--color-ink-soft)",
        alizarin: "var(--color-alizarin)",
        "alizarin-deep": "var(--color-alizarin-deep)",
        lime: "var(--color-lime)",
        amberx: "var(--color-amberx)",
        fb: "var(--color-fb)",
        "cat-blue": "var(--color-cat-blue)",
        "cat-teal": "var(--color-cat-teal)",
        // dark "admin console" palette (matches mockup/src/app/admin)
        night: "var(--color-night)",
        "night-grid": "var(--color-night-grid)",
        panel: "var(--color-panel)",
        "sky-300": "var(--color-sky-300)",
        "sky-400": "var(--color-sky-400)",
        "rose-300": "var(--color-rose-300)",
        "rose-400": "var(--color-rose-400)",
      },
      fontFamily: {
        "serif-bn": ['"Noto Serif Bengali"', "serif"],
        "sans-bn": ['"Hind Siliguri"', "sans-serif"],
        sans: ['"Space Grotesk"', "sans-serif"],
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
      spacing: {
        18: "4.5rem",
        34: "8.5rem",
      },
      maxWidth: {
        site: "1400px",
      },
    },
  },
  plugins: [],
} satisfies Config;