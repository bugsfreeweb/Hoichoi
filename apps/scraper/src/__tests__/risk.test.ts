import assert from "node:assert/strict";
import { assessRisk } from "../pipeline";

/**
 * Moderation routing.
 *
 * The old rule sent everything from a flagged category to the queue, so a
 * high-volume notice page generated hundreds of manual reviews while genuinely
 * dangerous posts received no extra distinction. These tests pin the tiered
 * policy: routine notices publish, sensitive claims are reviewed, and anything
 * involving a minor always stops regardless of how the category is configured.
 */

const OPEN: { auto_pending_review: boolean; requires_double_approval: boolean } = {
  auto_pending_review: false,
  requires_double_approval: false,
};
const REVIEW: typeof OPEN = { auto_pending_review: true, requires_double_approval: false };
const DOUBLE: typeof OPEN = { auto_pending_review: true, requires_double_approval: true };

/** The default: a plain notice with no flags publishes without a human. */
assert.deepEqual(assessRisk(OPEN, []), { tier: "routine", status: "published" });

/** An unverified claim is held for review even in an open category. */
assert.deepEqual(assessRisk(OPEN, ["unverified_claim"]), {
  tier: "sensitive",
  status: "pending_review",
});

/** Anything involving a minor is critical, whatever the category says. */
for (const flag of ["minor_involved", "graphic_content", "needs_double_approval"]) {
  const r = assessRisk(OPEN, [flag]);
  assert.equal(r.tier, "critical", `${flag} must be critical`);
  assert.equal(r.status, "pending_review", `${flag} must never auto-publish`);
}

/** Critical outranks sensitive when both appear. */
assert.equal(assessRisk(OPEN, ["unverified_claim", "minor_involved"]).tier, "critical");

/** Category defaults still apply to unflagged content. */
assert.equal(assessRisk(REVIEW, []).status, "pending_review");
assert.equal(assessRisk(REVIEW, []).tier, "sensitive");
assert.equal(assessRisk(DOUBLE, []).tier, "critical");

/**
 * A flag must not be defeated by a permissive category. This is the direction
 * that matters: misrouting to review is recoverable, auto-publishing a report
 * about a child is not.
 */
assert.equal(assessRisk(OPEN, ["minor_involved"]).status, "pending_review");

/** Unknown flags are ignored rather than escalating on a typo. */
assert.equal(assessRisk(OPEN, ["some_future_flag"]).tier, "routine");

console.log("[test] risk assessment checks passed");
