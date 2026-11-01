import assert from "node:assert/strict";
import { sourceSkipReason } from "../pipeline";

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

console.log("[scraper] source eligibility checks pass");
