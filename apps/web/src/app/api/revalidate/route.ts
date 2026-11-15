import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { timingSafeEqual } from "node:crypto";

/**
 * ক্যাশ রিভ্যালিডেশন।
 *
 * Fail closed: the previous version guarded with
 * `if (expectedSecret && secret !== expectedSecret)`, which meant that whenever
 * `REVALIDATE_SECRET` was unset every anonymous request could flush the whole
 * site cache — a free denial-of-service against Vercel and against the
 * publishing pipeline's rate budget. An unconfigured secret is now a 503, and
 * the comparison is constant-time so the value cannot be probed by timing.
 */
function configuredSecret(): string | null {
  const value = process.env.REVALIDATE_SECRET?.trim();
  return value ? value : null;
}

function sameSecret(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  const expected = configuredSecret();
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "revalidate is not configured (REVALIDATE_SECRET missing)" },
      { status: 503 },
    );
  }
  if (!sameSecret(req.nextUrl.searchParams.get("secret"), expected)) {
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
