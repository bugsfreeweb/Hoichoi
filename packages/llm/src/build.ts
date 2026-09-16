import type { LLMProviderRow } from "@hoichoi/shared-types";
import { buildOpenAICompat } from "./compat-presets";
import { OpenAICompatProvider } from "./openai-compat";
import { GoogleGeminiProvider } from "./google";
import { AnthropicProvider } from "./anthropic";
import type { LLMProvider } from "./types";

/** Key resolution strategy: env var first, then an injected vault (Stronghold). */
export type KeyStore = (keyName: string) => string | null;

export function buildProvider(row: LLMProviderRow, keyStore: KeyStore): LLMProvider {
  const key = row.api_key ?? keyStore(row.api_key_env_var) ?? process.env[row.api_key_env_var] ?? null;

  switch (row.provider_key) {
    case "google":
      return new GoogleGeminiProvider(row, key);
    case "anthropic":
      return new AnthropicProvider(row, key);
    default:
      return buildOpenAICompat(row, key);
  }
}

export { OpenAICompatProvider };