import { count } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscribers } from "@/db/schema";

export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function GET() {
  try {
    const [row] = await db.select({ n: count() }).from(subscribers);
    return NextResponse.json({ ok: true, count: Number(row?.n ?? 0) });
  } catch {
    return NextResponse.json({ ok: false, count: 0 }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const input = await request.json().catch(() => ({}));
  const email = typeof input?.email === "string" ? input.email.trim().toLowerCase().slice(0, 200) : "";
  const source = typeof input?.source === "string" ? input.source.slice(0, 40) : "site";
  if (!EMAIL.test(email)) {
    return NextResponse.json({ ok: false, error: "সঠিক ইমেইল ঠিকানা লিখুন" }, { status: 400 });
  }
  try {
    const inserted = await db.insert(subscribers).values({ email, source }).onConflictDoNothing().returning({ id: subscribers.id });
    return NextResponse.json({ ok: true, already: inserted.length === 0 }, { status: inserted.length ? 201 : 200 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "সাবস্ক্রিপশন সংরক্ষণ করা যায়নি" }, { status: 503 });
  }
}
