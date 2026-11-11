/**
 * Regression: one broken image provider must not abort the whole chain.
 *
 * Real-world case that motivated this: an operator saved a *chat* model with
 * `purpose = image` ("free/mimo-v2.6-pro" behind a custom gateway). Its
 * `/images/generations` call 404s, which surfaced as a `bad_output`
 * ProviderError, and the resolver used to `break` on that — so the working
 * providers further down the chain were never tried and generation always
 * failed. The chain must record the reason and keep going.
 */
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";

const DB = path.join(process.cwd(), ".tmp-image-chain-test.db");

async function removeTestFiles(): Promise<void> {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    try {
      fs.rmSync(`${DB}${suffix}`, { force: true });
    } catch {
      /* best effort on Windows */
    }
  }
}

await removeTestFiles();
process.env.TURSO_DATABASE_URL = `file:${DB}`;
process.env.TURSO_AUTH_TOKEN = "local";

const { getClient, nowIso } = await import("@hoichoi/db");
const { generateImage } = await import("../index");

const client = getClient();
const now = nowIso();
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const insert = async (id: string, priority: number, model: string, baseUrl: string) => {
  await client.execute({
    sql: `INSERT INTO llm_providers
      (id, provider_key, display_name, base_url, model_name, api_key_env_var,
       priority, is_active, is_free_tier, supports_rewrite, supports_embeddings, purpose, created_at, updated_at)
      VALUES (?, 'custom', ?, ?, ?, 'IMAGE_CHAIN_TEST_KEY', ?, 1, 1, 0, 0, 'image', ?, ?)`,
    args: [id, id, baseUrl, model, priority, now, now],
  });
};

process.env.IMAGE_CHAIN_TEST_KEY = "test-key";

await client.execute(
  `CREATE TABLE IF NOT EXISTS llm_providers (
     id TEXT PRIMARY KEY, provider_key TEXT NOT NULL, display_name TEXT NOT NULL,
     base_url TEXT, model_name TEXT NOT NULL, api_key_env_var TEXT NOT NULL,
     priority INTEGER NOT NULL DEFAULT 100, is_active INTEGER NOT NULL DEFAULT 1,
     is_free_tier INTEGER NOT NULL DEFAULT 0, supports_rewrite INTEGER NOT NULL DEFAULT 1,
     supports_embeddings INTEGER NOT NULL DEFAULT 0, purpose TEXT NOT NULL DEFAULT 'text',
     last_ok_at TEXT, last_error_at TEXT, error_count INTEGER NOT NULL DEFAULT 0,
     created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
);
// Broken first: a chat gateway with no image endpoint (404 → bad_output).
await insert("broken-chat-row", 1, "free/mimo-v2.6-pro", "https://api.example-chat.test");
// Working second: the keyless classic Pollinations host.
await insert("working-image-row", 2, "flux", "https://image.pollinations.ai");

const originalFetch = globalThis.fetch;
const calls: string[] = [];
try {
  globalThis.fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("example-chat.test")) {
      return new Response("not found", { status: 404 });
    }
    return new Response(png, { headers: { "content-type": "image/png" } });
  };
  const result = await generateImage({ prompt: "A calm river", size: "512x512" });
  assert.equal(result.provider, "working-image-row", "the working provider must still be tried");
  assert.deepEqual(Buffer.from(result.bytes), png);
  assert.ok(
    calls.some((u) => u.includes("example-chat.test")),
    "the broken provider should have been attempted first",
  );
  assert.ok(
    calls.some((u) => u.includes("image.pollinations.ai")),
    "the chain must continue after a bad_output failure",
  );
  assert.match(calls.at(-1) ?? "", /width=512&height=512|height=512&width=512/);
  // A *pinned* provider is a preference, not a filter. Pinning the broken row
  // used to shrink the candidate list to that row alone, so a quota/429 on the
  // chosen provider failed the request while the next row was healthy — the
  // exact mismatch between the web editor (pins a row) and the desktop (pins
  // nothing) reported by operators.
  const pinned = await generateImage({ prompt: "A calm river", size: "512x512", providerId: "broken-chat-row" });
  assert.equal(pinned.provider, "working-image-row", "a failing pinned provider must fall through");
  assert.ok(
    calls.some((u) => u.includes("example-chat.test")),
    "the pinned provider should still be tried first",
  );
  console.log("image-chain: broken provider no longer aborts the fallback chain");
  console.log("image-chain: failing pinned provider falls through to the rest of the chain");
} finally {
  globalThis.fetch = originalFetch;
  await client.close();
  await removeTestFiles();
}
