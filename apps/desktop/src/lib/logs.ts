export interface LogLine {
  ts: string;
  stage: string;
  message: string;
  level: "ok" | "warn" | "err" | "info";
}

/**
 * Turn a raw runner line (e.g. "[fetcher] 2 new posts") into the mockup's
 * log-row shape. Timestamps are stamped on arrival since runner lines are
 * plain text.
 */
export function parseLogLine(line: string, ts = new Date().toISOString()): LogLine {
  const trimmed = line.trim();
  let message = trimmed;
  let stage = "DESK";
  const bracket = trimmed.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (bracket) {
    stage = bracket[1].toUpperCase();
    message = bracket[2] || bracket[1];
  }
  const lower = trimmed.toLowerCase();
  let level: LogLine["level"] = "info";
  if (
    lower.includes("error") ||
    lower.includes("fail") ||
    lower.includes("fatal") ||
    lower.includes("exception") ||
    lower.includes("✗")
  ) {
    level = "err";
  } else if (
    lower.includes("warn") ||
    lower.includes("dup") ||
    lower.includes("block") ||
    lower.includes("skip") ||
    lower.includes("retry")
  ) {
    level = "warn";
  } else if (
    lower.includes("done") ||
    lower.includes("✓") ||
    lower.includes("success") ||
    lower.includes("commit") ||
    lower.includes("ready") ||
    lower.includes("saved") ||
    lower.includes("published")
  ) {
    level = "ok";
  }
  return { ts, stage, message, level };
}