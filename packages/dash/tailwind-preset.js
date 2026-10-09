/**
 * Shared design tokens for the dashboard kit (@hoichoi/dash).
 *
 * The mockup was authored against Tailwind v4 `@theme` tokens; the web admin
 * (Tailwind v3) and the desktop (Tailwind v3) each merge this preset so the
 * same `ink-*` / `amber-brand` classes resolve in both apps. Only additive
 * tokens live here — nothing that would collide with the existing editorial
 * palettes.
 */
/** @type {import('tailwindcss').Config} */
const preset = {
  theme: {
    extend: {
      colors: {
        "ink-950": "#06070b",
        "ink-900": "#0a0c12",
        "ink-850": "#0e1118",
        "ink-800": "#12151e",
        "ink-700": "#1a1f2b",
        "ink-600": "#252b3a",
        mute: "#8a93a8",
        "amber-brand": "#f5a524",
        flame: "#ff6b1a",
        "cyan-brand": "#22d3ee",
        "violet-brand": "#a855f7",
        "emerald-brand": "#34d399",
        "rose-brand": "#fb7185",
      },
      opacity: {
        6: "0.06",
        8: "0.08",
        12: "0.12",
        15: "0.15",
        28: "0.28",
        32: "0.32",
        35: "0.35",
        45: "0.45",
        55: "0.55",
        65: "0.65",
        85: "0.85",
        92: "0.92",
      },
      keyframes: {
        floatUp: { from: { opacity: "0", translate: "0 14px" }, to: { opacity: "1", translate: "0 0" } },
        popIn: { "0%": { opacity: "0", transform: "scale(0.9)" }, "100%": { opacity: "1", transform: "scale(1)" } },
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
      },
      animation: {
        "float-up": "floatUp 0.55s cubic-bezier(0.22,1,0.36,1) both",
        "pop-in": "popIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both",
        "fade-in": "fadeIn 0.5s ease both",
      },
    },
  },
};

export default preset;
