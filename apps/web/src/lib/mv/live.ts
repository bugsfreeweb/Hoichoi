import "server-only";
import { getSiteVariant, listSections } from "@hoichoi/db";
import type { MvLive } from "./variant";

/** Reads the persisted variant engine once per request. */
export async function loadLive(): Promise<MvLive> {
  const [state, siteVariant] = await Promise.all([listSections(), getSiteVariant()]);
  return { state, siteVariant };
}