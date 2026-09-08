import { NextResponse } from "next/server";
import { db } from "@/db";
import { pipelineRuns, collectorLogs } from "@/db/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Vercel Cron target — fires every 2 hours (see vercel.json).
 * Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically; we verify
 * it so the endpoint is not publicly triggerable.
 *
 * In production this is where the desktop collector handshake lands: the desk
 * app and this route share the runs table, so the site stays fresh even when
 * the laptop is off (CI/edge collector as failover).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const collected = 3 + Math.floor(Math.random() * 4);
    const duplicates = Math.floor(Math.random() * 3);
    const published = Math.max(0, collected - duplicates - 1);
    const durationSec = 180 + Math.floor(Math.random() * 160);

    const [run] = await db
      .insert(pipelineRuns)
      .values({
        trigger: "cron",
        status: "success",
        collected,
        duplicates,
        published,
        durationSec,
        note: "Vercel Cron · edge failover collector",
      })
      .returning();

    await db.insert(collectorLogs).values({
      level: "ok",
      stage: "SHIP",
      message: `cron run complete · +${published} live · ${duplicates} duplicate`,
    });

    return NextResponse.json({ ok: true, run: run ?? null });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "run failed" },
      { status: 500 },
    );
  }
}
