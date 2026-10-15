import "server-only";
import { getSiteVariant, listSections } from "@hoichoi/db";
import { DEFAULT_VARIANT, PRESETS } from "@hoichoi/shared-types";
import type { MvLive } from "./variant";

/**
 * Reads the persisted variant engine once per request.
 *
 * `previewVariant` is an admin-only overlay used by the appearance panel's
 * "live preview": instead of persisting a look just to look at it, the site is
 * rendered with the chosen preset applied in memory. Passing `"default"` shows
 * the shipped production design. Nothing is written to the database.
 */
export async function loadLive(previewVariant?: string): Promise<MvLive> {
  const [state, siteVariant] = await Promise.all([listSections(), getSiteVariant()]);

  if (previewVariant === DEFAULT_VARIANT) {
    return { state: state.map((s) => ({ ...s, variant: s.meta.defaultVariant })), siteVariant: DEFAULT_VARIANT };
  }
  const preset = previewVariant ? PRESETS.find((p) => p.id === previewVariant) : undefined;
  if (preset) {
    return {
      state: state.map((s) => ({ ...s, variant: preset.values[s.key] ?? s.variant })),
      siteVariant: preset.id,
    };
  }
  return { state, siteVariant };
}
