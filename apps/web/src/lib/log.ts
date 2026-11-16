/**
 * Structured logging.
 *
 * There was no logging at all: failures either surfaced as a JSON error to one
 * request or as nothing. A log line that is not structured cannot be searched by
 * the thing that went wrong, so every line here is one JSON object with a stable
 * shape, and every option is redacted at the boundary rather than at each call
 * site.
 *
 * Never logged: secrets, raw cookies, raw email addresses, reader IPs. If a value
 * is sensitive, pass it through `redact()` or do not pass it.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogFields {
  /** Dotted event name, e.g. "pipeline.publish" or "media.upload.failed". */
  event: string;
  /** Correlation id for one request/job. */
  requestId?: string;
  route?: string;
  status?: number;
  ms?: number;
  /** Anything else worth grepping. Redacted by `redact()`. */
  [key: string]: unknown;
}

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function threshold(): number {
  const raw = (process.env.LOG_LEVEL ?? "").toLowerCase();
  return LEVEL_ORDER[(raw as LogLevel) in LEVEL_ORDER ? (raw as LogLevel) : "info"];
}

/**
 * Strip the identifiers a log has no business carrying. Applied to nested
 * objects too, because the interesting one is usually one level down.
 */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[depth]";
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redact(v, depth + 1));

  const SENSITIVE = /^(password|secret|token|authorization|cookie|api_key|apikey|dsn|key|private_key)$/i;
  const out: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE.test(key)) {
      out[key] = "[redacted]";
      continue;
    }
    // An email is a person; log the domain-shaped shape, not the address.
    if ((key === "email" || key.endsWith("_email")) && typeof inner === "string") {
      const [, domain] = inner.split("@");
      out[key] = domain ? `***@${domain}` : "[redacted]";
      continue;
    }
    if ((key === "ip" || key === "ip_address" || key === "ipHash") && typeof inner === "string") {
      out[key] = "[redacted]";
      continue;
    }
    out[key] = redact(inner, depth + 1);
  }
  return out;
}

export function log(level: LogLevel, fields: LogFields): void {
  if (LEVEL_ORDER[level] < threshold()) return;
  const line = {
    ts: new Date().toISOString(),
    level,
    ...(redact(fields) as Record<string, unknown>),
  };
  // One line, so `grep '"level":"error"'` is a query and not a parsing project.
  const text = JSON.stringify(line);
  if (level === "error") console.error(text);
  else if (level === "warn") console.warn(text);
  else console.log(text);
}

export const logInfo = (fields: LogFields): void => log("info", fields);
export const logWarn = (fields: LogFields): void => log("warn", fields);
export const logError = (fields: LogFields): void => log("error", fields);

/** Short correlation id for one request. */
export function requestId(): string {
  return Math.random().toString(36).slice(2, 10);
}
