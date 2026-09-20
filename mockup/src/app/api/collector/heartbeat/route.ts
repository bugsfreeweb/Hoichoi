import { db, tables } from "@/db";
import { secretMatches } from "@/lib/admin-auth";
export const runtime = "nodejs";

/** A real collector calls this every 30s. The UI marks it offline after 90s. */
export async function POST(req: Request) {
  const secret = process.env.COLLECTOR_SECRET;
  if (!secret || secret.length < 24) return Response.json({ error: "Collector authentication not configured" }, { status: 503 });
  const supplied = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  if (!secretMatches(supplied, secret)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { state } = await req.json();
    if (!["ready", "working", "error"].includes(state)) return Response.json({ error: "Invalid state" }, { status: 400 });
    const lastSeenAt = new Date();
    await db.insert(tables.serviceHeartbeats).values({ service: "collector", state, lastSeenAt }).onConflictDoUpdate({ target: tables.serviceHeartbeats.service, set: { state, lastSeenAt } });
    return Response.json({ ok: true, lastSeenAt }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Heartbeat could not be saved" }, { status: 503 }); }
}
