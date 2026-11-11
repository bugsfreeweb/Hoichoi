/**
 * One place that describes every AI provider the dashboard can configure.
 *
 * The old form asked for a provider key, a free-text model name and a
 * text/image "purpose" that defaulted to `text`. Nothing told an operator that
 * Google and OpenAI already have image models, or which env var a row reads its
 * key from, so rows were added as text-only (or with a chat model under
 * purpose=image) and image generation silently had no provider to use.
 *
 * Keeping the catalogue in the UI layer (not in @hoichoi/llm) means the form can
 * show the right defaults without pulling provider code into the client bundle.
 */

export type ProviderPurpose = "text" | "image";

export interface ProviderMeta {
  key: string;
  label: string;
  /** Env var the runtime reads the key from when the row has no DB override. */
  envVar: string;
  /** Which work this provider can do. */
  kinds: ProviderPurpose[];
  /** Suggested model per purpose; the first entry is the default. */
  models: Record<ProviderPurpose, string[]>;
  /** Fixed base URL, or "" when the runtime has its own default. */
  baseUrl: string;
  /** Free tier means "tried first", not necessarily "no quota". */
  freeTier: boolean;
  /** One-line Bangla note shown under the provider picker. */
  noteBn: string;
}

export const PROVIDER_META: ProviderMeta[] = [
  {
    key: "google",
    label: "Google Gemini",
    envVar: "GOOGLE_API_KEY",
    kinds: ["text", "image"],
    models: {
      text: ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-pro"],
      image: ["gemini-2.5-flash-image", "gemini-2.0-flash-preview-image-generation"],
    },
    baseUrl: "",
    freeTier: true,
    noteBn: "একই কী দিয়ে লেখা ও ছবি—দুই কাজই হয়। ছবির জন্য -image মডেল বেছে নিন।",
  },
  {
    key: "openai",
    label: "OpenAI",
    envVar: "OPENAI_API_KEY",
    kinds: ["text", "image"],
    models: {
      text: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"],
      image: ["gpt-image-1", "dall-e-3"],
    },
    baseUrl: "https://api.openai.com/v1",
    freeTier: false,
    noteBn: "লেখার জন্য gpt-4o-mini, ছবির জন্য gpt-image-1। ছবি মডেল সস্তা নয়।",
  },
  {
    key: "openrouter",
    label: "OpenRouter",
    envVar: "OPENROUTER_API_KEY",
    kinds: ["text"],
    models: { text: ["google/gemini-2.0-flash-exp:free", "meta-llama/llama-3.3-70b-instruct:free"], image: [] },
    baseUrl: "https://openrouter.ai/api/v1",
    freeTier: true,
    noteBn: "শুধু লেখার কাজে। :free মডেলগুলোই আগে চেষ্টা হয়।",
  },
  {
    key: "groq",
    label: "Groq",
    envVar: "GROQ_API_KEY",
    kinds: ["text"],
    models: { text: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"], image: [] },
    baseUrl: "https://api.groq.com/openai/v1",
    freeTier: true,
    noteBn: "দ্রুত ও ফ্রি টিয়ার—লেখার কাজে।",
  },
  {
    key: "anthropic",
    label: "Anthropic Claude",
    envVar: "ANTHROPIC_API_KEY",
    kinds: ["text"],
    models: { text: ["claude-3-5-haiku-latest", "claude-sonnet-4-20250514"], image: [] },
    baseUrl: "",
    freeTier: false,
    noteBn: "শুধু লেখার কাজে (পেইড)।",
  },
  {
    key: "mistral",
    label: "Mistral",
    envVar: "MISTRAL_API_KEY",
    kinds: ["text"],
    models: { text: ["mistral-small-latest", "open-mistral-nemo"], image: [] },
    baseUrl: "https://api.mistral.ai/v1",
    freeTier: true,
    noteBn: "লেখার কাজে ফ্রি টিয়ার আছে।",
  },
  {
    key: "ollama",
    label: "Ollama (লোকাল)",
    envVar: "OLLAMA_BASE_URL",
    kinds: ["text"],
    models: { text: ["llama3.2", "qwen2.5:7b"], image: [] },
    baseUrl: "http://localhost:11434/v1",
    freeTier: true,
    noteBn: "নিজের কম্পিউটারে চলা মডেল — ইন্টারনেট/কী লাগে না।",
  },
  {
    key: "github",
    label: "GitHub Copilot",
    envVar: "GITHUB_COPILOT_TOKEN",
    kinds: ["text"],
    models: { text: ["gpt-4o-mini", "gpt-4o"], image: [] },
    baseUrl: "https://api.githubcopilot.com",
    freeTier: true,
    noteBn: "Copilot টোকেন (ghu_…) দিয়ে লেখার কাজে।",
  },
  {
    key: "github-models",
    label: "GitHub Models",
    envVar: "GITHUB_COPILOT_TOKEN",
    kinds: ["text"],
    models: { text: ["gpt-4o-mini", "Phi-3.5-mini-instruct"], image: [] },
    baseUrl: "https://models.github.ai/v1",
    freeTier: true,
    noteBn: "GitHub Models ক্যাটালগ — লেখার কাজে।",
  },
  {
    key: "custom",
    label: "কাস্টম / অন্য API",
    envVar: "CUSTOM_API_KEY",
    kinds: ["text", "image"],
    models: {
      text: ["manifest/auto"],
      image: ["flux", "@cf/black-forest-labs/flux-1-schnell", "black-forest-labs/FLUX.1-schnell"],
    },
    baseUrl: "",
    freeTier: false,
    noteBn: "Pollinations, Cloudflare Workers AI, Together AI — OpenAI-সদৃশ যেকোনো এন্ডপয়েন্ট।",
  },
];

export function metaFor(providerKey: string): ProviderMeta {
  return PROVIDER_META.find((p) => p.key === providerKey) ?? PROVIDER_META[PROVIDER_META.length - 1]!;
}

/** Short Bangla label for a row's purpose. */
export function purposeLabelBn(purpose?: string | null): string {
  return purpose === "image" ? "ছবি" : "লেখা";
}

/** True when a model id looks like a text-to-image model. */
export function looksLikeImageModel(model: string): boolean {
  return /image|flux|dall-e|imagen|sdxl|stable-diffusion|pollinations|banana/i.test(model);
}
