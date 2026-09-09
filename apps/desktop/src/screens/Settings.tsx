import { useEffect, useState } from "react";
import {
  getCredential,
  storeCredential,
  removeCredential,
  getRunEnv,
  getEnvFromVault,
  isCloudSync,
  type CredentialName,
} from "../lib/vault";
import {
  settingsGet,
  settingsSet,
  backupExport,
  backupImport,
  resetDb,
  syncDb,
} from "../lib/tauri";
import { pushGithubSecret } from "../lib/github";

const FIELDS: Array<{ name: CredentialName; label: string; secret: boolean }> = [
  { name: "turso_url", label: "TURSO_DATABASE_URL", secret: false },
  { name: "turso_token", label: "TURSO_AUTH_TOKEN", secret: true },
  { name: "github_pat", label: "GitHub PAT", secret: true },
  { name: "github_repo", label: "GitHub repo (owner/name)", secret: false },
  { name: "GOOGLE_API_KEY", label: "Google Gemini API key", secret: true },
  { name: "GROQ_API_KEY", label: "Groq API key", secret: true },
  { name: "OPENROUTER_API_KEY", label: "OpenRouter API key", secret: true },
  { name: "OLLAMA_BASE_URL", label: "Ollama base URL", secret: false },
];

const BRAND_FIELDS: Array<{ key: string; label: string; secret?: boolean }> = [
  { key: "site_name", label: "সাইট নাম / App name" },
  { key: "slogan_bn", label: "স্লোগান (slogan)" },
  { key: "tagline", label: "ট্যাগলাইন (tagline)" },
  { key: "logo_url", label: "Logo URL (empty = text)" },
  { key: "favicon_url", label: "Favicon URL (empty = default)" },
  { key: "accent_color", label: "Accent color (hex)" },
];

export default function Settings({
  refresh,
  refreshBrand,
}: {
  refresh: () => Promise<void>;
  refreshBrand: () => Promise<void>;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [brand, setBrand] = useState<Record<string, string>>({});
  const [cloud, setCloud] = useState<boolean | null>(null);
  const [brandMsg, setBrandMsg] = useState<string | null>(null);
  const [brandErr, setBrandErr] = useState<string | null>(null);

  const [bkPass, setBkPass] = useState("");
  const [bkMsg, setBkMsg] = useState<string | null>(null);
  const [bkErr, setBkErr] = useState<string | null>(null);

  const show = (m: string) => {
    setMsg(m);
    setErr(null);
  };
  const fail = (e: unknown) => {
    setErr(String(e));
    setMsg(null);
  };

  const save = async (f: (typeof FIELDS)[number]) => {
    const v = values[f.name];
    if (v == null || v === "") return;
    try {
      if (f.secret) {
        await storeCredential(f.name, v.trim());
        await pushGithubSecret(f.name, v.trim()).catch(() => {});
      } else {
        await storeCredential(f.name, v.trim());
      }
      show(`${f.label} saved`);
      setValues((prev) => ({ ...prev, [f.name]: "" }));
      await refresh();
    } catch (e) {
      fail(e);
    }
  };

  const clear = async (f: (typeof FIELDS)[number]) => {
    await removeCredential(f.name);
    show(`${f.label} removed`);
    await refresh();
  };

  const refreshMode = async () => {
    setCloud(await isCloudSync());
  };

  const loadBrand = async () => {
    try {
      const s = await settingsGet(await getRunEnv());
      const rec: Record<string, string> = {};
      for (const f of BRAND_FIELDS) {
        const v = s[f.key];
        if (typeof v === "string") rec[f.key] = v;
      }
      setBrand(rec);
    } catch {
      /* ব্যান্ডিং লোড ব্যর্থ — ফিল্ড খালি থাকবে */
    }
  };

  const toggleCloud = async (on: boolean) => {
    await storeCredential("use_cloud", on ? "1" : "0");
    setCloud(on);
    show(on ? "Cloud sync ON — desktop writes to the shared Turso DB" : "Local mode — desktop uses its own file DB");
    await refresh();
    await loadBrand();
  };

  // Auto-load branding on mount so the fields are populated immediately
  // (not only after the user clicks "Load current").
  useEffect(() => {
    void loadBrand();
  }, []);

  const saveBrand = async () => {
    try {
      const fields: Record<string, string> = {};
      for (const f of BRAND_FIELDS) if ((brand[f.key] ?? "").trim() !== "") fields[f.key] = brand[f.key].trim();
      if (Object.keys(fields).length === 0) return;
      await settingsSet(await getRunEnv(), fields);
      setBrandMsg("সংরক্ষিত — web ও desktop-এ সঙ্গে সঙ্গে কার্যকর");
      setBrandErr(null);
      // Tell the parent (App) to re-load branding so the sidebar + other screens
      // pick up the new site_name / slogan immediately.
      await refreshBrand();
    } catch (e) {
      setBrandErr(String(e));
    }
  };

  const needBkPass = (): string | null => {
    if (bkPass.trim().length < 4) return "ব্যাকআপ passphrase দিতে হবে (কমপক্ষে ৪ অক্ষর)";
    return null;
  };

  const doExport = async () => {
    const missing = needBkPass();
    if (missing) {
      setBkMsg(null);
      setBkErr(missing);
      return;
    }
    try {
      setBkMsg(null);
      setBkErr(null);
      const path = await backupExport(bkPass, await getEnvFromVault());
      setBkMsg(`ব্যাকআপ লেখা হয়েছে:\n${path}`);
    } catch (e) {
      setBkErr(String(e));
    }
  };

  const doImport = async () => {
    const missing = needBkPass();
    if (missing) {
      setBkMsg(null);
      setBkErr(missing);
      return;
    }
    try {
      setBkMsg(null);
      setBkErr(null);
      await backupImport(bkPass, await getEnvFromVault());
      setBkMsg("ব্যাকআপ পুনরুদ্ধার হয়েছে — content ও settings এখন backup-এর মতো।");
      await refresh();
    } catch (e) {
      setBkErr(String(e));
    }
  };

  const doReset = async () => {
    const missing = needBkPass();
    if (missing) {
      setBkMsg(null);
      setBkErr(missing);
      return;
    }
    if (!window.confirm("সব কন্টেন্ট মুছে যাবে এবং settings/config default-এ ফিরবে (admin রাখা হবে)। নিশ্চিত?")) return;
    try {
      setBkMsg(null);
      setBkErr(null);
      await resetDb(await getRunEnv());
      setBkMsg("রিসেট সম্পন্ন — content wiped, settings default-এ।");
      await refresh();
    } catch (e) {
      setBkErr(String(e));
    }
  };

  const doSync = async (dir: "push" | "pull") => {
    try {
      setBkMsg(null);
      setBkErr(null);
      const res = await syncDb(dir, await getRunEnv());
      setBkMsg(res.length > 400 ? res.slice(0, 400) : res);
    } catch (e) {
      setBkErr(String(e));
    }
  };

  const Show = ({ name }: { name: CredentialName }) => {
    const [has, setHas] = useState<boolean | null>(null);
    void getCredential(name).then((v) => setHas(v !== null));
    return has === null ? (
      <span className="font-mono text-[10px] text-ink-soft/60">…</span>
    ) : has ? (
      <button onClick={() => void edit(name)} className="font-mono text-[10px] text-lime bg-ink px-2 py-0.5">
        ✓ set — edit
      </button>
    ) : (
      <span className="font-mono text-[10px] text-ink-soft/60">○ empty</span>
    );
  };

  const edit = async (name: CredentialName) => {
    const existing = await getCredential(name);
    setValues((prev) => ({ ...prev, [name]: existing ?? "" }));
  };

  return (
    <div className="mx-auto max-w-3xl p-8">
      <p className="panel-title">Settings</p>
      <h2 className="mt-1 font-serif-bn text-[30px] font-black">সেটিংস</h2>
      <p className="mt-1 text-[12.5px] text-ink-soft">
        মানগুলো Stronghold-এ এনক্রিপ্টেড; UI-তে কখনো প্লেইনটেক্সট দেখানো হয় না।
      </p>

      {msg && <p className="mt-3 bg-lime px-3 py-2 text-[12px] font-bold">✓ {msg}</p>}
      {err && <p className="mt-3 bg-alizarin px-3 py-2 text-[12px] font-bold text-paper">✕ {err}</p>}

      <div className="panel mt-5">
        <p className="panel-title">Database sync · cloud ↔ local</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button className={cloud !== false ? "btn bg-lime" : "btn-ghost"} onClick={() => void toggleCloud(true)}>
            ☁ Cloud sync (default)
          </button>
          <button className={cloud === false ? "btn bg-lime" : "btn-ghost"} onClick={() => void toggleCloud(false)}>
            ◌ Local only
          </button>
          <button className="btn-ghost" onClick={() => void refreshMode()}>
            ↻ refresh
          </button>
        </div>
        <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">
          {cloud === null
            ? "Cloud সিঙ্ক: desktop পাইপলাইন সরাসরি shared Turso DB-তে লেখে → web অ্যাডমিন তাৎক্ষণিক দেখে। GitHub-এ কিছুই আপলোড লাগে না।"
            : cloud
              ? "বর্তমান: ☁ Cloud sync — runs + settings shared Turso DB (web)-এ যায়।"
              : "বর্তমান: ◌ Local only — desktop নিজের file DB-তে চলে; ম্যানুয়াল resync হবে।"}
        </p>
      </div>

      <div className="panel mt-5">
        <p className="panel-title">Site branding · web & desktop</p>
        <div className="mt-3 grid gap-3">
          {BRAND_FIELDS.map((f) => (
            <label key={f.key} className="flex items-center gap-3">
              <span className="w-48 shrink-0 text-[11px] font-bold uppercase tracking-wide text-ink-soft">{f.label}</span>
              <input
                className="field flex-1"
                value={brand[f.key] ?? ""}
                onChange={(e) => setBrand((prev) => ({ ...prev, [f.key]: e.target.value }))}
              />
            </label>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn" onClick={() => void saveBrand()}>
            💾 Save branding
          </button>
          <button className="btn-ghost" onClick={() => void loadBrand()}>
            Load current
          </button>
        </div>
        {brandMsg && <p className="mt-2 text-[11.5px] font-bold text-ink">✓ {brandMsg}</p>}
        {brandErr && <p className="mt-2 text-[11.5px] font-bold text-alizarin">✕ {brandErr}</p>}
      </div>

      <div className="panel mt-5">
        <p className="panel-title">ব্যাকআপ, রিসেট ও সিঙ্ক</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="password"
            className="field min-w-56 flex-1"
            placeholder="backup passphrase (encryption key)"
            value={bkPass}
            onChange={(e) => setBkPass(e.target.value)}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn" onClick={() => void doExport()}>
            ⬇ Export backup
          </button>
          <button className="btn-ghost" onClick={() => void doImport()}>
            ⬆ Restore backup
          </button>
          <button className="btn-ghost" onClick={() => void doReset()}>
            ⟲ Reset content
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn" onClick={() => void doSync("push")}>
            ☁ Push local → cloud
          </button>
          <button className="btn-ghost" onClick={() => void doSync("pull")}>
            ⬇ Pull cloud → local
          </button>
        </div>
        <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">
          ব্যাকআপ ফাইল AES-256-GCM দিয়ে এনক্রিপ্ট হয়; passphrase কখনো ডিস্কে লেখা হয় না। Restore
          আগের ডেটা REPLACE করে। Push = local file DB → shared Turso; Pull = cloud → local।
        </p>
        {bkMsg && <p className="mt-2 whitespace-pre-line text-[11.5px] font-bold text-ink">✓ {bkMsg}</p>}
        {bkErr && <p className="mt-2 text-[11.5px] font-bold text-alizarin">✕ {bkErr}</p>}
      </div>

      <div className="mt-5 space-y-3">
        {FIELDS.map((f) => (
          <div key={f.name} className="panel flex items-center gap-3">
            <div className="w-64 shrink-0">
              <p className="font-mono text-[10.5px] font-bold">{f.label}</p>
              <Show name={f.name} />
            </div>
            <div className="flex flex-1 items-center gap-2">
              <input
                className="field flex-1"
                type={f.secret ? "password" : "text"}
                placeholder={f.secret ? "henry… (hidden)" : "value"}
                value={values[f.name] ?? ""}
                onChange={(e) => setValues((prev) => ({ ...prev, [f.name]: e.target.value }))}
              />
              <button className="btn" disabled={!(values[f.name] ?? "").trim()} onClick={() => void save(f)}>
                Save
              </button>
              <button className="btn-ghost" onClick={() => void clear(f)}>
                Clear
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}