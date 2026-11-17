/**
 * A provider's refusal has to be readable, and a seeded URL has to be fillable.
 *
 * Two measured failures, both rendered raw inside the admin panel:
 *   ছবি তৈরি ব্যর্থ [Cloudflare …: 404 {"result":null,"success":false,"errors":
 *   [{"code":7003,"message":"Could not route to /client/v4/accounts/ACCOUNT_ID/ai/run/…"}]}]
 *   শেষ ত্রুটি: 403 auth error: <!DOCTYPE html> <!--[if lt IE 7]> <html class="no-js ie6 …
 *
 * The first is an operator who pasted a token but left the seeded placeholder in
 * the base URL; the second is a host that answered with a whole HTML interstitial.
 * Neither told the person looking at the screen what to do.
 */
import assert from "node:assert/strict";
import {
  CLOUDFLARE_ACCOUNT_ENV,
  buildProvider,
  hasAccountPlaceholder,
  resolveAccountPlaceholder,
  summarizeProviderError,
} from "../index";
import type { LLMProviderRow } from "@hoichoi/shared-types";

let passed = 0;
async function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  await fn();
  passed++;
  console.log(`  ok ${name}`);
}

const CF_404 =
  '{"result":null,"success":false,"errors":[{"code":7003,"message":"Could not route to /client/v4/accounts/ACCOUNT_ID/ai/run/@cf/black-forest-labs/flux-1-schnell, perhaps your object identifier is invalid?"}],"messages":[]}';
const CF_HTML =
  '<!DOCTYPE html>\n<html class="no-js ie6 oldie" lang="en-US">\n<head><title>Attention Required! | Cloudflare</title></head><body>blah blah</body></html>';

await check("a Cloudflare placeholder 404 names the placeholder, not the JSON", () => {
  const msg = summarizeProviderError(404, CF_404);
  assert.match(msg, /ACCOUNT_ID/, "the operator must be told which value is missing");
  assert.match(msg, /Cloudflare/, "and by whom");
  assert.ok(!msg.includes('{"'), "raw JSON must not reach the screen");
  assert.ok(!msg.includes("success"), "nor its internals");
});

await check("an HTML interstitial becomes one short line", () => {
  const msg = summarizeProviderError(403, CF_HTML);
  assert.match(msg, /HTML/, "the shape of the answer must be named");
  assert.match(msg, /Attention Required/, "its title is the only useful part");
  assert.ok(!msg.includes("<!DOCTYPE"), "no markup");
  assert.ok(!msg.includes("class="), "no markup attributes");
  assert.ok(msg.length < 300, `message must stay short (was ${msg.length})`);
});

await check("a JSON message is preferred over the raw body", () => {
  const msg = summarizeProviderError(429, '{"error":{"message":"You exceeded your current quota"}}');
  assert.match(msg, /rate limited/);
  assert.match(msg, /exceeded your current quota/);
  assert.ok(!msg.includes("{"));
});

await check("a long body is clamped, never dumped", () => {
  const msg = summarizeProviderError(500, "x".repeat(4000));
  assert.ok(msg.length < 260, `was ${msg.length}`);
  assert.match(msg, /…$/, "a clamp is visible");
});

await check("an empty body still says what the status means", () => {
  const msg = summarizeProviderError(401, "");
  assert.match(msg, /^401 auth error/);
  assert.match(msg, /কী প্রত্যাখ্যাত/, "the hint is the whole message when there is no body");
  assert.equal(summarizeProviderError(503, "").startsWith("503 server error"), true);
});

await check("solve the account placeholder from the environment", () => {
  const url = "https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID/ai/run/@cf/black-forest-labs/flux-1-schnell";
  assert.ok(hasAccountPlaceholder(url));
  assert.equal(hasAccountPlaceholder("https://api.cloudflare.com/client/v4/accounts/0123/ai/run/x"), false);
  assert.equal(hasAccountPlaceholder("https://api.example.com/ACCOUNT_IDEAS"), false, "a longer word is not the placeholder");

  const filled = resolveAccountPlaceholder(url, {
    [CLOUDFLARE_ACCOUNT_ENV]: "0123456789abcdef0123456789abcdef",
  });
  assert.ok(!hasAccountPlaceholder(filled), "the placeholder must be gone");
  assert.match(filled, /\/accounts\/0123456789abcdef0123456789abcdef\/ai\/run\//);

  assert.equal(resolveAccountPlaceholder(url, {}), url, "no env means no change");
  assert.equal(
    resolveAccountPlaceholder(url, { [CLOUDFLARE_ACCOUNT_ENV]: "not-hex" }),
    url,
    "a malformed id must not be pasted into a URL",
  );
  const other = "https://api.openai.com/v1";
  assert.equal(resolveAccountPlaceholder(other, { [CLOUDFLARE_ACCOUNT_ENV]: "x" }), other);
});

await check("an unfilled placeholder refuses the call with instructions", async () => {
  const row: LLMProviderRow = {
    id: "prov-cloudflare-image",
    provider_key: "custom",
    display_name: "Cloudflare Workers AI",
    base_url:
      "https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID/ai/run/@cf/black-forest-labs/flux-1-schnell",
    model_name: "@cf/black-forest-labs/flux-1-schnell",
    api_key_env_var: "CLOUDFLARE_API_TOKEN",
    priority: 10,
    is_active: true,
    is_free_tier: true,
    supports_rewrite: false,
    supports_embeddings: false,
    purpose: "image",
    created_at: "",
    updated_at: "",
  } as LLMProviderRow;
  delete process.env[CLOUDFLARE_ACCOUNT_ENV];
  const provider = buildProvider(row, () => "test-token");
  await assert.rejects(
    () => provider.generateImage!({ prompt: "a hand and an envelope" }),
    (err: Error) => {
      assert.equal((err as { kind?: string }).kind, "auth", "it is a configuration error, not a network one");
      assert.match(err.message, /ACCOUNT_ID/);
      assert.match(err.message, /CLOUDFLARE_ACCOUNT_ID/);
      return true;
    },
  );
});

console.log(`\nprovider-errors: ${passed} checks passed`);
