import { NextRequest, NextResponse } from "next/server";
import { subscribeMaintenance } from "@hoichoi/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/maintenance/subscribe — newsletter drop from the maintenance screen.
 * Public endpoint (the screen replaces the whole public site), so it only ever
 * inserts a row; it never reads or returns anything sensitive. A bad address is
 * rejected, and an address already on the list is reported as a duplicate
 * instead of erroring.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    email?: string;
    name?: string;
    locale?: string;
  } | null;

  try {
    const { status } = await subscribeMaintenance({
      email: body?.email ?? "",
      name: body?.name ?? "",
      locale: body?.locale,
    });
    return NextResponse.json({ ok: true, status });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "সাবস্ক্রাইব ব্যর্থ।" },
      { status: 400 },
    );
  }
}