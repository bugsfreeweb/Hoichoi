import { invoke } from "./tauri";

export const CREDENTIAL_NAMES = [
  "turso_url",
  "turso_token",
  "github_pat",
  "github_repo",
  "github_media_repos",
  "media_github_token",
  "github_branch",
  "github_cdn_url",
  "idrivee2_access_key",
  "idrivee2_secret_key",
  "idrivee2_bucket",
  "idrivee2_endpoint",
  "b2_access_key",
  "b2_secret_key",
  "b2_bucket",
  "b2_endpoint",
  "revalidate_secret",
  "vercel_deploy_hook_url",
  "GOOGLE_API_KEY",
  "GROQ_API_KEY",
  "OPENROUTER_API_KEY",
  "OLLAMA_BASE_URL",
  "MISTRAL_API_KEY",
  "OPENAI_API_KEY",
  "MANIFEST_API_KEY",
  "GITHUB_COPILOT_TOKEN",
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
  github_pat: "GITHUB_TOKEN",
  github_repo: "GITHUB_REPO",
  github_media_repos: "GITHUB_MEDIA_REPOS",
  media_github_token: "MEDIA_GITHUB_TOKEN",
  github_branch: "GITHUB_BRANCH",
  github_cdn_url: "GITHUB_CDN_URL",
  idrivee2_access_key: "IDRIVEE2_ACCESS_KEY",
  idrivee2_secret_key: "IDRIVEE2_SECRET_KEY",
  idrivee2_bucket: "IDRIVEE2_BUCKET",
  idrivee2_endpoint: "IDRIVEE2_ENDPOINT",
  b2_access_key: "B2_ACCESS_KEY",
  b2_secret_key: "B2_SECRET_KEY",
  b2_bucket: "B2_BUCKET",
  b2_endpoint: "B2_ENDPOINT",
  revalidate_secret: "REVALIDATE_SECRET",
  // Exact uppercase name matters: Settings pushes vault fields to GitHub
  // Actions under this key and `.github/workflows/pipeline-cron.yml` curls
  // `secrets.VERCEL_DEPLOY_HOOK_URL` after a scrape. A different spelling would
  // silently deploy nothing.
  vercel_deploy_hook_url: "VERCEL_DEPLOY_HOOK_URL",
};

/** Vault keys that are NOT pipeline envs (metadata only). */
const SKIP_ENV: CredentialName[] = ["fb_cookie_expires", "use_cloud"];

/** Cloud-sync mode lives in the vault; default on so desktop → web is shared. */
export function cloudSyncDefault(): boolean {
  return true;
}

/* ------------------------------------------------------------------ *
 * Credential snapshot — getEnvFromVault/getRunEnv/isCloudSync each ran
 * ~15 vault_read invokes per call; a session snapshot makes the steady
 * state a single in-memory read, and is busted on every store/remove.   *
 * ------------------------------------------------------------------ */

type Snapshot = Partial<Record<CredentialName, string | null>>;
let snapshotCache: Snapshot | null = null;

async function getSnapshot(): Promise<Snapshot> {
  if (snapshotCache) return snapshotCache;
  const snap: Snapshot = {};
  for (const name of CREDENTIAL_NAMES) {
    try {
      snap[name] = await getCredential(name);
    } catch {
      snap[name] = null;
    }
  }
  snapshotCache = snap;
  return snap;
}

/** Forget the snapshot after any vault write so the next read is fresh. */
function invalidateSnapshot(): void {
  snapshotCache = null;
}

/**
 * Fetch every stored credential into a runner-ready env map (skips empties and
 * non-env keys). The mapping fixes the old gap where `turso_url`/`turso_token`
 * were stored but never read as `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`.
 */
function isRemoteDbUrl(value?: string | null): boolean {
  const raw = value?.trim();
  if (!raw) return false;
  return /^libsql:\/\//i.test(raw) || /^https?:\/\//i.test(raw);
}

export async function getEnvFromVault(): Promise<Record<string, string>> {
  const snap = await getSnapshot();
  const out: Record<string, string> = {};
  for (const name of CREDENTIAL_NAMES) {
    if (SKIP_ENV.includes(name)) continue;
    const v = snap[name];
    if (v) out[ENV_MAP[name] ?? name] = v;
  }
  // Enable the GitHub media adapter only when an explicit media repo list
  // exists. `github_repo` is the app repository and must never receive media.
  const mediaToken = snap.media_github_token || snap.github_pat;
  const mediaRepos = (snap.github_media_repos ?? "").trim();
  if (mediaToken && mediaRepos) {
    out.STORAGE_ADAPTER = "github";
    if (!out.MEDIA_GITHUB_TOKEN) out.MEDIA_GITHUB_TOKEN = mediaToken;
  }
  // Raw imports live under their real ENV name (they have no canonical vault
  // key), so surface every extra vault entry verbatim. Without this, keys pasted
  // in through "Import .env" (R2_*, ADMIN_AUTH_SECRET, ANTHROPIC_API_KEY, …)
  // would sit in the vault but never reach a pipeline run.
  try {
    for (const raw of await listVaultNames()) {
      if ((CREDENTIAL_NAMES as readonly string[]).includes(raw)) continue;
      if (out[raw]) continue;
      const v = await getCredentialRaw(raw);
      if (v) out[raw] = v;
    }
  } catch {
    /* vault unavailable — canonical env is still returned */
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
  const cloud = (await getSnapshot()).use_cloud !== "0";
  if (!cloud) {
    delete env.TURSO_DATABASE_URL;
    delete env.TURSO_AUTH_TOKEN;
  }
  return env;
}

/** True when the desktop writes to the shared cloud DB (Turso) on pipeline runs. */
export async function isCloudSync(): Promise<boolean> {
  const snap = await getSnapshot();
  return Boolean(snap.turso_url) && snap.use_cloud !== "0";
}

/**
 * Env with the shared Turso credentials ALWAYS present, ignoring the
 * cloud-sync toggle. `getRunEnv()` deliberately strips them in local-only
 * mode so pipeline runs write to the local file DB — but a manual
 * desk → web resync *is* the operation that targets the cloud DB, so it must
 * carry the cloud URL + token or the Rust `sync_db` command aborts with
 * "no cloud DB configured".
 *
 * Throws a user-facing message when the vault has no cloud DB configured.
 */
export async function getCloudEnv(): Promise<Record<string, string>> {
  const env = await getEnvFromVault();
  if (!isRemoteDbUrl(env.TURSO_DATABASE_URL)) {
    throw new Error(
      "ক্লাউড ডেটাবেস কনফিগার্ড নেই — API Vault-এ Turso URL যোগ করুন, তারপর আবার চেষ্টা করুন।",
    );
  }
  if (!env.TURSO_AUTH_TOKEN) {
    throw new Error("Turso auth token নেই — API Vault-এ Turso টোকেন যোগ করুন।");
  }
  return env;
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
  return getCredentialRaw(name);
}

/** Read any vault entry by its raw name (also covers imported `.env` keys). */
export async function getCredentialRaw(name: string): Promise<string | null> {
  if (!hasTauri()) return null;
  try {
    await ensureOpen();
    return await invoke<string | null>("vault_get", { name });
  } catch {
    return null;
  }
}

/** Every key present in the encrypted vault (canonical credential names + raw imports). */
export async function listVaultNames(): Promise<string[]> {
  if (!hasTauri()) return [];
  try {
    await ensureOpen();
    return await invoke<string[]>("vault_names");
  } catch {
    return [];
  }
}

export async function hasCredential(name: CredentialName): Promise<boolean> {
  return (await getCredential(name)) !== null;
}

export async function storeCredential(name: CredentialName, value: string): Promise<void> {
  await storeCredentialRaw(name, value);
}

/** Store any vault entry by raw name (used by `.env` import for unknown keys). */
export async function storeCredentialRaw(name: string, value: string): Promise<void> {
  await ensureOpen();
  await invoke("vault_set", { name, value });
  invalidateSnapshot();
}

export async function removeCredential(name: CredentialName): Promise<void> {
  await ensureOpen();
  try {
    await invoke("vault_delete", { name });
  } catch {
    /* key not present */
  }
  invalidateSnapshot();
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

/** Reverse lookup: real ENV name → canonical vault key (for `.env` import). */
const ENV_TO_VAULT: Record<string, CredentialName> = (() => {
  const map: Record<string, CredentialName> = {};
  for (const name of CREDENTIAL_NAMES) {
    if (SKIP_ENV.includes(name)) continue;
    map[ENV_MAP[name] ?? name] = name;
  }
  return map;
})();

/** Parse a `.env` blob into key/value pairs (ignores comments + blank lines). */
export function parseDotenv(text: string): Array<{ key: string; value: string }> {
  const rows: Array<{ key: string; value: string }> = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    rows.push({ key, value });
  }
  return rows;
}

/**
 * Import a `.env` blob into the vault. Known keys are folded onto their
 * canonical vault entry (so `TURSO_DATABASE_URL=…` populates `turso_url`, which
 * is what `isCloudSync` reads); unknown keys are stored under their own ENV
 * name and passed straight through by `getEnvFromVault`.
 */
export async function importEnv(text: string): Promise<{ stored: string[]; skipped: string[] }> {
  const stored: string[] = [];
  const skipped: string[] = [];
  for (const { key, value } of parseDotenv(text)) {
    if (!value) {
      skipped.push(key);
      continue;
    }
    try {
      const vaultName = ENV_TO_VAULT[key];
      if (vaultName) await storeCredential(vaultName, value);
      else await storeCredentialRaw(key, value);
      stored.push(key);
    } catch {
      skipped.push(key);
    }
  }
  return { stored, skipped };
}

/** Serialize the whole vault back to `.env` form (canonical keys first). */
export async function exportEnv(): Promise<string> {
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const name of CREDENTIAL_NAMES) {
    if (SKIP_ENV.includes(name)) continue;
    const envName = ENV_MAP[name] ?? name;
    if (seen.has(envName)) continue;
    const v = await getCredentialRaw(name);
    if (v) {
      lines.push(`${envName}=${v}`);
      seen.add(envName);
    }
  }
  for (const name of await listVaultNames()) {
    if ((CREDENTIAL_NAMES as readonly string[]).includes(name)) continue;
    if (seen.has(name) || SKIP_ENV.includes(name as CredentialName)) continue;
    const v = await getCredentialRaw(name);
    if (v) {
      lines.push(`${name}=${v}`);
      seen.add(name);
    }
  }
  return lines.join("\n");
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