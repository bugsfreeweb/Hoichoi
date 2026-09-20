import { NextResponse } from "next/server";
import { DB_DRIVER } from "@/db";
import { bootstrapDatabase } from "@/lib/db-bootstrap";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/setup  (header: x-setup-key)
 * Explicit bootstrap: creates the namespaced hoichoi_* tables and seeds demo
 * content when empty. Guarded by SETUP_KEY (required on Vercel).
 */
export async function GET(req: Request) {
  const setupKey = process.env.SETUP_KEY;
  if (process.env.VERCEL && !setupKey) {
    return NextResponse.json({ ok: false, error: "SETUP_KEY must be configured before cloud setup." }, { status: 503 });
  }
  if (setupKey && req.headers.get("x-setup-key") !== setupKey) {
    return NextResponse.json({ ok: false, error: "SETUP_KEY mismatch — send header x-setup-key" }, { status: 401 });
  }
  try {
    const result = await bootstrapDatabase();
    return NextResponse.json({ ...result, note: result.seeded ? "টেবিল তৈরি + ডেমো ডেটা সিড হয়েছে" : "টেবিল বিদ্যমান; ডেটা থাকায় সিড করা হয়নি" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[setup]", error);
    return NextResponse.json({ ok: false, driver: DB_DRIVER, error: error instanceof Error ? error.message : "setup failed" }, { status: 500 });
  }
}
