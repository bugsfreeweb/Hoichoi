import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscribers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const theme = typeof body?.theme === "string" ? body.theme.slice(0, 32) : "unknown";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
  }
  const s = await getSettings();
  if (!s.newsletter.enabled) {
    return NextResponse.json({ error: "Notifications are currently disabled." }, { status: 403 });
  }

  const existing = await db.select().from(subscribers).where(eq(subscribers.email, email)).limit(1);
  if (existing.length) return NextResponse.json({ ok: true, duplicate: true });

  await db.insert(subscribers).values({ email, theme });
  return NextResponse.json({ ok: true, duplicate: false });
}
