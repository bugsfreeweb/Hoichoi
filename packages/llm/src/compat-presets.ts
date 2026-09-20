import type { LLMProviderRow } from "@hoichoi/shared-types";
import { OpenAICompatProvider, type OpenAICompatOptions } from "./openai-compat";

const DEFAULT_BASE_URLS: Record<string, string> = {
  groq: "https://api.groq.com/openai/v1",
  openrouter: "https://openrouter.ai/api/v1",
  openai: "https://api.openai.com/v1",
  mistral: "https://api.mistral.ai/v1",
  ollama: "http://localhost:11434/v1",
};

export function buildOpenAICompat(row: LLMProviderRow, key: string | null): OpenAICompatProvider {
  const opts: OpenAICompatOptions = {
    row,
    key,
    defaultBaseUrl: DEFAULT_BASE_URLS[row.provider_key] ?? "https://api.openai.com/v1",
  };
  if (row.provider_key === "openrouter") {
    // Header values must stay ASCII: V8 fetch rejects non-Latin1 header values
    // ("Cannot convert argument to a ByteString ..."), which silently killed
    // every rewrite that hit the OpenRouter provider.
    opts.extraHeaders = { "HTTP-Referer": "https://hoichoi.local", "X-Title": "hoichoi" };
  }
  if (row.provider_key === "ollama") {
    // Ollama accepts the key verbatim when its auth is enabled.
    opts.stripBearer = true;
  }
  return new OpenAICompatProvider(opts);
}