import type { Config } from "tailwindcss";

/** Design tokens straight from design-system.md + mockup.html. */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f3eee1",
        "paper-deep": "#e9e2cf",
        ink: "#1a140d",
        "ink-soft": "#6b6250",
        alizarin: "#d2202c",
        "alizarin-deep": "#a3121d",
        lime: "#c8f65d",
        amberx: "#ffb454",
        fb: "#1877f2",
        "cat-blue": "#2563eb",
        "cat-teal": "#0d9488",
        // dark "admin console" palette (matches mockup/src/app/admin)
        night: "#0a0c10",
        "night-grid": "#0c1017",
        panel: "#10141b",
        "sky-300": "#7cc3ff",
        "sky-400": "#4aa3ff",
        "rose-300": "#ff6b6b",
        "rose-400": "#f34f4f",
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
      maxWidth: {
        site: "1400px",
      },
    },
  },
  plugins: [],
} satisfies Config;