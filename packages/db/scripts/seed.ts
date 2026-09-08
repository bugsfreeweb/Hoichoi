import { getClient, nowIso } from "../src/client";
import { seedDefaults } from "../src/seed";

/**
 * Seed base configuration: categories, default LLM providers, settings,
 * redaction blocklist, and one bootstrapped admin user.
 * Idempotent — safe to run repeatedly.
 */
async function main() {
  const client = getClient();
  const now = nowIso();
  const seeded = await seedDefaults(client, now);
  console.log(seeded ? "hoichoi:db · seed applied" : "hoichoi:db · already seeded");
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});