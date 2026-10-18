import "server-only";
import { cookies } from "next/headers";
import { getSiteVariant, listSections } from "@hoichoi/db";
import { DEFAULT_VARIANT, PRESETS } from "@hoichoi/shared-types";
import { currentUser } from "@/lib/auth";
import type { MvLive } from "./variant";

/** Cookie the admin preview studio writes; the public site reads it in memory. */
export const PREVIEW_COOKIE = "hoichoi-preview-variant";

/**
 * A transient, admin-only design draft used by the live preview studio. It is
 * never persisted: the cookie carries the whole draft so the entire site
 * (chrome + every home/post section) renders the chosen look — including which
 * sections are shown/hidden — without touching the database.
 */
export interface PreviewDraft {
  /** Whole-site preset id, or `"default"` to preview the shipped design. */
  site?: string;
  /** Per-section overrides applied on top of the preset/saved state. */
  overrides?: Record<string, { variant?: string; enabled?: boolean }>;
}

function b64urlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(value: string): string | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/");
    const pad = padded.length % 4 ? "=".repeat(4 - (padded.length % 4)) : "";
    return Buffer.from(padded + pad, "base64").toString("utf8");
  } catch {
    return null;
  }
}

/** Serialises a draft for the preview cookie. */
export function encodePreviewDraft(draft: PreviewDraft): string {
  return `pv1.${b64urlEncode(JSON.stringify(draft))}`;
}

/** Parses the preview cookie; tolerates the legacy bare-variant value. */
export function decodePreviewDraft(raw: string): PreviewDraft | null {
  if (!raw.startsWith("pv1.")) return raw ? { site: raw } : null;
  const json = b64urlDecode(raw.slice(4));
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as PreviewDraft) : null;
  } catch {
    return null;
  }
}

/**
 * Reads the persisted variant engine once per request, then applies an optional
 * admin preview draft on top (preset first, then per-section overrides) so the
 * preview is a faithful, non-destructive render of the whole site.
 */
export async function loadLive(draft?: PreviewDraft | null): Promise<MvLive> {
  const [state, siteVariant] = await Promise.all([listSections(), getSiteVariant()]);

  if (!draft) return { state, siteVariant };

  let nextSite = siteVariant;
  let nextState = state;

  if (typeof draft.site === "string") {
    if (draft.site === DEFAULT_VARIANT) {
      nextSite = DEFAULT_VARIANT;
      nextState = nextState.map((s) => ({ ...s, variant: s.meta.defaultVariant }));
    } else {
      const preset = PRESETS.find((p) => p.id === draft.site);
      if (preset) {
        nextSite = preset.id;
        nextState = nextState.map((s) => ({ ...s, variant: preset.values[s.key] ?? s.variant }));
      }
    }
  }

  if (draft.overrides) {
    nextState = nextState.map((s) => {
      const o = draft.overrides?.[s.key];
      if (!o) return s;
      return { ...s, variant: o.variant ?? s.variant, enabled: o.enabled ?? s.enabled };
    });
  }

  return { state: nextState, siteVariant: nextSite };
}

/**
 * The single entry point every public server component uses: reads the
 * short-lived admin preview cookie (only honoured for a signed-in user) and
 * returns the live variant state. Keeps the layout, home page and post page in
 * agreement, so a preview restyles the *whole* render rather than just chrome.
 */
export async function getLive(): Promise<MvLive> {
  let draft: PreviewDraft | null = null;
  try {
    const raw = (await cookies()).get(PREVIEW_COOKIE)?.value;
    if (raw) {
      const decoded = decodePreviewDraft(raw);
      if (decoded && (await currentUser())) draft = decoded;
    }
  } catch {
    /* outside a request scope — fall through to the saved design */
  }
  return loadLive(draft);
}
