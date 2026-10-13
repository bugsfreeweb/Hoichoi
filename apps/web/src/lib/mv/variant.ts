import type { SectionState } from "@hoichoi/shared-types";
import { DEFAULT_VARIANT, getSectionMeta, SECTIONS } from "./registry";

/** Global chrome sections shared by every page. */
export const CHROME_KEYS = ["ticker", "navbar", "footer"];

/** The persisted variant-engine state shared by every mockup page. */
export interface MvLive {
  state: SectionState[];
  siteVariant: string;
}

/** The site renders its mockup designs whenever the whole-site variant or any
 *  section strays from the shipped `"default"` production look. */
export function isMvMode(live: MvLive): boolean {
  if (live.siteVariant && live.siteVariant !== DEFAULT_VARIANT) return true;
  return live.state.some((s) => s.variant !== DEFAULT_VARIANT);
}

/** In mockup mode a section still on `"default"` renders its first design so a
 *  page never falls back to mixed production markup. */
function firstMockup(key: string): string {
  const fallback = getSectionMeta(key)?.variants.find((v) => v.id !== DEFAULT_VARIANT);
  return fallback?.id ?? DEFAULT_VARIANT;
}

export function variantFor(live: MvLive, key: string): string {
  const chosen = live.state.find((s) => s.key === key)?.variant ?? DEFAULT_VARIANT;
  return chosen === DEFAULT_VARIANT ? firstMockup(key) : chosen;
}

export function enabledFor(live: MvLive, key: string): boolean {
  const row = live.state.find((s) => s.key === key);
  return row ? row.enabled : (getSectionMeta(key)?.defaultVisible ?? true);
}

/** Catalogued design order for a page scope (global chrome + page sections). */
export function orderFor(scope: "home" | "post"): string[] {
  return SECTIONS.filter((s) => s.scope === scope || s.scope === "global").map((s) => s.key);
}