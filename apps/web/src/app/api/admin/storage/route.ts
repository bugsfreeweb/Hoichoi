import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth";
import { storageSnapshot } from "@hoichoi/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/storage
 * Admin/editor — the measured storage report the ট্রাফিক ও স্টোরেজ tab polls:
 * DB size (PRAGMA page_count) + largest tables, the on-disk media tree with
 * per-day growth, and every configured location (local + remote adapters, incl.
 * the GitHub-backed mirror). Same `storageSnapshot()` the CLI and desktop read.
 *
 * Without this route the polling client hit Next's HTML 404 page and died on
 * `res.json()` with "Unexpected token '<', "<!DOCTYPE"… is not valid JSON".
 */
export async function GET() {
  const guard = await requireApiRole("moderator");
  if ("response" in guard) return guard.response;
  const user = guard.user;

  try {
    const snapshot = await storageSnapshot();
    return NextResponse.json(snapshot);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "স্টোরেজ স্ন্যাপশট পাওয়া যায়নি।" },
      { status: 500 },
    );
  }
}
