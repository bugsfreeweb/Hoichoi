import { NextRequest, NextResponse } from "next/server";
import { mediaRootCandidates } from "@hoichoi/db";
import * as fs from "node:fs";
import * as path from "node:path";

/** পাবলিক পোস্ট মিডিয়া ফাইল — local storage (dev) অথবা edge caches (prod). */
export const dynamic = "force-dynamic";
const CACHE = "public, max-age=86400, stale-while-revalidate=604800";

const MIME: Record<string, string> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

export async function GET(_req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await ctx.params;
  const rel = parts.join("/");
  for (const root of mediaRootCandidates()) {
    const full = path.resolve(root, rel);
    if (!full.startsWith(path.resolve(root))) continue;
    if (!fs.existsSync(full)) continue;
    const ext = path.extname(full).toLowerCase();
    const buf = fs.readFileSync(full);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "content-type": MIME[ext] ?? "application/octet-stream",
        "cache-control": CACHE,
      },
    });
  }
  return new NextResponse("Not found", { status: 404 });
}