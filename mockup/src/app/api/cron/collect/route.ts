import { secretMatches } from "@/lib/admin-auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** No random success rows. A scheduler tick is not evidence of collection. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !secretMatches((req.headers.get("authorization") ?? "").replace(/^Bearer /, ""), secret)) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  return Response.json({ ok: true, status: "skipped", reason: "No server-side collector is configured. Run the authorized desktop worker; this endpoint does not fabricate runs or publication counts.", checkedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
