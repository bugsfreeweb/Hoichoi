import { getClient } from "@hoichoi/db";
import type { SiteSettings } from "@hoichoi/shared-types";

export async function getSettings(): Promise<SiteSettings> {
  const client = getClient();
  const res = await client.execute("SELECT * FROM settings WHERE id = 1");
  if (res.rows.length === 0) {
    return {
      id: 1,
      pipeline_hours: 2,
      site_name: "হইচই",
      contact_email: "",
      police_helpline: "999",
      child_helpline: "109",
      archive_visible_days: 7,
      archive_retention_days: 30,
    };
  }
  const row = res.rows[0] as Record<string, unknown>;
  return {
    id: 1,
    pipeline_hours: Number(row.pipeline_hours),
    site_name: String(row.site_name),
    contact_email: String(row.contact_email ?? ""),
    police_helpline: String(row.police_helpline),
    child_helpline: String(row.child_helpline),
    archive_visible_days: Number(row.archive_visible_days),
    archive_retention_days: Number(row.archive_retention_days),
  };
}