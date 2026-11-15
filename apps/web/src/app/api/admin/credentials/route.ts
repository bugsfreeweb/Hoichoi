import { NextRequest, NextResponse } from "next/server";
import { deleteCredential, listCredentials, upsertCredential, credentialState } from "@hoichoi/db";
import { forbidden, requireApiRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { CredentialScope } from "@hoichoi/db";

export const dynamic = "force-dynamic";

const SCOPES: CredentialScope[] = ["provider", "storage", "mail", "vcs", "infra", "other"];

/** GET /api/admin/credentials — every tracked credential with its expiry state. */
export async function GET() {
  const guard = await requireApiRole("moderator");
  if ("response" in guard) return guard.response;
  const rows = await listCredentials();
  const now = Date.now();
  return NextResponse.json({
    credentials: rows.map((row) => ({ ...row, status: credentialState(row.expires_at, now, row.warn_days) })),
    now: new Date(now).toISOString(),
  });
}

/** POST /api/admin/credentials — create or renew by name. */
export async function POST(req: NextRequest) {
  const guard = await requireApiRole("admin");
  if ("response" in guard) return guard.response;
  const user = guard.user;
  if (user.role !== "admin") return forbidden();

  const body = (await req.json().catch(() => null)) as
    | { name?: string; scope?: string; owner_email?: string; expires_at?: string; warn_days?: number; notes?: string }
    | null;
  if (!body?.name || !body.expires_at) {
    return NextResponse.json({ ok: false, error: "name এবং expires_at দরকার।" }, { status: 400 });
  }
  const scope = SCOPES.includes(body.scope as CredentialScope) ? (body.scope as CredentialScope) : "other";

  try {
    const row = await upsertCredential({
      name: body.name,
      scope,
      owner_email: body.owner_email,
      expires_at: body.expires_at,
      warn_days: body.warn_days,
      notes: body.notes,
    });
    await audit(
      user,
      {
        action: "credential.save",
        entityType: "credential",
        entityId: row.id,
        summary: `ক্রেডেনশিয়াল সংরক্ষণ: ${row.name} (মেয়াদ ${row.expires_at.slice(0, 10)})`,
        metadata: { scope: row.scope, warn_days: row.warn_days },
      },
      req,
    );
    return NextResponse.json({ ok: true, credential: row });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 400 });
  }
}

/** DELETE /api/admin/credentials?id=… */
export async function DELETE(req: NextRequest) {
  const guard = await requireApiRole("admin");
  if ("response" in guard) return guard.response;
  const user = guard.user;
  if (user.role !== "admin") return forbidden();

  const id = req.nextUrl.searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ ok: false, error: "id দরকার।" }, { status: 400 });
  const removed = await deleteCredential(id);
  if (removed === 0) return NextResponse.json({ ok: false, error: "পাওয়া যায়নি।" }, { status: 404 });
  await audit(user, { action: "credential.delete", entityType: "credential", entityId: id, summary: "ক্রেডেনশিয়াল মুছে ফেলা হয়েছে" }, req);
  return NextResponse.json({ ok: true, removed });
}
