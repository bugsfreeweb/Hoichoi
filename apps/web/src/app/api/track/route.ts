import { NextRequest, NextResponse } from "next/server";
import { recordAdEvent, recordPageView, postIdForSlug } from "@hoichoi/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/track — first-party, cookie-less page-view + ad-event beacon.
 *
 * Geo comes from Vercel's edge headers (`x-vercel-ip-*`); when absent (local
 * dev / self-host) the geo fields are simply null. The raw IP is never stored:
 * `recordPageView` hashes ip+UA+day into a rotating visitor id. Bots and admin
 * paths are ignored so the numbers reflect real readers.
 */

/** 2-letter country from Vercel, else null. */
function countryCode(req: NextRequest): string | null {
  const raw =
    req.headers.get("x-vercel-ip-country") ??
    req.headers.get("cf-ipcountry") ??
    "";
  const cc = raw.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(cc) ? cc : null;
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  return (fwd.split(",")[0] ?? req.headers.get("x-real-ip") ?? "").trim();
}

export async function POST(req: NextRequest) {
  try {
    const ua = req.headers.get("user-agent") ?? "";
    if (/bot|crawl|spider|preview|headless/i.test(ua)) {
      return NextResponse.json({ ok: true, skipped: "bot" });
    }
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const path = String(body.path ?? "").slice(0, 500);
    if (!path.startsWith("/") || path.startsWith("/admin") || path.startsWith("/desk") || path.startsWith("/api")) {
      return NextResponse.json({ ok: true, skipped: "path" });
    }
    const cc = countryCode(req);
    const sessionId = String(body.sessionId ?? "").slice(0, 64);
    const ip = clientIp(req);
    const country = req.headers.get("x-vercel-ip-country") ?? null;
    const region = req.headers.get("x-vercel-ip-country-region") ?? null;
    const city = req.headers.get("x-vercel-ip-city") ?? null;

    // Ad slot view/click ping.
    const adSlot = body.adSlot ? String(body.adSlot).slice(0, 60) : "";
    if (adSlot) {
      const slug = String(body.postSlug ?? "");
      await recordAdEvent({
        slot: adSlot,
        event: body.adEvent === "click" ? "click" : "view",
        postId: slug ? await postIdForSlug(slug) : null,
        path,
        sessionId,
        country,
      });
      return NextResponse.json({ ok: true });
    }

    // Page view.
    const slug = String(body.postSlug ?? "");
    await recordPageView({
      path,
      postId: slug ? await postIdForSlug(slug) : null,
      postSlug: slug || null,
      sessionId,
      ip,
      userAgent: ua,
      country,
      countryCode: cc,
      region,
      city,
      referrer: String(body.referrer ?? "").slice(0, 300) || null,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "track failed" },
      { status: 200 },
    );
  }
}
