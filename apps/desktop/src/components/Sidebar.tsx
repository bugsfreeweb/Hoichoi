import type { View } from "../App";
import { startPipeline } from "../lib/tauri";
import { getRunEnv, type CredentialName } from "../lib/vault";
import { LayoutDashboard, ScrollText, Globe, Settings, SquarePlay } from "lucide-react";

const NAV: Array<{ id: View; label: string; icon: typeof LayoutDashboard; k: string }> = [
  { id: "dashboard", label: "মনিটর", icon: LayoutDashboard, k: "1" },
  { id: "pipeline", label: "কালেক্টর", icon: ScrollText, k: "2" },
  { id: "desk", label: "ওয়েব ডেস্ক", icon: Globe, k: "3" },
  { id: "settings", label: "সেটিংস", icon: Settings, k: "4" },
];

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
  const watching = keys.filter(([, ok]) => ok).length;

  return (
    <aside className="flex w-[236px] shrink-0 flex-col border-r border-white/8 bg-[#0a0d12]">
      <div className="flex items-center gap-3 border-b border-white/8 px-4 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-alizarin font-serif-bn text-[17px] font-black text-white">
          হ
        </span>
        <div>
          <p className="font-serif-bn text-[17px] leading-none font-black text-white">
            হইচই ডেস্ক
          </p>
          <p className="mt-1 font-mono-x text-[8.5px] tracking-[0.24em] text-white/40 uppercase">
            TAURI 2 · DESK
          </p>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3">
        <p className="px-3 font-mono-x text-[9px] tracking-[0.2em] text-white/30 uppercase">মেনু</p>
        <div className="mt-2 space-y-0.5">
          {NAV.map((n) => {
            const active = view === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors ${
                  active ? "bg-white text-night" : "text-white/55 hover:bg-white/8 hover:text-white"
                }`}
              >
                <n.icon size={14} />
                <span className="flex-1">{n.label}</span>
                <span className={`font-mono-x text-[9px] ${active ? "text-night/40" : "text-white/25"}`}>
                  {n.k}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-white/8 px-3 py-3">
        <p className="font-mono-x text-[9px] tracking-[0.18em] text-lime uppercase">
          ● CONTROLLER ONLINE
        </p>
        <p className="mt-1 text-[10.5px] text-white/40">
          {watching} কী কনফিগারড
        </p>
      </div>

      <div className="border-t border-white/8 p-3">
        <button
          onClick={() => void run()}
          disabled={running}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-lime px-3 py-2 text-[12px] font-bold uppercase tracking-wider text-night transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <SquarePlay size={13} />
          {running ? "· চলছে …" : "Run pipeline"}
        </button>
      </div>
    </aside>
  );
}