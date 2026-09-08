import type { Config } from "tailwindcss";

/** Design tokens straight from design-system.md + mockup.html. */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
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
      },
      fontFamily: {
        "serif-bn": ['"Noto Serif Bengali"', "serif"],
        "sans-bn": ['"Hind Siliguri"', "sans-serif"],
        sans: ['"Space Grotesk"', "sans-serif"],
        "mono-x": ['"JetBrains Mono"', "monospace"],
      },
      maxWidth: {
        site: "1400px",
      },
    },
  },
  plugins: [],
} satisfies Config;