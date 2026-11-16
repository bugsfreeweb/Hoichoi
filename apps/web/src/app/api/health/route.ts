import { NextResponse } from "next/server";
import { getClient, listMigrations } from "@hoichoi/db";
import { buildHealthReport, healthStatusCode, probe, type Probe } from "@/lib/health";
import { logWarn } from "@/lib/log";
import { reportError } from "@/lib/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STARTED_AT = Date.now();

/**
 * GET /api/health — can this deployment serve a story right now?
 *
 * Public on purpose: an uptime monitor and a reader-facing status page both need
 * it, and there is nothing private in the payload (booleans, counts, versions,
 * durations). It fails with 503 only when something *critical* is broken, and it
 * says "degraded" rather than hiding a slow or partially broken dependency.
 */
export async function GET() {
  const probes: Probe[] = [];

  // Database reachability — the one thing that makes every page a 500.
  const dbStart = performance.now();
  try {
    const client = getClient();
    await client.execute("SELECT 1");
    probes.push(probe("db", performance.now() - dbStart, "ok"));
  } catch (e) {
    probes.push(
      probe("db", performance.now() - dbStart, "fail", e instanceof Error ? e.message.slice(0, 120) : "query failed"),
    );
  }

  // Schema state: a deployment whose migrations did not run serves broken pages.
  const migrationStart = performance.now();
  try {
    const client = getClient();
    const res = await client.execute("SELECT count(*) AS n FROM _migrations");
    const applied = Number((res.rows[0] as Record<string, unknown> | undefined)?.n ?? 0);
    const expected = listMigrations().length;
    const status = applied >= expected ? "ok" : "degraded";
    probes.push(
      probe(
        "migrations",
        performance.now() - migrationStart,
        status,
        applied >= expected ? `${applied} applied` : `${applied}/${expected} applied — a deploy may be mid-flight`,
      ),
    );
  } catch {
    probes.push(probe("migrations", performance.now() - migrationStart, "fail", "migration table unreadable"));
  }

  // Image pipeline: every provider cooling down means new posts publish without
  // a picture. That is not an outage, so it is `degraded`, not `fail`.
  const mediaStart = performance.now();
  try {
    const client = getClient();
    const res = await client.execute(
      `SELECT
         count(*) AS total,
         sum(CASE WHEN cooldown_until IS NOT NULL AND cooldown_until > ? THEN 1 ELSE 0 END) AS cooling
       FROM media_provider_health`,
    );
    const row = res.rows[0] as Record<string, unknown> | undefined;
    const total = Number(row?.total ?? 0);
    const cooling = Number(row?.cooling ?? 0);
    if (total === 0) {
      probes.push(probe("media", performance.now() - mediaStart, "skipped", "no provider registered yet"));
    } else if (cooling >= total) {
      probes.push(probe("media", performance.now() - mediaStart, "degraded", "every image provider is cooling down"));
    } else {
      probes.push(probe("media", performance.now() - mediaStart, "ok", `${total - cooling}/${total} usable`));
    }
  } catch {
    probes.push(probe("media", performance.now() - mediaStart, "skipped", "provider health not installed"));
  }

  // Mail is optional: a site without it works, it just cannot send resets.
  probes.push(
    process.env.RESEND_API_KEY || process.env.SMTP_HOST
      ? probe("mail", 0, "ok", "configured")
      : probe("mail", 0, "skipped", "no transport configured"),
  );

  const report = buildHealthReport({
    version: process.env.npm_package_version ?? "1.1.26",
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? process.env.GIT_COMMIT?.slice(0, 7) ?? null,
    startedAt: STARTED_AT,
    probes,
  });

  if (report.status === "unhealthy") {
    // Critical is an incident: log it and hand it to error reporting, once.
    void reportError(new Error(`health unhealthy: ${report.probes.filter((p) => p.status === "fail").map((p) => p.name).join(", ")}`), {
      event: "health.unhealthy",
      route: "/api/health",
    });
  } else if (!report.ok) {
    logWarn({
      event: "health.degraded",
      health: report.status,
      probes: report.probes.filter((p) => p.status !== "ok" && p.status !== "skipped"),
    });
  }

  return NextResponse.json(report, {
    status: healthStatusCode(report),
    headers: {
      // Monitors poll this; a cached "healthy" is worse than useless.
      "Cache-Control": "no-store",
    },
  });
}
