import { recordAdDeliveryEvent } from "@hoichoi/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "JSON content type is required." }, { status: 415 });
  }

  const text = await request.text();
  if (text.length > 4096) return NextResponse.json({ error: "Request is too large." }, { status: 413 });

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Invalid event payload." }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const { bookingId, slotKey, kind } = body;
  const path = typeof body.path === "string" ? body.path.slice(0, 500) : "";
  const device = typeof body.device === "string" ? body.device.slice(0, 40) : "web";
  if (
    typeof bookingId !== "string" ||
    bookingId.length > 80 ||
    typeof slotKey !== "string" ||
    !/^[a-z0-9][a-z0-9_-]{1,59}$/.test(slotKey) ||
    (kind !== "impression" && kind !== "click") ||
    !path.startsWith("/") ||
    path.startsWith("/admin") ||
    path.startsWith("/api")
  ) {
    return NextResponse.json({ error: "Invalid ad event." }, { status: 400 });
  }

  try {
    await recordAdDeliveryEvent({ bookingId, slotKey, kind, path, device });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error && error.message === "বিজ্ঞাপন বুকিংটি এখন সক্রিয় নয়।") {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[platform-ads] unable to record delivery event", { slotKey, bookingId, error });
    return NextResponse.json({ error: "বিজ্ঞাপন ইভেন্ট সংরক্ষণ করা যায়নি।" }, { status: 500 });
  }
}
