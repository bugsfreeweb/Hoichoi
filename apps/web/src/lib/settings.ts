import { getSettings as dbGetSettings } from "@hoichoi/db";
import type { SiteSettings } from "@hoichoi/shared-types";

/** Site settings (branding + pipeline cadence) straight from the settings row. */
export async function getSettings(): Promise<SiteSettings> {
  return dbGetSettings();
}