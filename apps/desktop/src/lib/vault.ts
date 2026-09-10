import { invoke } from "./tauri";

export const CREDENTIAL_NAMES = [
  "turso_url",
  "turso_token",
  "github_pat",
  "github_repo",
  "GOOGLE_API_KEY",
  "GROQ_API_KEY",
  "OPENROUTER_API_KEY",
  "OLLAMA_BASE_URL",
  "fb_session_cookie",
  "fb_cookie_expires",
  "use_cloud",
] as const;

export type CredentialName = (typeof CREDENTIAL_NAMES)[number];

/** Vault key → actual env var name read by the runner. */
const ENV_MAP: Partial<Record<CredentialName, string>> = {
  turso_url: "TURSO_DATABASE_URL",
  turso_token: "TURSO_AUTH_TOKEN",
  fb_session_cookie: "FB_SESSION_COOKIE",
};

/** Vault keys that are NOT pipeline envs (GitHub mirroring / metadata only). */
const SKIP_ENV: CredentialName[] = ["github_pat", "github_repo", "fb_cookie_expires", "use_cloud"];

/** Cloud-sync mode lives in the vault; default on so desktop → web is shared. */
export function cloudSyncDefault(): boolean {
  return true;
}

/**
 * Fetch every stored credential into a runner-ready env map (skips empties and
 * non-env keys). The mapping fixes the old gap where `turso_url`/`turso_token`
 * were stored but never read as `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`.
 */
export async function getEnvFromVault(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const name of CREDENTIAL_NAMES) {
    if (SKIP_ENV.includes(name)) continue;
    try {
      const v = await getCredential(name);
      if (v) out[ENV_MAP[name] ?? name] = v;
    } catch {
      /* ignore vault errors per-key */
    }
  }
  return out;
}

/**
 * Runner env honoring the cloud-sync toggle: when `use_cloud` is off the Turso
 * credentials are stripped so the run targets the local file DB (manual resync
 * mode). Defaults to cloud (toggle key absent → cloud).
 */
export async function getRunEnv(): Promise<Record<string, string>> {
  const env = await getEnvFromVault();
  const cloud = (await getCredential("use_cloud")) !== "0";
  if (!cloud) {
    delete env.TURSO_DATABASE_URL;
    delete env.TURSO_AUTH_TOKEN;
  }
  return env;
}

/** True when the desktop writes to the shared cloud DB (Turso) on pipeline runs. */
export async function isCloudSync(): Promise<boolean> {
  const env = await getEnvFromVault();
  return Boolean(env.TURSO_DATABASE_URL) && (await getCredential("use_cloud")) !== "0";
}

let opening: Promise<void> | null = null;

/** Smoke-test the Rust vault once per session (surfaces real errors early). */
async function ensureOpen(): Promise<void> {
  opening ??= (async () => {
    await invoke("vault_names");
  })().catch((e) => {
    opening = null;
    throw e;
  });
  await opening;
}

/** True when running inside the Tauri webview. */
function hasTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function getCredential(name: CredentialName): Promise<string | null> {
  if (!hasTauri()) return null;
  try {
    await ensureOpen();
    return await invoke<string | null>("vault_get", { name });
  } catch {
    return null;
  }
}

export async function hasCredential(name: CredentialName): Promise<boolean> {
  return (await getCredential(name)) !== null;
}

export async function storeCredential(name: CredentialName, value: string): Promise<void> {
  await ensureOpen();
  await invoke("vault_set", { name, value });
}

export async function removeCredential(name: CredentialName): Promise<void> {
  await ensureOpen();
  try {
    await invoke("vault_delete", { name });
  } catch {
    /* key not present */
  }
}

export async function listConfigured(): Promise<Record<CredentialName, boolean>> {
  if (!hasTauri()) {
    return {} as Record<CredentialName, boolean>;
  }
  const out = {} as Record<CredentialName, boolean>;
  for (const name of CREDENTIAL_NAMES) {
    out[name] = await hasCredential(name);
  }
  return out;
}

/** Env var name a stored credential is exposed as (null = metadata-only). */
export function envNameFor(name: CredentialName): string | null {
  if (SKIP_ENV.includes(name)) return null;
  return ENV_MAP[name] ?? name;
}

/** Every stored secret with its real env name + value (used by the vault view). */
export async function envPayload(): Promise<
  Array<{ name: CredentialName; envName: string; value: string }>
> {
  const out: Array<{ name: CredentialName; envName: string; value: string }> = [];
  for (const name of CREDENTIAL_NAMES) {
    const envName = envNameFor(name);
    if (!envName) continue;
    try {
      const v = await getCredential(name);
      if (v) out.push({ name, envName, value: v });
    } catch {
      /* skip vault errors per key */
    }
  }
  return out;
}