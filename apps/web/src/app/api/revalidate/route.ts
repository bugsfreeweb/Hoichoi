import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const expectedSecret = process.env.REVALIDATE_SECRET;

  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ ok: false, error: "unauthorized: invalid secret" }, { status: 401 });
  }

  try {
    revalidatePath("/", "layout");
    revalidatePath("/[slug]", "page");
    revalidatePath("/category/[slug]", "page");
    return NextResponse.json({ ok: true, revalidated: true, at: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
