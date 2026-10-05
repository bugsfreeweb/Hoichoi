import assert from "node:assert/strict";
import { nextCronSlots, parseCron, PIPELINE_CRON } from "../src/lib/cron";

/**
 * The dashboard's schedule card used to say the next run was "last run + 2h".
 * The real schedule is the pipeline's even-hour cron in UTC (see PIPELINE_CRON),
 * so those labels were wrong by up to ~an hour and drifted whenever a run started
 * late or failed. These pin the real cron arithmetic.
 */

let passed = 0;
async function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

await check("parses the pipeline's real cron into even hours at :17", () => {
  const spec = parseCron(PIPELINE_CRON);
  assert.ok(spec);
  assert.equal(spec.minute, 17);
  assert.deepEqual(spec.hours, [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]);
});

await check("the next slots match the workflow, not the last run's start", () => {
  // The real pipeline run started at 00:53 UTC. "Last run + 2h" would have said
  // 02:53; the scheduler says 02:17.
  const from = new Date("2026-10-05T00:53:12Z");
  const slots = nextCronSlots(PIPELINE_CRON, from, 3).map((d) => d.toISOString());
  assert.deepEqual(slots, [
    "2026-10-05T02:17:00.000Z",
    "2026-10-05T04:17:00.000Z",
    "2026-10-05T06:17:00.000Z",
  ]);
});

await check("a run that started before the minute still reports the coming one", () => {
  const from = new Date("2026-10-05T00:05:00Z");
  const slots = nextCronSlots(PIPELINE_CRON, from, 1).map((d) => d.toISOString());
  // 00:17 has not happened yet, so it is still upcoming.
  assert.deepEqual(slots, ["2026-10-05T00:17:00.000Z"]);
});

await check("exactly on the fire minute does not re-report the same instant", () => {
  const from = new Date("2026-10-05T02:17:00Z");
  const slots = nextCronSlots(PIPELINE_CRON, from, 1).map((d) => d.toISOString());
  assert.deepEqual(slots, ["2026-10-05T04:17:00.000Z"]);
});

await check("every slot is strictly in the future", () => {
  const from = new Date("2026-10-05T13:37:59Z");
  for (const d of nextCronSlots(PIPELINE_CRON, from, 3)) {
    assert.ok(d.getTime() > from.getTime(), `${d.toISOString()} should be after ${from.toISOString()}`);
  }
});

await check("crosses a day and month boundary without skipping a slot", () => {
  const from = new Date("2026-10-05T22:40:00Z");
  const slots = nextCronSlots(PIPELINE_CRON, from, 3).map((d) => d.toISOString());
  assert.deepEqual(slots, [
    "2026-10-06T00:17:00.000Z",
    "2026-10-06T02:17:00.000Z",
    "2026-10-06T04:17:00.000Z",
  ]);
});

/**
 * A schedule the parser does not understand must produce no slots, not a guess.
 * Showing a confident wrong time is the exact failure this replaced.
 */
await check("an unsupported expression yields no slots instead of a guess", () => {
  assert.equal(parseCron("0 9 * * 1-5"), null);
  assert.equal(parseCron("*/5 * * * *"), null);
  assert.equal(parseCron("70 */2 * * *"), null);
  assert.equal(parseCron("17 25 * * *"), null);
  assert.equal(parseCron("nonsense"), null);
  assert.deepEqual(nextCronSlots("0 9 * * 1-5", new Date("2026-10-05T00:00:00Z"), 3), []);
});

await check("an explicit hour list is accepted", () => {
  const spec = parseCron("5 3,15 * * *");
  assert.ok(spec);
  assert.equal(spec.minute, 5);
  assert.deepEqual(spec.hours, [3, 15]);
  const slots = nextCronSlots("5 3,15 * * *", new Date("2026-10-05T04:00:00Z"), 2).map((d) => d.toISOString());
  assert.deepEqual(slots, ["2026-10-05T15:05:00.000Z", "2026-10-06T03:05:00.000Z"]);
});

/** An hourly schedule must still return exactly the requested number of slots. */
await check("an hourly cadence returns the full requested count", () => {
  const slots = nextCronSlots("0 * * * *", new Date("2026-10-05T00:30:00Z"), 5);
  assert.equal(slots.length, 5);
  assert.deepEqual(slots.map((d) => d.toISOString()), [
    "2026-10-05T01:00:00.000Z",
    "2026-10-05T02:00:00.000Z",
    "2026-10-05T03:00:00.000Z",
    "2026-10-05T04:00:00.000Z",
    "2026-10-05T05:00:00.000Z",
  ]);
});

console.log(`\n[web] ${passed} checks passed`);
process.exit(process.exitCode ?? 0);
