-- 007_provider_network.sql
-- Runtime provider network: data-only statements so this file is safe to run
-- anywhere (columns are added by the runtime ensureProviderHealthColumns).
-- Pairs with packages/db/src/client.ts ensureRuntimeProviders.

-- Idempotent guard against duplicate provider rows (present since 006).
CREATE UNIQUE INDEX IF NOT EXISTS idx_llm_providers_provider_key ON llm_providers (provider_key);

-- Extended default provider chain: free-first, deterministic stable ids so
-- INSERT OR IGNORE is idempotent even without the unique index.
INSERT OR IGNORE INTO llm_providers
  (id, provider_key, display_name, base_url, model_name, api_key_env_var,
   priority, is_active, is_free_tier, supports_rewrite, supports_embeddings,
   created_at, updated_at)
VALUES
  ('prov-github-copilot', 'github', 'GitHub Copilot',
   'https://api.githubcopilot.com', 'gpt-4o-mini',
   'GITHUB_COPILOT_TOKEN', 4, 1, 1, 1, 0,
   strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('prov-openai-mini', 'openai', 'OpenAI GPT-4o mini',
   NULL, 'gpt-4o-mini',
   'OPENAI_API_KEY', 6, 1, 0, 1, 0,
   strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('prov-mistral-small', 'mistral', 'Mistral Small',
   NULL, 'mistral-small-latest',
   'MISTRAL_API_KEY', 7, 1, 1, 1, 0,
   strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('prov-manifest-ai', 'custom', 'Manifest AI',
   'https://app.manifest.build/v1', 'manifest/auto',
   'MANIFEST_API_KEY', 8, 1, 0, 1, 0,
   strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'));

-- Repair any legacy "Manifest AI" row (base_url may have been null, so traffic
-- went to the OpenAI fallback host, and older rows used CUSTOM_API_KEY which the
-- vault no longer offers). Normalises them onto the manifest.build contract.
UPDATE llm_providers
  SET base_url = COALESCE(NULLIF(base_url, ''), 'https://app.manifest.build/v1'),
      display_name = 'Manifest AI',
      model_name = 'manifest/auto',
      api_key_env_var = 'MANIFEST_API_KEY',
      is_free_tier = 0,
      priority = 8,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE provider_key = 'custom'
    AND model_name LIKE 'manifest%';