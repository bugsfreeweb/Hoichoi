import { useState } from "react";
import { getCredential, storeCredential, removeCredential, type CredentialName } from "../lib/vault";
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

export default function Settings({ refresh }: { refresh: () => Promise<void> }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

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
      setMsg(`${f.label} saved`);
      setErr(null);
      setValues((prev) => ({ ...prev, [f.name]: "" }));
      await refresh();
    } catch (e) {
      setErr(String(e));
    }
  };

  const clear = async (f: (typeof FIELDS)[number]) => {
    await removeCredential(f.name);
    setMsg(`${f.label} removed`);
    await refresh();
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
    <div className="mx-auto max-w-2xl p-8">
      <p className="panel-title">Settings</p>
      <h2 className="mt-1 font-serif-bn text-[30px] font-black">সেটিংস</h2>
      <p className="mt-1 text-[12.5px] text-ink-soft">
        মানগুলো Stronghold-এ এনক্রিপ্টেড; UI-তে কখনো প্লেইনটেক্সট দেখানো হয় না।
      </p>

      {msg && <p className="mt-3 bg-lime px-3 py-2 text-[12px] font-bold">✓ {msg}</p>}
      {err && <p className="mt-3 bg-alizarin px-3 py-2 text-[12px] font-bold text-paper">✕ {err}</p>}

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