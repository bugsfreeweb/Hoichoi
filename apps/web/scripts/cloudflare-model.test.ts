/**
 * `400 No route for that URI` is not an auth failure.
 *
 * A Workers AI route is `…/ai/run/@cf/<vendor>/<model>`. A row saved with the
 * short name `flux-1-schnell` was sent to `…/ai/run/flux-1-schnell`, and
 * Cloudflare answered with that 400 — which reads like a broken account or a
 * wrong base URL, and is neither. These checks pin the three places that must
 * agree: the catalogue maps the name, the API refuses to store an unroutable
 * one, and the call itself expands what is already stored.
 */
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CLOUDFLARE_MODEL_PREFIX,
  isCloudflareModel,
  metaFor,
  normalizeCloudflareModel,
  validateProviderSetup,
} from "../../../packages/shared-types/src/provider-catalog";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), "utf8");

let passed = 0;
function check(name: string, fn: () => void): void {
  fn();
  passed++;
}

check("the short names an operator actually types are mapped", () => {
  assert.equal(normalizeCloudflareModel("flux-1-schnell"), "@cf/black-forest-labs/flux-1-schnell");
  assert.equal(normalizeCloudflareModel("  FLUX-1-Schnell "), "@cf/black-forest-labs/flux-1-schnell");
  assert.equal(normalizeCloudflareModel("sdxl"), "@cf/stabilityai/stable-diffusion-xl-base-1.0");
});

check("a full id is left exactly as it is", () => {
  const id = "@cf/black-forest-labs/flux-1-schnell";
  assert.equal(normalizeCloudflareModel(id), id);
  assert.equal(isCloudflareModel(id), true);
});

check("a vendor path without the prefix is completed, a bare word is refused", () => {
  assert.equal(normalizeCloudflareModel("black-forest-labs/flux-1-schnell"), "@cf/black-forest-labs/flux-1-schnell");
  assert.equal(normalizeCloudflareModel("nonsense"), null);
  assert.equal(normalizeCloudflareModel(""), null);
  assert.equal(normalizeCloudflareModel(null), null);
});

check("a full URL pasted into the model box is not treated as a model id", () => {
  assert.equal(
    normalizeCloudflareModel("https://api.cloudflare.com/client/v4/accounts/x/ai/run/@cf/black-forest-labs/flux-1-schnell"),
    "@cf/black-forest-labs/flux-1-schnell",
  );
});

check("setup refuses an unroutable model before the call is made", () => {
  const accountId = "0123456789abcdef0123456789abcdef";
  const bad = validateProviderSetup({ providerKey: "cloudflare", accountId, model: "flux" });
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.match(bad.errorBn, /Cloudflare-এ/);
  const good = validateProviderSetup({
    providerKey: "cloudflare",
    accountId,
    model: "@cf/black-forest-labs/flux-1-schnell",
  });
  assert.equal(good.ok, true);
  // The image list in the catalogue is what the console offers, so it must route.
  for (const model of metaFor("cloudflare").models.image) {
    assert.ok(model.startsWith(CLOUDFLARE_MODEL_PREFIX), `${model} is a full id`);
  }
});

check("the API stores a routable id and refuses one it cannot route", () => {
  const route = read("apps/web/src/app/api/providers/route.ts");
  assert.match(route, /normalizeCloudflareModel\(body\.modelName\)/);
  assert.match(route, /নামে কোনো মডেল নেই/);
  // The insert must use the normalised value, not the raw body field.
  const insert = route.slice(route.indexOf("INSERT INTO llm_providers"));
  assert.match(insert.slice(0, 1400), /modelName,/);
  assert.ok(!/body\.modelName,/.test(insert.slice(0, 1400)));
});

check("the call expands what an existing row already stores", () => {
  const provider = read("packages/llm/src/openai-compat.ts");
  assert.match(provider, /const routed = normalizeCloudflareModel\(model\);/);
  assert.match(provider, /const modelPath = routed\s*\.split\("\/"\)/);
});

console.log(`\n[web] cloudflare model: ${passed} checks passed`);
