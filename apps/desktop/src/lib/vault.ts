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
] as const;

export type CredentialName = (typeof CREDENTIAL_NAMES)[number];

/** Fetch every stored credential into an env map (skips empties). */
export async function getEnvFromVault(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const name of CREDENTIAL_NAMES) {
    try {
      const v = await getCredential(name);
      if (v) out[name] = v;
    } catch {
      /* ignore vault errors per-key */
    }
  }
  return out;
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