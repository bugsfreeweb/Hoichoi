import { NextRequest, NextResponse } from "next/server";
import { applyImportBundle, getClient, type ExportBundle } from "@hoichoi/db";
import { forbidden, requireApiRole } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const guard = await requireApiRole("admin");
  if ("response" in guard) return guard.response;
  const user = guard.user;
  if (user.role !== "admin") return forbidden();

  const body = (await req.json().catch(() => null)) as
    | { bundle?: ExportBundle }
    | ExportBundle
    | null;
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const bundle = (body as { bundle?: ExportBundle }).bundle ?? (body as ExportBundle);
  if (!bundle || bundle.version !== 1 || !Array.isArray(bundle.tables)) {
    return NextResponse.json({ error: "invalid backup bundle" }, { status: 400 });
  }

  const written = await applyImportBundle(getClient(), bundle);
  await audit(user, { action: "data.import", entityType: "system", summary: `ইমপোর্ট: ${written} রেকর্ড`, metadata: { written } }, req);
  return NextResponse.json({ ok: true, written });
}