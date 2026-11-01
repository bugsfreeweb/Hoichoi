export const AD_CREATIVE_LAYOUTS = [
  { key: "leaderboard", name: "Editorial banner", description: "Wide headline and call to action" },
  { key: "story", name: "Story card", description: "Vertical accent and supporting copy" },
  { key: "strip", name: "Compact strip", description: "Short message for a narrow placement" },
] as const;

export const AD_CREATIVE_PALETTES = [
  { key: "newsprint", name: "Newsprint", background: "#f3eee1", foreground: "#1a140d", accent: "#d2202c", accentText: "#ffffff" },
  { key: "midnight", name: "Midnight", background: "#0a0c10", foreground: "#f3eee1", accent: "#c8f65d", accentText: "#0a0c10" },
  { key: "ocean", name: "Ocean", background: "#0b2933", foreground: "#e8f5f7", accent: "#43c7be", accentText: "#082126" },
  { key: "amber", name: "Amber", background: "#fff4df", foreground: "#39220a", accent: "#b45309", accentText: "#ffffff" },
] as const;

export function adCreativePalette(key: string) {
  return AD_CREATIVE_PALETTES.find((palette) => palette.key === key) ?? AD_CREATIVE_PALETTES[0];
}
