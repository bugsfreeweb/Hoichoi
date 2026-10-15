import { NextResponse } from "next/server";
import { db } from "@/db";
import { postReports } from "@/db/schema";
import { getPost } from "@/lib/posts";

export const dynamic = "force-dynamic";

const REASONS = new Set(["ভুল তথ্য", "সূত্রের সমস্যা", "অনুপযুক্ত ভাষা", "পুরোনো তথ্য", "অন্যান্য"]);
const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.replace(/\u0000/g, "").trim().slice(0, max) : "";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return NextResponse.json({ ok: false, error: "প্রতিবেদনটি পাওয়া যায়নি" }, { status: 404 });

  const input = await request.json().catch(() => ({}));
  const reporter = clean(input?.reporter, 60) || "পাঠক";
  const reason = clean(input?.reason, 40);
  const details = clean(input?.details, 1200);
  if (!REASONS.has(reason)) return NextResponse.json({ ok: false, error: "তালিকা থেকে একটি কারণ বেছে নিন" }, { status: 400 });
  if (details.length > 0 && details.length < 8) return NextResponse.json({ ok: false, error: "বিস্তারিত অন্তত ৮ অক্ষরের লিখুন" }, { status: 400 });

  try {
    const [report] = await db
      .insert(postReports)
      .values({ postSlug: slug, reporter, reason, details, status: "new" })
      .returning({ id: postReports.id, createdAt: postReports.createdAt });
    return NextResponse.json({ ok: true, report }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "প্রতিবেদন পাঠানো যায়নি" }, { status: 503 });
  }
}
