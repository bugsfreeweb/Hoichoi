import { useEffect, useState } from "react";
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Rss,
  Sparkles,
  GitBranch,
  Triangle,
  Database,
  HardDrive,
  Lock,
  RotateCw,
  type LucideIcon,
} from "lucide-react";
import {
  type CredentialName,
  getCredential,
  getRunEnv,
  envNameFor,
} from "../lib/vault";
import { deskProviders } from "../lib/tauri";
import { toBn } from "../lib/format";

const SERVICE_ICON: Record<string, LucideIcon> = {
  facebook: Rss,
  llm: Sparkles,
  github: GitBranch,
  vercel: Triangle,
  database: Database,
  storage: HardDrive,
  vault: Lock,
};

const SCOPE: Record<string, "desktop" | "web" | "both"> = {
  turso_url: "both",
  turso_token: "both",
  github_pat: "web",
  github_repo: "web",
  GOOGLE_API_KEY: "both",
  GROQ_API_KEY: "both",
  OPENROUTER_API_KEY: "both",
  OLLAMA_BASE_URL: "desktop",
  MISTRAL_API_KEY: "desktop",
  OPENAI_API_KEY: "desktop",
  MANIFEST_API_KEY: "desktop",
  GITHUB_COPILOT_TOKEN: "desktop",
  github_branch: "web",
  github_cdn_url: "web",
  idrivee2_access_key: "desktop",
  idrivee2_secret_key: "desktop",
  idrivee2_bucket: "desktop",
  idrivee2_endpoint: "desktop",
  b2_access_key: "desktop",
  b2_secret_key: "desktop",
  b2_bucket: "desktop",
  b2_endpoint: "desktop",
  revalidate_secret: "web",
  fb_session_cookie: "desktop",
  fb_cookie_expires: "desktop",
  use_cloud: "desktop",
};

const META: Record<CredentialName, { label: string; note: string; service: string }> = {
  turso_url: { label: "Turso ডেটাবেস URL", note: "shared cloud DB", service: "database" },
  turso_token: { label: "Turso টোকেন", note: "libsql auth", service: "database" },
  github_pat: { label: "GitHub PAT", note: "hoichoi-content mirror", service: "github" },
  github_repo: { label: "GitHub repo", note: "owner/name", service: "github" },
  GOOGLE_API_KEY: { label: "Google Gemini", note: "rewrite + fact-gate", service: "llm" },
  GROQ_API_KEY: { label: "Groq", note: "fast LLM fallback", service: "llm" },
  OPENROUTER_API_KEY: { label: "OpenRouter", note: "বিকল্প LLM", service: "llm" },
  OLLAMA_BASE_URL: { label: "Ollama", note: "local LLM", service: "llm" },
  MISTRAL_API_KEY: { label: "Mistral", note: "free-tier LLM", service: "llm" },
  OPENAI_API_KEY: { label: "OpenAI", note: "paid LLM fallback", service: "llm" },
  MANIFEST_API_KEY: { label: "Manifest AI", note: "manifest.build router", service: "llm" },
  GITHUB_COPILOT_TOKEN: { label: "GitHub Copilot", note: "free LLM endpoint", service: "llm" },
  github_branch: { label: "GitHub branch", note: "jsDelivr CDN branch", service: "github" },
  github_cdn_url: { label: "GitHub CDN URL", note: "jsDelivr base (ঐচ্ছিক)", service: "github" },
  idrivee2_access_key: { label: "IDrive e2 Access key", note: "media storage", service: "storage" },
  idrivee2_secret_key: { label: "IDrive e2 Secret key", note: "S3 SigV4", service: "storage" },
  idrivee2_bucket: { label: "IDrive e2 Bucket", note: "media storage", service: "storage" },
  idrivee2_endpoint: { label: "IDrive e2 Endpoint", note: "https://www.idrivee2.com", service: "storage" },
  b2_access_key: { label: "Backblaze keyID", note: "media storage", service: "storage" },
  b2_secret_key: { label: "Backblaze appKey", note: "S3 SigV4", service: "storage" },
  b2_bucket: { label: "Backblaze Bucket", note: "media storage", service: "storage" },
  b2_endpoint: { label: "Backblaze Endpoint", note: "https://s3.<region>.backblazeb2.com", service: "storage" },
  revalidate_secret: { label: "Revalidate secret", note: "web cache refresh", service: "vercel" },
  fb_session_cookie: { label: "Facebook সেশন", note: "graph read", service: "facebook" },
  fb_cookie_expires: { label: "Cookie মেয়াদ", note: "expiry tracking", service: "facebook" },
  use_cloud: { label: "Cloud sync মোড", note: "shared Turso", service: "vault" },
};

const SCOPE_STYLE: Record<string, string> = {
  desktop: "border-sky-400/40 text-sky-300",
  web: "border-violet-400/40 text-violet-300",
  both: "border-lime/40 text-lime",
};

const SCOPE_BN: Record<string, string> = {
  desktop: "ডেস্কটপ",
  web: "ওয়েব",
  both: "উভয়",
};

const ORDER: CredentialName[] = [
  "turso_url",
  "turso_token",
  "github_pat",
  "github_repo",
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
];

const mask = (v: string) => "•".repeat(Math.max(6, Math.min(12, v.length)));

export default function Vault({
  configured,
  onEdit,
}: {
  configured: Partial<Record<CredentialName, boolean>>;
  /** Jump to the settings keychain panel (defined in Settings). */
  onEdit?: (name: CredentialName) => void;
}) {
  const [values, setValues] = useState<Partial<Record<CredentialName, string>>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const [copiedAll, setCopiedAll] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const map: Partial<Record<CredentialName, string>> = {};
      for (const name of ORDER) {
        const v = await getCredential(name);
        if (alive) map[name] = v ?? undefined;
      }
      // Keys stored as DB provider overrides are real run-scoped secrets; merge
      // them in so previously-saved boxes (mistral/openai/manifest/copilot…)
      // show as filled even though they never lived in the Stronghold vault.
      try {
        const provs = await deskProviders(await getRunEnv());
        for (const p of provs) {
          const n = p.api_key_env_var as CredentialName;
          if (alive && n && p.api_key && ORDER.includes(n)) map[n] = p.api_key;
        }
      } catch {
        /* provider list is optional */
      }
      if (alive) setValues(map);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const copyOne = async (name: CredentialName, v: string) => {
    const envName = envNameFor(name);
    try {
      await navigator.clipboard.writeText(envName ? `${envName}=${v}` : v);
      setCopied((m) => ({ ...m, [name]: true }));
      setTimeout(() => setCopied((m) => ({ ...m, [name]: false })), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  const copyAll = async () => {
    const payload: string[] = [];
    for (const name of ORDER) {
      const envName = envNameFor(name);
      const v = values[name];
      if (envName && v) payload.push(`${envName}=${v}`);
    }
    try {
      await navigator.clipboard.writeText(payload.join("\n"));
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  };

  const present = ORDER.filter((n) => configured[n]).length;
  const total = ORDER.length;

  return (
    <div className="scroll-slim h-full overflow-auto p-4">
      <div className="flex flex-col">
      <div className="panel overflow-hidden rounded-2xl">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/8 px-5 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-alizarin/15 text-alizarin">
            <KeyRound size={15} />
          </span>
          <div>
            <p className="font-serif-bn text-[17px] font-bold text-white">API ভল্ট</p>
            <p className="font-mono-x text-[9px] tracking-[0.22em] text-white/35 uppercase">
              STRONGHOLD · AES-256 · {toBn(present)}/{toBn(total)} কী সক্রিয়
            </p>
          </div>
          <button
            onClick={() => void copyAll()}
            className="ml-auto flex items-center gap-2 rounded-lg border border-white/12 bg-white/[0.05] px-3.5 py-2 text-[11px] font-semibold text-white/80 transition-all duration-300 hover:border-lime/50 hover:text-lime"
          >
            {copiedAll ? <Check size={12} /> : <Copy size={12} />}
            {copiedAll ? "কপি হয়েছে (.env)" : "সব কপি করুন (.env)"}
          </button>
        </div>

        <div className="scroll-slim overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="font-mono-x text-[9.5px] tracking-[0.18em] text-white/35 uppercase">
                <th className="px-5 py-3 font-medium">সার্ভিস</th>
                <th className="px-3 py-3 font-medium">এনভি ভেরিয়েবল</th>
                <th className="px-3 py-3 font-medium">মান</th>
                <th className="px-3 py-3 font-medium">স্কোপ</th>
                <th className="px-3 py-3 font-medium">স্ট্যাটাস</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {ORDER.map((name) => {
                const meta = META[name];
                const Icon = SERVICE_ICON[meta.service] ?? KeyRound;
                const v = values[name];
                const has = Boolean(configured[name] || v);
                const scope = SCOPE[name];
                const isOpen = Boolean(revealed[name]);
                const isCopied = Boolean(copied[name]);
                return (
                  <tr key={name} className="group transition-colors duration-200 hover:bg-white/[0.035]">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-white/70">
                          <Icon size={13.5} />
                        </span>
                        <div>
                          <p className="text-[12px] font-semibold text-white/90">{meta.label}</p>
                          <p className="text-[10px] text-white/40">{meta.note}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 font-mono-x text-[10.5px] text-white/60">
                      {envNameFor(name) ?? "·"}
                    </td>
                    <td className="px-3 py-3.5">
                      {has ? (
                        <div className="flex items-center gap-1.5">
                          <code className="rounded-md border border-white/10 bg-night px-2.5 py-1.5 font-mono-x text-[10.5px] tracking-wide text-amberx/90">
                            {isOpen ? v : mask(v ?? "")}
                          </code>
                          <button
                            onClick={() => setRevealed((m) => ({ ...m, [name]: !m[name] }))}
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-white/60 transition-colors hover:border-white/40 hover:text-white"
                            title={isOpen ? "লুকান" : "দেখান"}
                          >
                            {isOpen ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                          <button
                            onClick={() => void copyOne(name, v ?? "")}
                            className={`flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${
                              isCopied
                                ? "border-lime/60 text-lime"
                                : "border-white/10 text-white/60 hover:border-lime/50 hover:text-lime"
                            }`}
                            title="কপি"
                          >
                            {isCopied ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        </div>
                      ) : (
                        <span className="font-mono-x text-[10.5px] text-white/30">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-1 text-[9.5px] font-semibold ${
                          SCOPE_STYLE[scope] ?? SCOPE_STYLE.both
                        }`}
                      >
                        {SCOPE_BN[scope]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {has ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-lime/12 px-2.5 py-1 text-[10px] font-semibold text-lime">
                          <span className="h-1.5 w-1.5 rounded-full bg-lime" /> সক্রিয়
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amberx/12 px-2.5 py-1 text-[10px] font-semibold text-amberx">
                          <RotateCw size={10} /> রোটেশন দরকার
                        </span>
                      )}
                      {onEdit && (
                        <button
                          onClick={() => onEdit(name)}
                          className="ml-2 text-[10px] font-semibold text-white/45 underline hover:text-white"
                        >
                          edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-3 font-mono-x text-[10px] tracking-[0.14em] text-white/30 uppercase">
        মান Stronghold-এ এনক্রিপ্ট করা; রিভিল করলে UI-তে সাময়িক দেখায়, স্থায়ীভাবে নয়।
      </p>
      </div>
    </div>
  );
}