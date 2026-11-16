/**
 * Lighthouse budgets.
 *
 * The numbers are chosen to fail on a regression that a reader would feel, and
 * not to fail on a cold CI runner having a slow afternoon:
 *
 * - accessibility is the one hard gate: a violation is a defect, not weather.
 * - CLS is an error at 0.1 because layout shift is entirely within our control.
 * - LCP and TBT are warnings: a shared runner's CPU is not a product decision,
 *   so they are printed for a human instead of blocking a merge.
 * - performance score is a warning for the same reason.
 *
 * Runs against the production build (`next start`), not `next dev`.
 */
module.exports = {
  ci: {
    collect: {
      // Public routes only: the console is behind auth and is covered by
      // scripts/a11y.ts instead.
      url: ["http://localhost:3070/", "http://localhost:3070/poll", "http://localhost:3070/about"],
      numberOfRuns: 1,
      settings: {
        // Throttling is the point of measuring; without it every score is 100.
        throttlingMethod: "simulate",
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
        // The report itself must not be blocked by something we cannot fix in CI.
        skipAudits: ["uses-http2", "canonical"],
      },
    },
    assert: {
      assertions: {
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "largest-contentful-paint": ["warn", { maxNumericValue: 4000 }],
        "total-blocking-time": ["warn", { maxNumericValue: 600 }],
        "categories:performance": ["warn", { minScore: 0.7 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
