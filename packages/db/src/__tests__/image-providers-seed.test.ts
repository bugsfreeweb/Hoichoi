/**
 * Image generation must work on a freshly-created database.
 *
 * The bug this guards: `ensureRuntimeProviders` seeded only text providers, so
 * `SELECT ... WHERE purpose = 'image'` returned zero rows on every DB. Both the
 * manual generator (web admin + desktop) and the pipeline's automatic AI hero
 * therefore failed with "no active image provider", even when every API key was
 * present. Supabase/Turso content and keys were never the problem.
 */
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";

const DB = path.join(process.cwd(), ".tmp-image-providers-seed-test.db");

async function removeTestFiles(): Promise<void> {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const file = `${DB}${suffix}`;
    for (let attempt = 0; ; attempt += 1) {
      try {
        fs.rmSync(file, { force: true });
        break;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EPERM" || attempt >= 5) throw error;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
  }
}

async function main(): Promise<void> {
  await removeTestFiles();
  process.env.TURSO_DATABASE_URL = `file:${DB}`;
  process.env.TURSO_AUTH_TOKEN = "local";

  const { getClient, ensureSchema, ensureRuntimeProviders, mapProvider } = await import("../index");
  const client = getClient();
  try {
    await ensureSchema(client);
    // ensureSchema is memoized per database; run the seeder again to prove the
    // insert path is idempotent rather than relying on the memo.
    await ensureRuntimeProviders(client);
    await ensureRuntimeProviders(client);

    const res = await client.execute(
      "SELECT * FROM llm_providers WHERE is_active = 1 AND purpose = 'image' ORDER BY priority ASC",
    );
    const rows = res.rows.map((r) => mapProvider(r as Record<string, unknown>));

    assert.ok(rows.length > 0, "a fresh database must ship at least one active image provider");

    const pollinations = rows.find((r) => /pollinations/i.test(String(r.base_url)));
    assert.ok(pollinations, "the keyless Pollinations image provider must be seeded");
    assert.equal(pollinations!.supports_rewrite, false, "image providers must not claim rewrite support");

    const google = rows.find((r) => r.provider_key === "google");
    assert.ok(google, "Google Gemini image (GOOGLE_API_KEY) must be seeded");
    assert.match(String(google!.model_name), /image/i, "Google image row must use an image model");

    const openai = rows.find((r) => r.provider_key === "openai");
    assert.ok(openai, "OpenAI GPT Image (OPENAI_API_KEY) must be seeded");

    // No duplicate rows after repeated seeding.
    const count = await client.execute(
      "SELECT provider_key, model_name, COUNT(*) AS n FROM llm_providers WHERE purpose = 'image' GROUP BY provider_key, model_name",
    );
    for (const row of count.rows) {
      assert.equal(Number(row.n), 1, `duplicate image provider row: ${String(row.provider_key)}`);
    }

    // Text providers stay untouched (no purpose flip, no lost rows).
    const text = await client.execute(
      "SELECT COUNT(*) AS n FROM llm_providers WHERE purpose = 'text'",
    );
    assert.ok(Number(text.rows[0]?.n) >= 5, "text providers must still be seeded");
    console.log(`image-providers-seed: ${rows.length} image provider(s) seeded`);
  } finally {
    await client.close();
    // The libsql file handle can lag a moment on Windows; cleanup is
    // best-effort and must never turn a passing assertion into a failure.
    try {
      await removeTestFiles();
    } catch {
      /* leave the temp file for the next run's pre-clean */
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
