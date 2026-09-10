import { NextRequest, NextResponse } from "next/server";
import { getSettings, updateSettings } from "@hoichoi/db";
import { requireApiUser, unauthorized, forbidden } from "@/lib/auth";

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  await updateSettings({
    pipeline_hours: body.pipeline_hours as number,
    site_name: body.site_name as string,
    contact_email: body.contact_email as string,
    police_helpline: body.police_helpline as string,
    child_helpline: body.child_helpline as string,
    archive_visible_days: body.archive_visible_days as number,
    archive_retention_days: body.archive_retention_days as number,
    slogan_bn: body.slogan_bn as string,
    tagline: body.tagline as string,
    logo_url: (body.logo_url as string | null) ?? null,
    favicon_url: (body.favicon_url as string | null) ?? null,
    accent_color: body.accent_color as string,
    ad_leaderboard_html: (body.ad_leaderboard_html as string | null) ?? null,
    ad_rect_html: (body.ad_rect_html as string | null) ?? null,
    ad_infeed_html: (body.ad_infeed_html as string | null) ?? null,
    ad_strip_html: (body.ad_strip_html as string | null) ?? null,
  });
  return NextResponse.json({ ok: true });
}