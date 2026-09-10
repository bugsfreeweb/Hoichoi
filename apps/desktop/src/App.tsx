import { useEffect, useState, useCallback } from "react";
import { Wifi, Database, GitBranch } from "lucide-react";
import {
  listen,
  openAdmin,
  startPipeline,
  stopPipeline,
  settingsGet,
  deskSources,
  deskQueue,
  deskStats,
  type DeskQueueRow,
  type DeskSource,
  type DeskStats,
} from "./lib/tauri";
import {
  getRunEnv,
  listConfigured,
  type CredentialName,
} from "./lib/vault";
import { SITE_URL } from "./lib/site";
import { bnClock } from "./lib/format";
import SetupWizard from "./components/SetupWizard";
import TitleBar from "./components/TitleBar";
import Sidebar from "./components/Sidebar";
import Dashboard from "./screens/Dashboard";
import Watchlist from "./screens/Watchlist";
import Queue from "./screens/Queue";
import Collector from "./screens/Collector";
import Vault from "./screens/Vault";
import Settings from "./screens/Settings";
import Moderation from "./screens/Moderation";

export type View =
  | "dashboard"
  | "watchlist"
  | "queue"
  | "collector"
  | "vault"
  | "settings"
  | "moderation";

const ONBOARD_KEY = "hoichoi.desk.onboarded.v1";
const VIEW_ORDER: View[] = [
  "dashboard",
  "watchlist",
  "queue",
  "collector",
  "vault",
  "settings",
  "moderation",
];

function StatusClock() {
  const [clock, setClock] = useState("");
  useEffect(() => {
    const t = setInterval(() => setClock(bnClock(true)), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="ml-auto">
      {clock || "· · : · · : · ·"} · ঢাকা
    </span>
  );
}

export default function App() {
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem(ONBOARD_KEY) === "1");
  const [view, setView] = useState<View>("dashboard");
  const [configured, setConfigured] = useState<Partial<Record<CredentialName, boolean>>>({});
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [sources, setSources] = useState<DeskSource[]>([]);
  const [queueRows, setQueueRows] = useState<DeskQueueRow[]>([]);
  const [statsData, setStatsData] = useState<DeskStats | null>(null);
  const [hours, setHours] = useState(2);

  const refresh = useCallback(async () => {
    try {
      setConfigured(await listConfigured());
      const env = await getRunEnv();
      const s = await settingsGet(env).catch(() => null);
      if (s && Number(s.pipeline_hours) > 0) setHours(Number(s.pipeline_hours));
      const [src, rows, stats] = await Promise.all([
        deskSources(env),
        deskQueue(env),
        deskStats(env).catch(() => null),
      ]);
      setSources(src);
      setQueueRows(rows);
      setStatsData(stats);
    } catch {
      /* partial refresh failures are non-fatal */
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      const i = ["1", "2", "3", "4", "5", "6", "7"].indexOf(e.key);
      if (i >= 0) setView(VIEW_ORDER[i]);
    };
    window.addEventListener("keydown", onKey);
    const unlog = listen<string>("pipeline://log", (e) => {
      setLogs((prev) => [...prev.slice(-399), e.payload]);
    });
    const undone = listen<number>("pipeline://done", (e) => {
      setRunning(false);
      setLogs((prev) => [...prev, `── exit code ${e.payload} ──`]);
      void refresh();
    });
    return () => {
      window.removeEventListener("keydown", onKey);
      void unlog.then((f) => f());
      void undone.then((f) => f());
    };
  }, [refresh]);

  const runNow = async () => {
    if (running) return;
    setRunning(true);
    setLogs((prev) => [...prev, `[desk] pipeline starting @ ${bnClock(true)}`]);
    try {
      await startPipeline(await getRunEnv());
    } catch (err) {
      setLogs((prev) => [...prev, `[desk] failed to start: ${String(err)}`]);
      setRunning(false);
    }
  };

  const stopNow = async () => {
    if (!running) return;
    try {
      await stopPipeline();
    } catch (err) {
      setLogs((prev) => [...prev, `[desk] stop failed: ${String(err)}`]);
    }
  };

  if (!onboarded) {
    return (
      <SetupWizard
        onDone={async () => {
          localStorage.setItem(ONBOARD_KEY, "1");
          setOnboarded(true);
          await refresh();
        }}
      />
    );
  }

  const dbDriver = configured.turso_url ? "TURSO" : "LOCAL";

  const jump = (v: View) => setView(v);

  return (
    <div className="desk-scene flex h-full items-center justify-center overflow-hidden p-3">
      <div className="tauri-win flex h-full w-full flex-col overflow-hidden rounded-xl">
        <TitleBar />

        {/* menubar */}
        <div className="flex h-8 shrink-0 items-center gap-1 border-b border-white/8 bg-[#0e1219] px-2 text-[11.5px] text-white/55">
          <button
            onClick={() => void openAdmin(SITE_URL)}
            className="rounded px-2.5 py-1 hover:bg-white/8 hover:text-white"
          >
            ফাইল
          </button>
          <button
            onClick={() => jump("watchlist")}
            className="rounded px-2.5 py-1 hover:bg-white/8 hover:text-white"
          >
            সোর্স
          </button>
          <button
            onClick={() => jump("collector")}
            className="rounded px-2.5 py-1 hover:bg-white/8 hover:text-white"
          >
            রান
          </button>
          <button
            onClick={() => jump("vault")}
            className="rounded px-2.5 py-1 hover:bg-white/8 hover:text-white"
          >
            ভল্ট
          </button>
          <button
            onClick={() => void openAdmin(`${SITE_URL}/system`)}
            className="rounded px-2.5 py-1 hover:bg-white/8 hover:text-white"
          >
            সাহায্য
          </button>
          <span className="ml-auto hidden pr-2 font-mono-x text-[9.5px] tracking-[0.16em] text-white/25 uppercase sm:inline">
            1–7 TABS
          </span>
        </div>

        <div className="flex min-h-0 flex-1">
          <Sidebar
            view={view}
            setView={setView}
            configured={configured}
            running={running}
            onRun={runNow}
            watching={sources.filter((s) => s.is_active).length}
          />

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 bg-[#0c1017]">
              {view === "dashboard" && (
                <Dashboard
                  sources={sources}
                  queueRows={queueRows}
                  statsData={statsData}
                  logs={logs}
                  onOpen={jump}
                  hours={hours}
                />
              )}
              {view === "watchlist" && <Watchlist sources={sources} refresh={refresh} />}
              {view === "queue" && <Queue rows={queueRows} refresh={refresh} />}
              {view === "collector" && (
                <Collector logs={logs} running={running} onStart={() => void runNow()} onStop={() => void stopNow()} />
              )}
              {view === "vault" && <Vault configured={configured} />}
              {view === "settings" && <Settings refresh={refresh} refreshBrand={async () => {}} />}
              {view === "moderation" && <Moderation />}
            </div>
          </div>
        </div>

        {/* statusbar */}
        <footer className="flex h-7 shrink-0 items-center gap-4 border-t border-white/8 bg-[#0a0d12] px-3 font-mono-x text-[9.5px] tracking-[0.12em] text-white/40 uppercase">
          <span className="flex items-center gap-1.5 text-lime">
            <Wifi size={10} /> TAURI 2.1
          </span>
          <span className="flex items-center gap-1.5 text-lime">
            <Database size={10} /> {dbDriver} · CONNECTED
          </span>
          <span className="flex items-center gap-1.5">
            <GitBranch size={10} /> HOICHOI-CONTENT
          </span>
          <StatusClock />
        </footer>
      </div>
    </div>
  );
}