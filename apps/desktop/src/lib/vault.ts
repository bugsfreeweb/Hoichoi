import { Stronghold, type Client } from "@tauri-apps/plugin-stronghold";
import { appDataDir } from "@tauri-apps/api/path";

const VAULT_KEY = "hoichoi-desk-vault-key-v1";
const CLIENT_NAME = "hoichoi";
const VAULT_FILE = "vault.hold";

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

type Vault = { stronghold: Stronghold; client: Client; store: ReturnType<Client["getStore"]> };

let cached: Vault | null = null;

let loading: Promise<Vault> | null = null;

async function open(): Promise<Vault> {
  const vaultPath = `${await appDataDir()}/${VAULT_FILE}`;
  const stronghold = await Stronghold.load(vaultPath, VAULT_KEY);
  let client: Client;
  try {
    client = await stronghold.loadClient(CLIENT_NAME);
  } catch {
    client = await stronghold.createClient(CLIENT_NAME);
  }
  return { stronghold, client, store: client.getStore() };
}

function getStore(): Promise<Vault> {
  if (cached) return Promise.resolve(cached);
  loading ??= open().then((v) => (cached = v));
  return loading;
}

/** decode the byte array the plugin returns (number[] or Uint8Array). */
function decode(raw: number[] | Uint8Array): string {
  return new TextDecoder().decode(new Uint8Array(raw));
}

export async function getCredential(name: CredentialName): Promise<string | null> {
  try {
    const { store } = await getStore();
    const data = await store.get(name);
    return data ? decode(data) : null;
  } catch {
    return null;
  }
}

export async function hasCredential(name: CredentialName): Promise<boolean> {
  return (await getCredential(name)) !== null;
}

export async function storeCredential(name: CredentialName, value: string): Promise<void> {
  const { store, stronghold } = await getStore();
  await store.insert(name, Array.from(new TextEncoder().encode(value)));
  await stronghold.save();
}

export async function removeCredential(name: CredentialName): Promise<void> {
  const { store, stronghold } = await getStore();
  try {
    await store.remove(name);
  } catch {
    /* key not present */
  }
  await stronghold.save();
}

export async function listConfigured(): Promise<Record<CredentialName, boolean>> {
  const out = {} as Record<CredentialName, boolean>;
  for (const name of CREDENTIAL_NAMES) {
    out[name] = await hasCredential(name);
  }
  return out;
}