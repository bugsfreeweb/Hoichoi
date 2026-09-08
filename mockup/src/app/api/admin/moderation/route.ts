import { NextResponse } from "next/server";
import { db } from "@/db";
import { comments, ipBans, bannedWords } from "@/db/schema";
import { eq } from "drizzle-orm";
import { BAN_MS } from "@/lib/moderation";

export const runtime = "nodejs";

/**
 * POST /api/admin/moderation  — manual moderation actions.
 * Guarded by ADMIN_KEY (header x-admin-key). If ADMIN_KEY is unset the panel
 * runs in open demo mode (sandbox only).
 *
 * actions:
 *   comment.approve { id }
 *   comment.block   { id }
 *   comment.delete  { id }
 *   ip.ban          { ip, scope: '7d'|'30d'|'permanent', reason? }
 *   ip.unban        { id }
 *   word.add        { word, severity }
 *   word.remove     { id }
 */
export async function POST(req: Request) {
  const adminKey = process.env.ADMIN_KEY;
  if (adminKey && req.headers.get("x-admin-key") !== adminKey) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let payload: { action?: string; [k: string]: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const action = String(payload.action ?? "");

  try {
    switch (action) {
      case "comment.approve": {
        const id = Number(payload.id);
        await db.update(comments).set({ status: "approved" }).where(eq(comments.id, id));
        return NextResponse.json({ ok: true });
      }
      case "comment.block": {
        const id = Number(payload.id);
        await db.update(comments).set({ status: "blocked" }).where(eq(comments.id, id));
        return NextResponse.json({ ok: true });
      }
      case "comment.delete": {
        const id = Number(payload.id);
        await db.delete(comments).where(eq(comments.id, id));
        return NextResponse.json({ ok: true });
      }
      case "ip.ban": {
        const ip = String(payload.ip ?? "").trim();
        const scope = (String(payload.scope ?? "7d") as "7d" | "30d" | "permanent");
        const reason = String(payload.reason ?? "ম্যানুয়াল ব্যান").slice(0, 200);
        if (!ip) return NextResponse.json({ ok: false, error: "IP প্রয়োজন" }, { status: 400 });
        const expiresAt =
          scope === "permanent" ? null : new Date(Date.now() + BAN_MS[scope]);
        const [row] = await db
          .insert(ipBans)
          .values({ ip, scope, reason, strikes: 1, auto: false, expiresAt })
          .returning();
        // also block that IP's visible comments
        await db.update(comments).set({ status: "blocked" }).where(eq(comments.ip, ip));
        return NextResponse.json({ ok: true, ban: row });
      }
      case "ip.unban": {
        const id = Number(payload.id);
        await db.delete(ipBans).where(eq(ipBans.id, id));
        return NextResponse.json({ ok: true });
      }
      case "word.add": {
        const word = String(payload.word ?? "").trim().toLowerCase().slice(0, 60);
        const severity = Math.min(3, Math.max(1, Number(payload.severity) || 1));
        if (!word) return NextResponse.json({ ok: false, error: "শব্দ প্রয়োজন" }, { status: 400 });
        const [row] = await db
          .insert(bannedWords)
          .values({ word, severity })
          .onConflictDoUpdate({ target: bannedWords.word, set: { severity } })
          .returning();
        return NextResponse.json({ ok: true, word: row });
      }
      case "word.remove": {
        const id = Number(payload.id);
        await db.delete(bannedWords).where(eq(bannedWords.id, id));
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "action failed" },
      { status: 500 },
    );
  }
}
