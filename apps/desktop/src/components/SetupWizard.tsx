import { useState } from "react";
import { storeCredential } from "../lib/vault";
import { pushGithubSecret } from "../lib/github";

const PROVIDERS = [
  { key: "GOOGLE_API_KEY", name: "Google Gemini 2.0 Flash", model: "gemini-2.0-flash", free: true },
  { key: "GROQ_API_KEY", name: "Groq Llama 3.3 70B", model: "llama-3.3-70b-versatile", free: true },
  { key: "OPENROUTER_API_KEY", name: "OpenRouter Free", model: "meta-llama/llama-3.3-70b:free", free: true },
  { key: "OLLAMA_BASE_URL", name: "Ollama (local)", model: "llama3.2", free: true },
];

type Step = 1 | 2 | 3 | 4 | 5;

export default function SetupWizard({ onDone }: { onDone: () => Promise<void> }) {
  const [step, setStep] = useState<Step>(1);
  const [tursoUrl, setTursoUrl] = useState("");
  const [tursoToken, setTursoToken] = useState("");
  const [ghPat, setGhPat] = useState("");
  const [ghRepo, setGhRepo] = useState("");
  const [providerKeys, setProviderKeys] = useState<Record<string, string>>({});
  const [fbCookie, setFbCookie] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = () => setStep((s) => Math.min(5, (s + 1) as Step) as Step);
  const back = () => setStep((s) => Math.max(1, (s - 1) as Step) as Step);

  const saveStep1 = async () => {
    setBusy(true);
    try {
      await storeCredential("turso_url", tursoUrl.trim());
      await storeCredential("turso_token", tursoToken.trim());
      next();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const saveStep2 = async () => {
    setBusy(true);
    try {
      if (ghPat.trim()) await storeCredential("github_pat", ghPat.trim());
      if (ghRepo.trim()) await storeCredential("github_repo", ghRepo.trim().replace(/^https:\/\/github\.com\//, ""));
      next();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const saveStep3 = async () => {
    setBusy(true);
    try {
      for (const [k, v] of Object.entries(providerKeys)) {
        if (!v.trim()) continue;
        await storeCredential(k as never, v.trim());
        if (ghPat.trim()) {
          try {
            await pushGithubSecret(k, v.trim());
          } catch {
            /* GH not reachable — local-only mode; not fatal */
          }
        }
      }
      next();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const onPickCookie = async (file: File) => {
    const text = await file.text();
    setFbCookie(text);
  };

  const saveStep4 = async () => {
    if (!tosAccepted) {
      setError("সেটআপ চালু করতে ফেসবুকের টার্মস স্বীকার করতে হবে।");
      return;
    }
    setBusy(true);
    try {
      if (fbCookie.trim()) {
        await storeCredential("fb_session_cookie", fbCookie.trim());
        await storeCredential("fb_cookie_expires", new Date(Date.now() + 45 * 86400_000).toISOString());
      }
      next();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    setBusy(true);
    try {
      await onDone();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const stepDot = (n: Step, label: string) => (
    <button
      onClick={() => step > n && setStep(n)}
      className={`px-2 py-1 font-mono text-[9px] tracking-[0.2em] uppercase ${
        step >= n ? "text-ink" : "text-ink-soft/50"
      } ${step > n ? "hover:text-alizarin" : ""}`}
    >
      {step >= n ? "●" : "○"} {label}
    </button>
  );

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <p className="font-serif-bn text-[34px] font-black">
          হইচই<span className="text-alizarin">।</span> ডেস্ক
        </p>
        <p className="mt-1 font-mono text-[10px] tracking-[0.26em] text-ink-soft uppercase">
          First-run setup · credentials encrypted locally (AES-256-GCM)
        </p>

        <div className="mt-5 flex items-center gap-1 border-b border-ink/15 pb-2">
          {stepDot(1, "DB")}
          {stepDot(2, "GitHub")}
          {stepDot(3, "AI")}
          {stepDot(4, "FB")}
          {stepDot(5, "Finish")}
        </div>

        <div className="panel mt-4">
          {step === 1 && (
            <div className="space-y-3">
              <p className="panel-title">Step 1/5 · Turso database</p>
              <p className="text-[13px] text-ink-soft">
                আপনার Turso ডেটাবেস URL ও টোকেন দিন। <b>মনে রাখুন</b> — টোকেনটির
                read/write ক্ষমতা আছে; Stronghold-এ এনক্রিপ্টেড অবস্থায় থাকবে, কখনো ডিস্কে প্লেইনটেক্সটে নয়।
              </p>
              <label className="block">
                <span className="field-label font-mono text-[10px] uppercase text-ink-soft">TURSO_DATABASE_URL</span>
                <input className="field mt-1" placeholder="libsql://hoichoi-xxxx.turso.io" value={tursoUrl} onChange={(e) => setTursoUrl(e.target.value)} />
              </label>
              <label className="block">
                <span className="font-mono text-[10px] uppercase text-ink-soft">TURSO_AUTH_TOKEN</span>
                <input className="field mt-1" type="password" placeholder="eyJ…" value={tursoToken} onChange={(e) => setTursoToken(e.target.value)} />
              </label>
              {error && <p className="text-[12px] text-alizarin">{error}</p>}
              <div className="flex justify-between">
                <button
                  className="btn-ghost"
                  onClick={() => void (async () => {
                    try { await storeCredential("use_cloud", "0"); } catch { /* keep going */ }
                    next();
                  })()}
                  disabled={busy}
                >
                  Skip — set up later →
                </button>
                <button className="btn" onClick={() => void saveStep1()} disabled={busy || !tursoUrl.trim() || !tursoToken.trim()}>
                  Save & next →
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="panel-title">Step 2/5 · GitHub Actions mirror (optional)</p>
              <p className="text-[13px] text-ink-soft">
                একটি PAT দিন (scope: <code className="bg-paper px-1">repo</code> +{" "}
                <code className="bg-paper px-1">workflow</code>) যাতে API keys GitHub Secrets-এ
                মিরর করা যায়। স্কিপ করলে অ্যাপ লোকাল-অনলি মোডে চলে (cron ছাড়া)।
              </p>
              <label className="block">
                <span className="font-mono text-[10px] uppercase text-ink-soft">GitHub PAT</span>
                <input className="field mt-1" type="password" placeholder="github_pat_…" value={ghPat} onChange={(e) => setGhPat(e.target.value)} />
              </label>
              <label className="block">
                <span className="font-mono text-[10px] uppercase text-ink-soft">repo (owner/name)</span>
                <input className="field mt-1" placeholder="you/hoichoi" value={ghRepo} onChange={(e) => setGhRepo(e.target.value)} />
              </label>
              {error && <p className="text-[12px] text-alizarin">{error}</p>}
              <div className="flex justify-between">
                <button className="btn-ghost" onClick={back}>← Back</button>
                <button className="btn" onClick={() => void saveStep2()} disabled={busy}>
                  {ghPat.trim() ? "Save & next →" : "Skip →"}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="panel-title">Step 3/5 · AI providers (free tiers)</p>
              <p className="text-[13px] text-ink-soft">
                প্রতিটি প্রোভাইডারের জন্য API key দিন। Resolver priority-order-এ ফলব্যাক করবে।
              </p>
              <div className="space-y-2">
                {PROVIDERS.map((p) => (
                  <div key={p.key} className="flex items-center gap-3">
                    <span className="w-44 truncate text-[13px]">{p.name}</span>
                    <input
                      className="field flex-1"
                      type="password"
                      placeholder={p.model}
                      value={providerKeys[p.key] ?? ""}
                      onChange={(e) => setProviderKeys({ ...providerKeys, [p.key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
              {error && <p className="text-[12px] text-alizarin">{error}</p>}
              <div className="flex justify-between">
                <button className="btn-ghost" onClick={back}>← Back</button>
                <button className="btn" onClick={() => void saveStep3()} disabled={busy}>
                  Save & next →
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <p className="panel-title">Step 4/5 · Facebook session cookie</p>
              <p className="text-[13px] text-ink-soft">
                ব্রাউজার থেকে <code className="bg-paper px-1">c_user</code> +{" "}
                <code className="bg-paper px-1">xs</code> সম্বলিত কুকি JSON/html কোথাও ইমপোর্ট করুন, অথবা বাদ দিন —
                লোকালাই logout-mode স্ক্র্যাপিং-ও চলবে (থ্রোটল ১ req/২s)।
              </p>
              <label className="flex items-center gap-2 text-[12.5px]">
                <input
                  type="checkbox"
                  checked={tosAccepted}
                  onChange={(e) => setTosAccepted(e.target.checked)}
                />
                বুঝেছি — লগ-ইন অবস্থায় স্ক্র্যাপিং আমার পরিচয় দিয়ে কনটেন্ট অ্যাক্সেস করে, ফেসবুকের টার্মস ও
                প্রযোজ্য আইনের দায়িত্ব আমার।
              </label>
              <input
                type="file"
                accept=".txt,.json,.html,.cookies.txt"
                className="field"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onPickCookie(f);
                }}
              />
              {fbCookie && (
                <p className="truncate font-mono text-[10px] text-lime bg-ink px-2 py-1">
                  ✓ cookie imported ({fbCookie.length} chars)
                </p>
              )}
              {error && <p className="text-[12px] text-alizarin">{error}</p>}
              <div className="flex justify-between">
                <button className="btn-ghost" onClick={back}>← Back</button>
                <button className="btn" onClick={() => void saveStep4()} disabled={busy}>
                  Save & next →
                </button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3">
              <p className="panel-title">Step 5/5 · Confirm</p>
              <ul className="space-y-1 text-[13px]">
                <li>· Turso credentials — Stronghold ✓</li>
                <li>· GitHub PAT — {ghPat.trim() ? "Stronghold ✓" : "skipped (local-only)"}</li>
                <li>· AI provider keys — {Object.keys(providerKeys).filter((k) => providerKeys[k]?.trim()).length} configured</li>
                <li>· FB cookie — {fbCookie.trim() ? "Stronghold ✓" : "skipped (logout mode)"}</li>
              </ul>
              {error && <p className="text-[12px] text-alizarin">{error}</p>}
              <div className="flex justify-between">
                <button className="btn-ghost" onClick={back}>← Back</button>
                <button className="btn" onClick={() => void finish()} disabled={busy}>
                  Open ডেস্ক →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}