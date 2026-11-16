/**
 * Error reporting hook.
 *
 * There was no place for an exception to go: it became a JSON response to one
 * request and then vanished. This sends the same error to Sentry when a DSN is
 * configured, using Sentry's plain HTTP envelope so the app carries no SDK
 * dependency and a self-hosted install with no DSN pays nothing.
 *
 * Rules:
 * - No DSN → structured log only. Never throw from a reporter.
 * - The payload carries the message, a short stack and the event name. Not the
 *   request body, not cookies, not reader identifiers.
 * - Fire-and-forget with a timeout: telemetry must never keep a lambda alive.
 */
import { logError, type LogFields } from "./log";

function parseDsn(dsn: string): { url: string; key: string; project: string } | null {
  try {
    const parsed = new URL(dsn);
    const project = parsed.pathname.replace(/^\//, "");
    if (!parsed.username || !project) return null;
    return { url: parsed.origin, key: parsed.username, project };
  } catch {
    return null;
  }
}

export function sentryConfigured(): boolean {
  return Boolean(process.env.SENTRY_DSN && parseDsn(process.env.SENTRY_DSN));
}

/** `event_id` must be 32 hex chars for Sentry to accept the envelope. */
function eventId(): string {
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

export async function reportError(error: unknown, context: LogFields): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack?.slice(0, 4000) : undefined;

  // Always log: the log is the one sink that exists on every deployment.
  logError({ ...context, message, ...(stack ? { stack } : {}) });

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  const target = parseDsn(dsn);
  if (!target) return;

  const id = eventId();
  const event = {
    event_id: id,
    timestamp: new Date().toISOString(),
    level: "error",
    platform: "javascript",
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "production",
    release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? undefined,
    transaction: context.event,
    tags: { event: context.event, ...(context.route ? { route: String(context.route) } : {}) },
    extra: context,
    exception: { values: [{ type: error instanceof Error ? error.name : "Error", value: message }] },
  };

  const envelope =
    JSON.stringify({ event_id: id, sent_at: new Date().toISOString() }) +
    "\n" +
    JSON.stringify({ type: "event" }) +
    "\n" +
    JSON.stringify(event);

  try {
    await fetch(`${target.url}/api/${target.project}/envelope/?sentry_key=${target.key}&sentry_version=7`, {
      method: "POST",
      headers: { "Content-Type": "application/x-sentry-envelope" },
      body: envelope,
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    /* telemetry is best-effort: a failed report must not fail the request */
  }
}
