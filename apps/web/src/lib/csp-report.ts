/**
 * CSP violation reports.
 *
 * The browser posts two different shapes: the legacy `application/csp-report`
 * (`{"csp-report": {...}}`) and the Reporting API (`[{...}]`). Both arrive
 * unauthenticated from any origin a reader happens to be on, so everything here
 * treats the body as hostile: a size cap, a shape check, and hard length limits
 * on every field before anything is logged.
 */

export interface CspViolation {
  directive: string;
  blockedUri: string;
  documentUri: string;
  sourceFile: string;
  line: number | null;
}

/** Big enough for a real report, small enough that a flood cannot fill a log. */
export const MAX_REPORT_BYTES = 8 * 1024;
export const MAX_REPORTS = 20;

const clip = (value: unknown, max = 200): string => {
  if (typeof value !== "string") return "";
  // Strip control characters so a crafted value cannot forge log lines.
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, max);
};

function normalize(raw: Record<string, unknown>): CspViolation {
  const line = Number(raw["line-number"] ?? raw.lineNumber);
  return {
    directive: clip(raw["effective-directive"] ?? raw.effectiveDirective ?? raw["violated-directive"]),
    blockedUri: clip(raw["blocked-uri"] ?? raw.blockedURL ?? raw.blockedUri),
    documentUri: clip(raw["document-uri"] ?? raw.documentURL ?? raw.documentUri),
    sourceFile: clip(raw["source-file"] ?? raw.sourceFile),
    line: Number.isFinite(line) && line > 0 ? Math.trunc(line) : null,
  };
}

/**
 * Parse a report body. Returns an empty array for anything unrecognisable
 * instead of throwing: this endpoint is public, and a 500 here is a free
 * error-log amplifier.
 */
export function parseReports(contentType: string, raw: string): CspViolation[] {
  if (!raw || raw.length > MAX_REPORT_BYTES) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  const entries: unknown[] = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && "csp-report" in parsed
      ? [(parsed as { "csp-report": unknown })["csp-report"]]
      : [parsed];

  const out: CspViolation[] = [];
  for (const entry of entries.slice(0, MAX_REPORTS)) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    // Reporting API wraps the payload in `body`.
    const body =
      record.body && typeof record.body === "object"
        ? (record.body as Record<string, unknown>)
        : record;
    const violation = normalize(body);
    if (!violation.directive && !violation.blockedUri) continue;
    out.push(violation);
  }
  return out;
}

/** One line per violation, for the platform log. */
export function formatReports(reports: CspViolation[]): string[] {
  return reports.map(
    (r) =>
      `[csp] ${r.directive || "unknown"} blocked ${r.blockedUri || "?"}` +
      ` on ${r.documentUri || "?"}` +
      (r.sourceFile ? ` from ${r.sourceFile}:${r.line ?? 0}` : ""),
  );
}
