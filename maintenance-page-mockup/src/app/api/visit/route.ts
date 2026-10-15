import { NextResponse } from "next/server";
import { getSettings, recordVisit } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const s = await getSettings();
  if (!s.analytics.enabled) return NextResponse.json({ ok: true, skipped: true });

  const body = await req.json().catch(() => null);
  const theme = String(body?.theme ?? "unknown").slice(0, 32);
  const path = String(body?.path ?? "/").slice(0, 120);
  const device = String(body?.device ?? "desktop").slice(0, 16);
  const referrer = String(body?.referrer ?? "direct").slice(0, 200);

  await recordVisit({ theme, path, device, referrer });
  return NextResponse.json({ ok: true });
}
