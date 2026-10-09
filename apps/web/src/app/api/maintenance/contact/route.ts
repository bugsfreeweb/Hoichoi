import { NextRequest, NextResponse } from "next/server";
import { bookMaintenanceMessage } from "@hoichoi/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/maintenance/contact — contact form submit from the maintenance
 * screen while the press is down. Writes to `maintenance_messages`; the admin
 * operations viewer reads that inbox. Public endpoint, insert-only.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    name?: string;
    email?: string;
    topic?: string;
    body?: string;
    locale?: string;
  } | null;

  try {
    await bookMaintenanceMessage({
      name: body?.name ?? "",
      email: body?.email ?? "",
      topic: body?.topic ?? "",
      body: body?.body ?? "",
      locale: body?.locale,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "বার্তা পাঠানো ব্যর্থ।" },
      { status: 400 },
    );
  }
}