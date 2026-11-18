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
    /**
     * Cloudflare Workers AI is a first-class provider now, not a "custom" row.
     *
     * It has been the default image provider since v1.1.31, but the console's
     * "add a provider" form did not list it: an operator who wanted a *second*
     * Cloudflare account (a second quota pool) had to pick "custom" and hand-
     * compose `…/accounts/<32 hex>/ai/run/@cf/black-forest-labs/flux-1-schnell`.
     * A typo there is not a visible typo — the row saves, the test comes back
     * 7003/404, and the fix looks like a broken integration. Selecting
     * Cloudflare now asks for the account ID and the token, and the URL is
     * composed, so a second account is two values, not a URL edit.
     */
    key: "cloudflare",
    label: "Cloudflare Workers AI",
    envVar: "CLOUDFLARE_API_TOKEN",
    kinds: ["image"],
    models: {
      text: [],
      image: [
        "@cf/black-forest-labs/flux-1-schnell",
        "@cf/stabilityai/stable-diffusion-xl-base-1.0",
        "@cf/lykon/dreamshaper-8-lcm",
      ],
    },
    baseUrl: "https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID/ai/run",
    freeTier: true,
    noteBn:
      "ছবি আঁকার ডিফল্ট প্রোভাইডার — ওয়াটারমার্ক নেই, দিনে ১০,০০০ নিউরন ফ্রি। প্রতিটি অ্যাকাউন্টের জন্য আলাদা রো যোগ করলে কোটা বাড়ে।",
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
    noteBn: "Cloudflare Workers AI, Together AI, OpenAI — OpenAI-সদৃশ যেকোনো এন্ডপয়েন্ট।",
  },
];

/**
 * The env var that may hold a Cloudflare account id, so a pasted token can work
 * without hand-composing a URL.
 *
 * It lives in shared-types (not in the LLM package) because the console's row
 * editor needs it too, and that is a client component: importing `@hoichoi/llm`
 * there pulls `node:crypto` into the browser bundle and the page 500s.
 */
export const CLOUDFLARE_ACCOUNT_ENV = "CLOUDFLARE_ACCOUNT_ID";

/** True when a base URL still carries the placeholder an operator must replace. */
export function hasAccountPlaceholder(url: string | null | undefined): boolean {
  return /(^|[^A-Za-z0-9_])ACCOUNT_ID([^A-Za-z0-9_]|$)/i.test(url ?? "");
}

/**
 * Fill the Cloudflare account id into a seeded base URL.
 *
 * The seeded row cannot know the operator's account, and asking them to edit a URL
 * by hand is how this broke: the token was pasted, the row was switched on, and
 * every render returned `7003 … /accounts/ACCOUNT_ID/ai/run/…`. A 32-hex
 * `CLOUDFLARE_ACCOUNT_ID` is substituted here, so the setup is "paste two values".
 */
export function resolveAccountPlaceholder(
  baseUrl: string,
  env: Record<string, string | undefined> = {},
): string {
  if (!hasAccountPlaceholder(baseUrl)) return baseUrl;
  const id = (env[CLOUDFLARE_ACCOUNT_ENV] ?? "").trim();
  if (!/^[0-9a-f]{32}$/i.test(id)) return baseUrl;
  return baseUrl.replace(/ACCOUNT_ID/gi, id);
}

export const CLOUDFLARE_ACCOUNT_ID_RE = /^[0-9a-f]{32}$/i;

/**
 * One declarative field of the "add a provider" form.
 *
 * Selecting a provider shows exactly this list — no generic "Key / URL" pair
 * that turns a Cloudflare setup into a guessing game. The field set is data,
 * shared between the web console and the desktop settings panel, so a provider
 * that needs an account id cannot be described with a URL field.
 */
export interface ProviderFieldSpec {
  key: "accountId" | "apiToken" | "baseUrl";
  labelBn: string;
  placeholder: string;
  /** Password input; never render the value back. */
  secret?: boolean;
  /** Skipped (not just optional) when false, so Ollama never asks for a key. */
  required?: boolean;
  /** One-line instruction under the input. */
  hintBn?: string;
  /** True when the box shows a value derived from the account id. */
  composed?: boolean;
}

/**
 * The fields the "add a provider" panel shows for a chosen provider.
 *
 * Cloudflare is the complete story: account id + token, and the base URL is
 * composed from the account id so a typo cannot quietly break the row. Ollama
 * has no key at all. Every other provider gets key + optional base URL.
 */
export function providerFields(providerKey: string): ProviderFieldSpec[] {
  if (providerKey === "cloudflare") {
    return [
      {
        key: "accountId",
        labelBn: "Cloudflare account ID",
        placeholder: "32 hex অক্ষর · Cloudflare → Workers & Pages → Account ID",
        required: true,
        hintBn: "৩২ অক্ষরের hex — যেমন 1a2b3c…f0। ওয়েবসাইটের URL নয়।",
      },
      {
        key: "apiToken",
        labelBn: "API টোকেন",
        placeholder: "হলি রাখলে CLOUDFLARE_API_TOKEN env ব্যবহার হবে",
        secret: true,
        hintBn: "টোকেনে Workers AI লেখার অনুমতি (Account → Workers AI → Edit) থাকতে হবে।",
      },
      {
        key: "baseUrl",
        labelBn: "API base URL (অটো-তৈরি)",
        placeholder: "—",
        composed: true,
        hintBn: "আপনার account ID দিয়ে নিজে থেকেই তৈরি হবে — এখানে হাতলেখার দরকার নেই।",
      },
    ];
  }
  if (providerKey === "ollama") {
    return [
      {
        key: "baseUrl",
        labelBn: "Ollama base URL",
        placeholder: "http://localhost:11434/v1",
        required: true,
        hintBn: "কোনো API কী লাগে না — লোকাল সার্ভারের ঠিকানা।",
      },
    ];
  }
  return [
    {
      key: "apiToken",
      labelBn: "API কী",
      placeholder: "হলি রাখলে env-এর কী ব্যবহার হবে (কোড নিচে দেখায় কোনটা)",
      secret: true,
    },
    {
      key: "baseUrl",
      labelBn: "API base URL",
      placeholder: "খালি রাখলে ডিফল্ট",
    },
  ];
}

/**
 * A bare model name is not a Workers AI model id.
 *
 * The route is `…/ai/run/@cf/<vendor>/<model>`; sending `flux-1-schnell` alone
 * makes Cloudflare answer `400 No route for that URI`, which reads like an auth
 * or account problem and is neither. The console used to let a row be saved with
 * the short name, so rows like that are in the wild: this maps the known short
 * names to their real ids, and anything else is refused with a reason instead of
 * a 400 from the network.
 */
export const CLOUDFLARE_MODEL_PREFIX = "@cf/";

const CLOUDFLARE_MODEL_ALIASES: Readonly<Record<string, string>> = {
  "flux-1-schnell": "@cf/black-forest-labs/flux-1-schnell",
  "flux-schnell": "@cf/black-forest-labs/flux-1-schnell",
  "black-forest-labs/flux-1-schnell": "@cf/black-forest-labs/flux-1-schnell",
  "stable-diffusion-xl-base-1.0": "@cf/stabilityai/stable-diffusion-xl-base-1.0",
  "sdxl": "@cf/stabilityai/stable-diffusion-xl-base-1.0",
  "dreamshaper-8-lcm": "@cf/lykon/dreamshaper-8-lcm",
};

/** `flux-1-schnell` → `@cf/black-forest-labs/flux-1-schnell`; null when unknown. */
export function normalizeCloudflareModel(model: string | null | undefined): string | null {
  // A whole endpoint is sometimes pasted into the model box. Everything after
  // `/ai/run/` is the model id; a bare host is dropped. Both are the operator
  // pasting what Cloudflare's dashboard showed them, not a different request.
  const input = (model ?? "").trim();
  const afterRun = input.includes("/ai/run/") ? input.slice(input.indexOf("/ai/run/") + "/ai/run/".length) : input;
  const raw = afterRun.replace(/^https?:\/\/[^/]+/i, "").replace(/\/+$/, "");
  if (!raw) return null;
  if (raw.startsWith(CLOUDFLARE_MODEL_PREFIX)) return raw;
  const alias = CLOUDFLARE_MODEL_ALIASES[raw.toLowerCase()];
  if (alias) return alias;
  // `black-forest-labs/flux-1-schnell` — a vendor path without the `@cf/` prefix.
  if (/^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/i.test(raw)) return `${CLOUDFLARE_MODEL_PREFIX}${raw}`;
  return null;
}

/** True when a model id can be routed by Workers AI at all. */
export function isCloudflareModel(model: string | null | undefined): boolean {
  return normalizeCloudflareModel(model) !== null;
}

/** Base URL for a Cloudflare Workers AI row, composed from a valid account id. */
export function composeCloudflareBaseUrl(accountId: string): string {
  const id = accountId.trim();
  if (!CLOUDFLARE_ACCOUNT_ID_RE.test(id)) return "";
  return `https://api.cloudflare.com/client/v4/accounts/${id}/ai/run`;
}

/**
 * Validate a draft before it reaches the API — one Bangla message per problem,
 * in the order an operator would meet them (account id before token).
 */
export function validateProviderSetup(draft: {
  providerKey: string;
  accountId?: string;
  apiToken?: string;
  baseUrl?: string;
  model?: string | null;
}): { ok: true } | { ok: false; errorBn: string } {
  if (draft.providerKey === "cloudflare") {
    const id = (draft.accountId ?? "").trim();
    if (!CLOUDFLARE_ACCOUNT_ID_RE.test(id)) {
      return {
        ok: false,
        errorBn: "Cloudflare account ID ৩২ অক্ষরের hex হতে হবে — Cloudflare → Workers & Pages → Account ID থেকে নিন।",
      };
    }
    // A model Cloudflare does not have is the failure that reads like an outage:
    // `400 No route for that URI`. Refuse it here, where the operator can fix it.
    if (draft.model !== undefined && !isCloudflareModel(draft.model)) {
      const first = metaFor("cloudflare").models.image[0] ?? "@cf/black-forest-labs/flux-1-schnell";
      return {
        ok: false,
        errorBn:
          `Cloudflare-এ “${(draft.model ?? "").trim() || "(খালি)"}” নামে কোনো মডেল নেই — ` +
          `পুরো আইডি দিন, যেমন ${first}।`,
      };
    }
  }
  if (draft.providerKey === "custom" && !(draft.baseUrl ?? "").trim()) {
    return { ok: false, errorBn: "স্বনির্মিত প্রোভাইডারের জন্য base URL আবশ্যক।" };
  }
  return { ok: true };
}

/**
 * The three conditions that make an image provider actually render.
 *
 * Written once and rendered by the console, because "why is there no image" was
 * answered in three different places with three different wordings, and the
 * answer is always the same three checks.
 */
export const PROVIDERS_GUIDE: ReadonlyArray<{ n: string; bn: string }> = [
  { n: "১", bn: "রো-টি সক্রিয় (Active) এবং কাজ “🎨 ছবি” — লেখার রো কখনো ছবি আঁকে না।" },
  { n: "২", bn: "কী আছে — DB-তে সংরক্ষিত, অথবা env/vault-এ থাকা ভেরিয়েবল।" },
  { n: "৩", bn: "মডেলটি সত্যিই image মডেল (যেমন gpt-image-1, flux-1-schnell, gemini-2.5-flash-image); “টেস্ট” বোতাম দিয়ে প্রমাণ করুন।" },
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
  return /image|flux|dall-e|imagen|sdxl|stable-diffusion|banana/i.test(model);
}
