import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { CATEGORY_SEED } from "../src/rows";
import { getClient, nowIso } from "../src/client";
const { hashSync } = bcrypt;

/**
 * Seed base configuration: categories, default LLM providers, settings,
 * redaction blocklist, and one bootstrapped admin user.
 */
async function main() {
  const client = getClient();
  const now = nowIso();

  // -- categories -----------------------------------------------------------
  for (const [i, cat] of CATEGORY_SEED.entries()) {
    await client.execute({
      sql: `INSERT OR IGNORE INTO category_configs
        (slug, display_name_bn, display_name_en, description_bn, description_en,
         is_active, sort_order, config, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
      args: [
        cat.slug,
        cat.displayNameBn,
        cat.displayNameEn,
        cat.descriptionBn,
        cat.descriptionEn,
        i + 1,
        JSON.stringify(cat.config),
        now,
        now,
      ],
    });
  }
  console.log("seeded 3 categories");

  // -- default LLM provider presets (ai-provider-strategy.md) --------------
  const providers: Array<{
    key: string;
    name: string;
    model: string;
    env: string;
    priority: number;
    free: boolean;
    rewrite: boolean;
    embed: boolean;
    base?: string;
  }> = [
    { key: "google", name: "Google Gemini 2.0 Flash", model: "gemini-2.0-flash", env: "GOOGLE_API_KEY", priority: 1, free: true, rewrite: true, embed: true },
    { key: "groq", name: "Groq Llama 3.3 70B", model: "llama-3.3-70b-versatile", env: "GROQ_API_KEY", priority: 2, free: true, rewrite: true, embed: false },
    { key: "openrouter", name: "OpenRouter Free", model: "meta-llama/llama-3.3-70b:free", env: "OPENROUTER_API_KEY", priority: 3, free: true, rewrite: true, embed: false },
    { key: "ollama", name: "Ollama (local)", model: "llama3.2", env: "OLLAMA_BASE_URL", priority: 4, free: true, rewrite: true, embed: false, base: "http://localhost:11434/v1" },
  ];
  for (const p of providers) {
    await client.execute({
      sql: `INSERT OR IGNORE INTO llm_providers
        (id, provider_key, display_name, base_url, model_name, api_key_env_var,
         priority, is_active, is_free_tier, supports_rewrite, supports_embeddings,
         created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`,
      args: [
        randomUUID(),
        p.key,
        p.name,
        p.base ?? null,
        p.model,
        p.env,
        p.priority,
        p.free ? 1 : 0,
        p.rewrite ? 1 : 0,
        p.embed ? 1 : 0,
        now,
        now,
      ],
    });
  }
  console.log("seeded 4 default LLM provider presets");

  // -- settings ---------------------------------------------------------------
  await client.execute({
    sql: `INSERT OR IGNORE INTO settings
      (id, pipeline_hours, site_name, contact_email, police_helpline, child_helpline,
       archive_visible_days, archive_retention_days, updated_at)
      VALUES (1, 2, 'হইচই', 'contact@hoichoi.local', '999', '109', 7, 30, ?)`,
    args: [now],
  });
  console.log("seeded settings");

  // -- redaction blocklist (child PII defense-in-depth) ------------------------
  const blocklist: Array<[string, string]> = [
    ["মাদ্রাসা", "institution"],
    ["মসজিদ", "institution"],
    ["মন্দির", "institution"],
    ["স্কুল", "school"],
    ["কলেজ", "school"],
    ["থানা", "thana"],
    ["উপজেলা", "thana"],
    ["০১৩", "phone"],
    ["০১৪", "phone"],
    ["০১৫", "phone"],
    ["০১৬", "phone"],
    ["০১৭", "phone"],
    ["০১৮", "phone"],
    ["০১৯", "phone"],
  ];
  for (const [value, kind] of blocklist) {
    await client.execute({
      sql: "INSERT OR IGNORE INTO redaction_blocklist (value, kind, created_at) VALUES (?, ?, ?)",
      args: [value, kind, now],
    });
  }
  console.log(`seeded ${blocklist.length} redaction blocklist entries`);

  // -- bootstrapped admin -------------------------------------------------------
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL ?? "admin@hoichoi.local";
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "demo-admin-2026";
  await client.execute({
    sql: `INSERT OR IGNORE INTO admin_users (id, email, display_name, password_hash, role, created_at)
          VALUES (?, ?, ?, ?, 'admin', ?)`,
    args: [randomUUID(), email, "হইচই ডেস্ক", hashSync(password, 10), now],
  });
  console.log(`admin user ready: ${email} (password via ADMIN_BOOTSTRAP_PASSWORD or demo-admin-2026)`);

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});