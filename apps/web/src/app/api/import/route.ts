import { NextRequest, NextResponse } from "next/server";
import { applyImportBundle, getClient, type ExportBundle } from "@hoichoi/db";
import { requireApiUser, unauthorized, forbidden } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
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
  return NextResponse.json({ ok: true, written });
}