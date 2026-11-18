/**
 * A second Cloudflare account was a hand-typed URL, and it broke.
 *
 * Cloudflare Workers AI has been the default image provider, but the "add a
 * provider" form never listed it: an operator who wanted a second account (a
 * second daily quota) had to choose "custom" and compose
 * `…/accounts/<32 hex>/ai/run/@cf/black-forest-labs/flux-1-schnell` by hand. A
 * typo there saves silently and only surfaces as a 7003 on the first render.
 *
 * The fix is that a provider now *declares* its fields, so selecting Cloudflare
 * asks for an account ID and a token and the URL is composed. These checks pin
 * the four things that make that true:
 *
 *   1. Cloudflare is a first-class provider key with a catalogue entry;
 *   2. the field set is declared per provider (account id + token + composed
 *      URL for Cloudflare, no token at all for Ollama);
 *   3. the base URL is composed and validated in one place the form and the API
 *      both call, so the browser cannot save what the server would refuse;
 *   4. a broken row is named before it costs a round trip.
 */
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import {
  PROVIDER_META,
  PROVIDERS_GUIDE,
  composeCloudflareBaseUrl,
  providerFields,
  validateProviderSetup,
} from "../../../packages/shared-types/src/provider-catalog";
import { PROCESSOR_ENV_DEFAULTS } from "../../../packages/shared-types/src/index";

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string): string => fs.readFileSync(path.join(APP, rel), "utf8");

/** Comments stripped: a comment may describe behaviour the code does not have. */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

let passed = 0;
function check(name: string, fn: () => void): void {
  fn();
  passed++;
}

const ACCOUNT = "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d";

const form = code(read("src/components/admin/ProviderForm.tsx"));
const post = code(read("src/app/api/providers/route.ts"));
const test = code(read("src/app/api/providers/test/route.ts"));

check("cloudflare is a real provider key, not a custom row", () => {
  const meta = PROVIDER_META.find((p) => p.key === "cloudflare");
  assert.ok(meta, "the catalogue lists Cloudflare");
  assert.equal(PROCESSOR_ENV_DEFAULTS.cloudflare, "CLOUDFLARE_API_TOKEN");
  assert.ok(meta!.kinds.includes("image"), "Cloudflare does image work");
  assert.ok(
    meta!.models.image.some((m) => m.includes("flux-1-schnell")),
    "the model the seeded row uses is offered as a suggestion",
  );
  // The template still carries the placeholder; the form is what fills it.
  assert.match(meta!.baseUrl, /\/accounts\/ACCOUNT_ID\/ai\/run$/);
});

check("the account id is a field, and the URL is not one", () => {
  const fields = providerFields("cloudflare");
  const account = fields.find((f) => f.key === "accountId");
  const base = fields.find((f) => f.key === "baseUrl");
  assert.ok(account?.required, "an account id is required");
  assert.ok(base?.composed, "the base URL is derived, not typed");
  assert.ok(fields.some((f) => f.key === "apiToken" && f.secret), "the token is a password box");
  // Order matters: the account id is the thing you have to go and find.
  assert.equal(fields[0]?.key, "accountId");
});

check("a provider with no key is not asked for one", () => {
  const ollama = providerFields("ollama");
  assert.equal(ollama.length, 1);
  assert.equal(ollama[0]?.key, "baseUrl");
  assert.ok(!ollama.some((f) => f.key === "apiToken"), "Ollama needs no API key");
  // Everyone else gets a key box.
  assert.ok(providerFields("openai").some((f) => f.key === "apiToken"));
});

check("the composed URL is built from a validated account id", () => {
  assert.equal(
    composeCloudflareBaseUrl(ACCOUNT),
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/ai/run`,
  );
  assert.equal(composeCloudflareBaseUrl(`  ${ACCOUNT.toUpperCase()}  `), `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT.toUpperCase()}/ai/run`);
  // Not 32 hex → no URL at all, rather than a URL that 7003s later.
  for (const bad of ["", "ACCOUNT_ID", "12345", "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6x", "xyz".repeat(11)]) {
    assert.equal(composeCloudflareBaseUrl(bad), "", `refuses ${JSON.stringify(bad)}`);
  }
});

check("validation speaks Bangla and names the missing value", () => {
  const bad = validateProviderSetup({ providerKey: "cloudflare", accountId: "nope" });
  assert.equal(bad.ok, false);
  assert.match(!bad.ok ? bad.errorBn : "", /account ID/);
  const good = validateProviderSetup({ providerKey: "cloudflare", accountId: ACCOUNT });
  assert.equal(good.ok, true);
  const noUrl = validateProviderSetup({ providerKey: "custom", baseUrl: "  " });
  assert.equal(noUrl.ok, false);
});

check("the server composes the URL, it does not trust the browser", () => {
  assert.match(post, /composeCloudflareBaseUrl\(body\.accountId/, "the API composes from accountId");
  assert.match(post, /baseUrl = composed/, "the composed URL is what gets stored");
  assert.match(post, /validateProviderSetup\(/, "the API re-runs the same validation");
  // The key list is derived from the catalogue, so Cloudflare cannot be in one
  // list and missing from the other again.
  assert.match(post, /PROVIDER_META\.map\(\(p\) => p\.key\)/);
});

check("the form shows the declared fields for the chosen provider", () => {
  assert.match(form, /providerFields\(providerKey\)/, "the field set comes from the catalogue");
  assert.match(form, /composeCloudflareBaseUrl\(accountId\)/, "the URL preview is live");
  assert.match(form, /composedBaseUrl \|\| "account ID দিলে এখানে URL তৈরি হবে"/, "an empty id says what to do");
  // No second, contradictory base-URL box in "advanced" — one place to look.
  assert.equal((form.match(/placeholder="খালি রাখলে ডিফল্ট"/g) ?? []).length, 0);
});

check("a broken row is named before it costs a round trip", () => {
  assert.match(test, /hasAccountPlaceholder\(row\.base_url\)/, "the placeholder is caught locally");
  assert.match(test, /CLOUDFLARE_ACCOUNT_ENV/, "the message names the env var too");
  assert.match(test, /কোনো API টোকেন নেই/, "a missing token is said in Bangla, not inferred from a 401");
});

check("the setup guide and the form tell the same story", () => {
  assert.equal(PROVIDERS_GUIDE.length, 3);
  assert.ok(
    PROVIDERS_GUIDE.some((g) => g.bn.includes("flux-1-schnell")),
    "the model named in the guide is a real suggestion",
  );
});

console.log(`\n[web] provider setup: ${passed} checks passed`);
