import assert from "node:assert/strict";
import type { LLMProviderRow } from "@hoichoi/shared-types";
import { OpenAICompatProvider } from "../openai-compat";

const row: LLMProviderRow = {
  id: "image-test",
  provider_key: "custom",
  display_name: "Image test",
  base_url: null,
  model_name: "model/test",
  api_key_env_var: "IMAGE_TEST_KEY",
  api_key: null,
  priority: 1,
  is_active: true,
  is_free_tier: false,
  supports_rewrite: false,
  supports_embeddings: false,
  purpose: "image",
  rate_limit_rpm: null,
  config: null,
  last_ok_at: null,
  last_error_at: null,
  error_count: 0,
  created_at: "",
  updated_at: "",
};

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const originalFetch = globalThis.fetch;

try {
  const cloudflareRequests: Array<{ url: string; body: Record<string, unknown> }> = [];
  globalThis.fetch = async (input, init) => {
    cloudflareRequests.push({
      url: String(input),
      body: JSON.parse(String(init?.body)) as Record<string, unknown>,
    });
    return Response.json({ result: { image: png.toString("base64") } });
  };
  const cloudflare = new OpenAICompatProvider({
    row: {
      ...row,
      display_name: "Cloudflare Workers AI",
      base_url: "https://api.cloudflare.com/client/v4/accounts/account123/ai/run",
      model_name: "@cf/black-forest-labs/flux-1-schnell",
    },
    key: "cloudflare-token",
    defaultBaseUrl: "",
  });
  const cloudflareResult = await cloudflare.generateImage({ prompt: "A train station" });
  assert.equal(cloudflareRequests[0]?.url, "https://api.cloudflare.com/client/v4/accounts/account123/ai/run/@cf/black-forest-labs/flux-1-schnell");
  assert.equal(cloudflareRequests[0]?.body.steps, 4);
  assert.deepEqual(Buffer.from(cloudflareResult.bytes), png);
  assert.equal(cloudflareResult.contentType, "image/png");

  const pollinationsRequests: Array<{ url: URL; method: string | undefined; authorization: string | null }> = [];
  globalThis.fetch = async (input, init) => {
    pollinationsRequests.push({
      url: new URL(String(input)),
      method: init?.method,
      authorization: new Headers(init?.headers).get("authorization"),
    });
    return new Response(png, { headers: { "content-type": "image/png" } });
  };
  const pollinations = new OpenAICompatProvider({
    row: { ...row, base_url: "https://gen.pollinations.ai", model_name: "black-forest-labs/flux.1-schnell" },
    key: "pollen-key",
    defaultBaseUrl: "",
  });
  const pollinationsResult = await pollinations.generateImage({ prompt: "A train station" });
  assert.equal(pollinationsRequests[0]?.url.hostname, "gen.pollinations.ai");
  assert.equal(pollinationsRequests[0]?.url.searchParams.get("model"), "black-forest-labs/flux.1-schnell");
  assert.equal(pollinationsRequests[0]?.method, undefined);
  assert.match(pollinationsRequests[0]?.authorization ?? "", /^Bearer .+/);
  assert.deepEqual(Buffer.from(pollinationsResult.bytes), png);

  const togetherRequests: Array<{ url: string; body: Record<string, unknown> }> = [];
  globalThis.fetch = async (input, init) => {
    togetherRequests.push({
      url: String(input),
      body: JSON.parse(String(init?.body)) as Record<string, unknown>,
    });
    return Response.json({ data: [{ b64_json: png.toString("base64") }] });
  };
  const together = new OpenAICompatProvider({
    row: {
      ...row,
      base_url: "https://api.together.ai/v1",
      model_name: "black-forest-labs/FLUX.1-schnell",
    },
    key: "together-key",
    defaultBaseUrl: "",
  });
  await together.generateImage({ prompt: "A train station" });
  assert.equal(togetherRequests[0]?.url, "https://api.together.ai/v1/images/generations");
  assert.equal(togetherRequests[0]?.body.response_format, "base64");
  console.log("[test] Cloudflare, Pollinations, and Together image provider checks passed");
} finally {
  globalThis.fetch = originalFetch;
}
