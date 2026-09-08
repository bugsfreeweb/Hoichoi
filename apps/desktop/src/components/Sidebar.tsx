import type { View } from "../App";
import { startPipeline } from "../lib/tauri";
import { getRunEnv, type CredentialName } from "../lib/vault";

const NAV: Array<{ id: View; label: string; en: string }> = [
  { id: "dashboard", label: "ড্যাশবোর্ড", en: "DASHBOARD" },
  { id: "pipeline", label: "পাইপলাইন", en: "PIPELINE" },
  { id: "desk", label: "ওয়েব ডেস্ক", en: "WEB DESK" },
  { id: "settings", label: "সেটিংস", en: "SETTINGS" },
];

const KEY_LABELS: Record<CredentialName, string> = {
  turso_url: "TURSO_DATABASE_URL",
  turso_token: "TURSO_AUTH_TOKEN",
  github_pat: "GitHub PAT",
  github_repo: "GitHub repo",
  GOOGLE_API_KEY: "Gemini key",
  GROQ_API_KEY: "Groq key",
  OPENROUTER_API_KEY: "OpenRouter key",
  OLLAMA_BASE_URL: "Ollama URL",
  fb_session_cookie: "FB session cookie",
  fb_cookie_expires: "FB cookie expiry",
  use_cloud: "Cloud sync",
};

export default function Sidebar(props: {
  view: View;
  setView: (v: View) => void;
  configured: Partial<Record<CredentialName, boolean>>;
  running: boolean;
  setRunning: (r: boolean) => void;
  onLog: (line: string) => void;
}) {
  const { view, setView, configured, running, setRunning, onLog } = props;

  const run = async () => {
    if (running) return;
    setRunning(true);
    onLog(`[desk] pipeline starting @ ${new Date().toLocaleTimeString("bn-BD")}`);
    try {
      const env = await getRunEnv();
      await startPipeline(env);
    } catch (err) {
      onLog(`[desk] failed to start: ${String(err)}`);
      setRunning(false);
    }
  };

  const keys = Object.entries(configured) as Array<[CredentialName, boolean]>;

  return (
    <aside className="flex w-[236px] shrink-0 flex-col border-r border-ink/15 bg-paper-deep">
      <div className="border-b border-ink/15 px-4 py-4">
        <p className="font-serif-bn text-[20px] font-black leading-none">
          হইচই<span className="text-alizarin">।</span>
        </p>
        <p className="mt-1 font-mono text-[9px] tracking-[0.24em] text-ink-soft uppercase">
          Hoichoi Desk · v1
        </p>
      </div>

      <nav className="border-b border-ink/15 px-2 py-3">
        {NAV.map((n) => (
          <button
            key={n.id}
            onClick={() => setView(n.id)}
            className={`mb-1 flex w-full items-center justify-between px-3 py-2 text-left text-[13px] ${
              view === n.id ? "bg-ink text-paper" : "hover:bg-paper"
            }`}
          >
            <span>{n.label}</span>
            <span className={`font-mono text-[8px] tracking-widest ${view === n.id ? "text-paper/60" : "text-ink-soft/60"}`}>
              {n.en}
            </span>
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-auto px-3 py-3">
        <p className="panel-title">Keychain · Stronghold</p>
        <ul className="mt-2 space-y-1">
          {keys.map(([name, ok]) => (
            <li key={name} className="flex items-center justify-between gap-2 text-[11.5px]">
              <span className="truncate font-mono text-[10px]">{KEY_LABELS[name]}</span>
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${ok ? "bg-lime" : "bg-ink-soft/40"}`} />
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-ink/15 p-3">
        <button onClick={() => void run()} disabled={running} className="btn w-full">
          {running ? "· চলছে …" : "▶ Run pipeline"}
        </button>
      </div>
    </aside>
  );
}