import { NextRequest, NextResponse } from "next/server";
import {
  countTrimmableHistory,
  countUnusablePosts,
  nowIso,
  quarantineUnusablePosts,
  trimHistory,
} from "@hoichoi/db";
import { requireApiUser, unauthorized, forbidden } from "@/lib/auth";
import { getClient } from "@hoichoi/db";

/**
 * One-off maintenance operations for an operator.
 *
 * Each is idempotent and reports what it actually changed, so it is safe to
 * run twice. `dryRun` (the default for the destructive ones) reports the count
 * without writing, which is what an operator should do first.
 */
export async function POST(req: NextRequest) {
  const user = await requireApiUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const body = (await req.json().catch(() => ({}))) as {
    action?: "quarantine-unusable" | "trim-history";
    dryRun?: boolean;
    olderThanDays?: number;
  };
  const dryRun = body.dryRun !== false;

  switch (body.action) {
    case "quarantine-unusable": {
      const found = await countUnusablePosts();
      if (dryRun) {
        return NextResponse.json({
          ok: true,
          dryRun: true,
          found,
          message:
            found === 0
              ? "কোনো অব্যবহারযোগ্য পোস্ট নেই।"
              : `${found}টি পোস্ট rejected হবে (মুছে ফেলা হবে না)।`,
        });
      }
      const ids = await quarantineUnusablePosts();
      const client = getClient();
      for (const id of ids) {
        await client.execute({
          sql: "INSERT INTO admin_actions (id, admin_user_id, action, target_table, target_id, created_at) VALUES (?, ?, ?, 'posts', ?, ?)",
          args: [crypto.randomUUID(), user.user_id, "post.quarantine_unusable", id, nowIso()],
        });
      }
      return NextResponse.json({ ok: true, dryRun: false, quarantined: ids.length });
    }

case "trim-history": {
      const days = Math.max(7, Math.min(3650, Number(body.olderThanDays ?? 90)));
      if (dryRun) {
        // Report the real row counts so the operator can review before deleting.
        const wouldDelete = await countTrimmableHistory(days);
        return NextResponse.json({
          ok: true,
          dryRun: true,
          olderThanDays: days,
          wouldDelete,
          message: `${days} দিনের পুরনো ${wouldDelete.runs}টি রান ও ${wouldDelete.actions}টি অ্যাডমিন অ্যাকশন মুছে যাবে — সত্যিই মুছতে dryRun: false পাঠান।`,
        });
      }
      const result = await trimHistory(days);
      return NextResponse.json({ ok: true, dryRun: false, ...result, olderThanDays: days });
    }

    default:
      return NextResponse.json(
        { error: "unknown action — use 'quarantine-unusable' or 'trim-history'" },
        { status: 400 },
      );
  }
}
