import assert from "node:assert/strict";
import { parsePipelineLimit, pipelineFinalStatus, sourceSkipReason } from "../pipeline";

const base = {
  id: "source-1",
  page_name: "News desk",
  page_url: "https://example.com/feed.xml",
};

assert.equal(sourceSkipReason({ ...base, platform: "news" }), null);
assert.equal(sourceSkipReason({ ...base, platform: "magazine" }), null);
assert.equal(sourceSkipReason({ ...base, platform: "facebook" }), null);
assert.equal(sourceSkipReason({ ...base, page_url: null, platform: "news" }), "missing source URL");
assert.equal(sourceSkipReason({ ...base, page_url: "null", platform: "facebook" }), "missing source URL");
assert.equal(sourceSkipReason({ ...base, page_url: "ftp://example.com/feed.xml", platform: "news" }), "source URL must use http or https");
assert.equal(sourceSkipReason({ ...base, page_url: "not a URL", platform: "news" }), "invalid source URL");
assert.equal(sourceSkipReason({ ...base, platform: "social" }), "unsupported platform (social)");

assert.equal(parsePipelineLimit(undefined, "MAX_SOURCES_PER_RUN"), undefined);
assert.equal(parsePipelineLimit("", "MAX_SOURCES_PER_RUN"), undefined);
assert.equal(parsePipelineLimit("12", "MAX_SOURCES_PER_RUN"), 12);
assert.throws(() => parsePipelineLimit("0", "MAX_SOURCES_PER_RUN"), /positive whole number/);
assert.throws(() => parsePipelineLimit("many", "MAX_SOURCES_PER_RUN"), /positive whole number/);

const runStatus = (overrides: Partial<Parameters<typeof pipelineFinalStatus>[0]> = {}) =>
  pipelineFinalStatus({
    sources: 2,
    sourcesFailed: 0,
    sourcesSkipped: 0,
    rewritten: 0,
    errors: [],
    ...overrides,
  });
assert.equal(runStatus({ errors: ["[rewrite] Desk: provider unavailable"] }), "failed");
assert.equal(runStatus({ rewritten: 1, errors: ["[rewrite] Desk: one post failed"] }), "completed");
assert.equal(runStatus({ sources: 2, sourcesFailed: 2 }), "failed");
assert.equal(runStatus({ sources: 0, sourcesSkipped: 2 }), "failed");
assert.equal(runStatus(), "completed");

console.log("[scraper] source eligibility checks pass");
