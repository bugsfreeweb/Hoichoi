import { NextRequest, NextResponse } from "next/server";
import { getClient, nowIso } from "@hoichoi/db";
import type { InValue } from "@libsql/client";
import { requireApiUser, unauthorized, forbidden } from "@/lib/auth";

export async function GET() {
  const client = getClient();
  const res = await client.execute("SELECT * FROM settings WHERE id = 1");
  if (res.rows.length === 0) {
    return NextResponse.json({
      settings: {
        pipeline_hours: 2,
        site_name: "হইচই",
        contact_email: "",
        police_helpline: "999",
        child_helpline: "109",
        archive_visible_days: 7,
        archive_retention_days: 30,
      },
    });
  }
  const row = res.rows[0] as Record<string, unknown>;
  return NextResponse.json({ settings: row });
}

export async function PATCH(req: NextRequest) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const client = getClient();
  const fields: Record<string, unknown> = {
    pipeline_hours: body?.pipeline_hours,
    site_name: body?.site_name,
    contact_email: body?.contact_email,
    police_helpline: body?.police_helpline,
    child_helpline: body?.child_helpline,
    archive_visible_days: body?.archive_visible_days,
    archive_retention_days: body?.archive_retention_days,
  };
  const sets: string[] = [];
  const args: InValue[] = [];
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined && v !== null) {
      sets.push(`${k} = ?`);
      args.push(v as InValue);
    }
  }
  if (sets.length === 0) return NextResponse.json({ error: "no fields" }, { status: 400 });
  sets.push("updated_at = ?");
  args.push(nowIso());
  await client.execute({ sql: `UPDATE settings SET ${sets.join(", ")} WHERE id = 1`, args });
  return NextResponse.json({ ok: true });
}