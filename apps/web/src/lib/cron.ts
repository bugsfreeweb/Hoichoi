/**
 * Minimal cron arithmetic for the pipeline schedule.
 *
 * The dashboard used to label its next-run times by adding 2h to the last run's
 * start, which is wrong in two ways: a run that started at 00:53 (as the real
 * one did) implies 02:53 next, while the workflow actually fires at minute 17 of
 * every even hour; and if the last run failed early the derived times drift with
 * the failure. Both make the console promise times the scheduler will not honour.
 *
 * Only the subset the pipeline workflow uses is supported - a fixed minute with a
 * stepped hour, every day. Anything else returns no slots rather than guessing,
 * because a wrong "next run at" is worse than saying the schedule is unknown.
 */

export interface CronSpec {
  minute: number;
  /** Hours the schedule fires on, 0-23 ascending. */
  hours: number[];
}

const FIVE_FIELD = /^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)$/;

/**
 * Parses a fixed minute with a stepped hour (plus the equivalent explicit hour
 * list), every day. Day-of-week and day-of-month must be wildcards, since the
 * pipeline runs daily.
 */
export function parseCron(expr: string): CronSpec | null {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const [min, hour, dom, mon, dow] = parts;
  if (dom !== "*" || mon !== "*" || dow !== "*") return null;

  const minute = Number(min);
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;

  const hours: number[] = [];
  const stepMatch = /^\*\/(\d+)$/.exec(hour ?? "");
  if (stepMatch) {
    const step = Number(stepMatch[1]);
    if (step < 1 || step > 24) return null;
    // A stepped hour starts at 0, so a step of 2 fires on even hours.
    for (let h = 0; h < 24; h += step) hours.push(h);
  } else if (hour === "*") {
    // Every hour. Needed for the unit test of an hourly cadence, and harmless:
    // any schedule that reads as "hourly" is still honoured.
    for (let h = 0; h < 24; h++) hours.push(h);
  } else {
    for (const raw of (hour ?? "").split(",")) {
      const h = Number(raw);
      if (!Number.isInteger(h) || h < 0 || h > 23) return null;
      hours.push(h);
    }
  }

  hours.sort((a, b) => a - b);
  return { minute, hours: [...new Set(hours)] };
}

/**
 * Next `count` fire times strictly after `from`, in UTC (the timezone GitHub
 * Actions evaluates cron in). Returns [] for an unsupported expression.
 */
export function nextCronSlots(expr: string, from: Date, count = 3): Date[] {
  const spec = parseCron(expr);
  if (!spec) return [];

  const out: Date[] = [];
  // Step in whole hours rather than minutes: a schedule fires at most once an
  // hour, and scanning 3 slots over a 2-hour cadence needs at most a couple of
  // days of look-ahead.
  const cursor = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), from.getUTCHours(), spec.minute, 0, 0),
  );
  if (cursor.getTime() <= from.getTime()) cursor.setUTCHours(cursor.getUTCHours() + 1);

  // Bounded so a malformed schedule can never spin: 3 days covers any hourly
  // cadence several times over.
  for (let i = 0; i < 72 && out.length < count; i++) {
    if (spec.hours.includes(cursor.getUTCHours())) out.push(new Date(cursor.getTime()));
    cursor.setUTCHours(cursor.getUTCHours() + 1);
  }
  return out;
}

/** Cron expressions are UTC; the console reports times in Dhaka time. */
export const PIPELINE_CRON = "17 */2 * * *";
