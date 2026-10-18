import "server-only";
import { reapStalePipelineRuns } from "@hoichoi/db";

/**
 * Fail pipeline runs a killed worker left stuck on `running`.
 *
 * The pipeline reaps its own stale rows at startup, but when Actions is blocked
 * (billing, or the whole scheduled pipeline being down) nothing runs to clean
 * them up. A row stuck on `running` then *is* "the latest run" as far as the
 * dashboard and the setup guide are concerned, so the automation looks frozen
 * rather than finished-with-an-error.
 *
 * The admin reads that care about run history call this first. It is a single
 * indexed UPDATE and is throttled per warm instance so a polling dashboard
 * cannot hammer the database with it.
 */
let lastAttempt = 0;
const THROTTLE_MS = 5 * 60_000;

export async function reapStaleRuns(): Promise<void> {
  const now = Date.now();
  if (now - lastAttempt < THROTTLE_MS) return;
  lastAttempt = now;
  try {
    await reapStalePipelineRuns(180);
  } catch {
    // Best-effort upkeep: a failed reap must never break the page that asked.
  }
}
