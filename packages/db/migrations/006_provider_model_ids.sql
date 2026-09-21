-- 006_provider_model_ids.sql
-- Google retired `gemini-2.0-flash` (use `gemini-3.6-flash`); Groq retired
-- `llama-3.3-70b-versatile` on 2026-08-16 (use `openai/gpt-oss-120b`).
UPDATE llm_providers
  SET model_name = 'gemini-3.6-flash', display_name = 'Google Gemini 3.6 Flash'
  WHERE provider_key = 'google';
UPDATE llm_providers
  SET model_name = 'openai/gpt-oss-120b', display_name = 'Groq GPT-OSS 120B'
  WHERE provider_key = 'groq';

-- Dedupe provider rows double-inserted on DBs where admin/settings were
-- missing (INSERT OR IGNORE with random UUIDs inserts each time). Keep the
-- row with the smallest id per provider_key.
DELETE FROM llm_providers
  WHERE id NOT IN (
    SELECT MIN(id) FROM llm_providers GROUP BY provider_key
  );

-- Prevent future duplicate provider rows.
CREATE UNIQUE INDEX IF NOT EXISTS idx_llm_providers_provider_key
  ON llm_providers (provider_key);