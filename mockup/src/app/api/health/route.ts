import { ping, DB_CONFIGURED, DRIVER_LABEL, DB_DRIVER } from "@/db";
import { countArticles } from "@/lib/db-bootstrap";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Readiness probe. Reports configuration, connectivity AND whether our
 * namespaced hoichoi_* schema exists with content — so "site is up but empty"
 * is visible here instead of being a mystery.
 */
export async function GET() {
  const { ok, driver } = await ping();
  let articles: number | null = null;
  let schemaReady = false;
  try {
    articles = await countArticles();
    schemaReady = true;
  } catch {
    schemaReady = false;
  }
  const healthy = ok && DB_CONFIGURED;
  return Response.json(
    {
      ok: healthy,
      driver,
      driverLabel: DRIVER_LABEL,
      configured: DB_CONFIGURED,
      schemaReady,
      articles,
      // Only meaningful for Turso; Postgres mode has no local/cloud distinction here.
      mode:
        DB_DRIVER === "turso" && (!process.env.TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL.startsWith("file:"))
          ? "local"
          : "cloud",
      hint: !DB_CONFIGURED
        ? DB_DRIVER === "turso"
          ? "TURSO_DATABASE_URL/TOKEN missing."
          : "DATABASE_URL missing."
        : !schemaReady
          ? "Connected, but hoichoi_* tables are missing — call /api/setup (x-setup-key) or let the first page load auto-bootstrap."
          : articles === 0
            ? "Connected and schema ready, but no articles yet — run /api/setup or collect content."
            : null,
    },
    { status: healthy ? 200 : 500, headers: { "Cache-Control": "no-store" } },
  );
}
