import { useEffect, useState, useCallback, useRef } from "react";
import {
  listen,
  openAdmin,
  isTauri,
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
import { bnClock, toBn } from "./lib/format";
import SetupWizard from "./components/SetupWizard";
import Dashboard from "./screens/Dashboard";
import Watchlist from "./screens/Watchlist";
import Queue from "./screens/Queue";
import Collector from "./screens/Collector";
import Vault from "./screens/Vault";
import Settings from "./screens/Settings";
import Moderation from "./screens/Moderation";
import ThemeToggle from "./components/ThemeToggle";

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

const TAB_LABELS: Record<View, { icon: string; label: string }> = {
  dashboard: { icon: "dash", label: "মনিটর" },
  watchlist: { icon: "radio", label: "ওয়াচলিস্ট" },
  queue: { icon: "list", label: "কনটেন্ট সারি" },
  collector: { icon: "term", label: "কালেক্টর" },
  vault: { icon: "key", label: "API ভল্ট" },
  settings: { icon: "gear", label: "সেটিংস" },
  moderation: { icon: "shield", label: "মন্তব্য মডারেশন" },
};

function StatusClock() {
  const [clock, setClock] = useState("");
  useEffect(() => {
    const t = setInterval(() => setClock(bnClock(true)), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="ml-auto">{clock || "· · : · · : · ·"} · ঢাকা</span>;
}

let _win: null | {
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<void>;
  close: () => Promise<void>;
  startDragging: () => Promise<void>;
} = null;

/** Lazy-import the Tauri window API so titlebar buttons control the OS window. */
function deskWin(): Promise<typeof _win> {
  if (!isTauri()) return Promise.resolve(null);
  if (!_win) {
    return import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
      _win = getCurrentWindow();
      return _win;
    });
  }
  return Promise.resolve(_win);
}

function TabButton({ id, icon, label, active, onClick, shortcut }: {
  id: View;
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
  shortcut: string;
}) {
  const icons: Record<string, React.ReactNode> = {
    dash: <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
    radio: <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8"/></svg>,
    list: <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4.5" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1.2" fill="currentColor" stroke="none"/></svg>,
    term: <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M12 15h5"/></svg>,
    key: <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="15" r="4.5"/><path d="M11.5 11.5L21 2M16.5 6.5l3 3M13.5 9.5l2.5 2.5"/></svg>,
    gear: <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h9M19 7h1M4 17h3M13 17h7"/><circle cx="16" cy="7" r="2.2"/><circle cx="10" cy="17" r="2.2"/><path d="M4 12h16"/><circle cx="9" cy="12" r="2.2"/></svg>,
    shield: <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8 3v6c0 5-3.5 9.5-8 11-4.5-1.5-8-6-8-11V5z"/><path d="M9 12l2 2 4-4"/></svg>,
  };

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 font-medium text-[12.5px] transition-colors ${
        active ? "active" : ""
      }`}
      data-tab={id}
    >
      {icons[icon]}
      <span className="flex-1 text-left">{label}</span>
      <kbd className="font-mono-x text-[9px]">{shortcut}</kbd>
    </button>
  );
}

function MTabsButton({ id, label, active, onClick }: {
  id: View;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-none rounded-full px-3 py-1 text-[11px] transition-colors ${
        active ? "active" : ""
      }`}
      data-tab={id}
    >
      {label}
    </button>
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
  const [winMaximized, setWinMaximized] = useState(false);
  const [winMinimized, setWinMinimized] = useState(false);
  const winRef = useRef<HTMLDivElement>(null);

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
  const watchingCount = sources.filter((s) => s.is_active).length;

  const jump = (v: View) => setView(v);

  return (
    <div className="desk-scene">
      <button
        id="dockRestore"
        className="dock-restore"
        hidden={!winMinimized}
        onClick={() => setWinMinimized(false)}
      >
        <img src="/logo.png" alt="" />
        <span className="dock-txt">
          <strong>হৈচৈ ডেস্ক</strong>
          <small>CLICK TO RESTORE · PURE</small>
        </span>
      </button>

      <div
        ref={winRef}
        id="win"
        className={`win ${winMaximized ? "max" : ""}`}
        hidden={winMinimized}
      >
        <div className="titlebar">
          <div className="traffic">
            <button
              className="dot red"
              id="btnClose"
              title="বন্ধ · সাইটে ফিরুন"
              onClick={() => {
                void deskWin().then((w) =>
                  w ? w.close() : openAdmin(SITE_URL),
                );
              }}
            />
            <button
              className="dot yellow"
              id="btnMin"
              title="মিনিমাইজ"
              onClick={() => {
                void deskWin().then((w) =>
                  w ? w.minimize() : setWinMinimized(true),
                );
              }}
            />
            <button
              className="dot green"
              id="btnMax"
              title="ম্যাক্সিমাইজ"
              onClick={() => {
                void deskWin().then((w) =>
                  w ? w.toggleMaximize() : setWinMaximized(!winMaximized),
                );
              }}
            />
          </div>
          <div
            className="wintitle"
            onMouseDown={(e) => {
              if (e.button !== 0) return;
              void deskWin().then((w) => w?.startDragging());
            }}
            onDoubleClick={(e) => {
              e.preventDefault();
              void deskWin().then((w) => w?.toggleMaximize());
            }}
          >
<img src="/logo.png" alt="" />
            <span>হৈচৈ ডেস্ক</span>
            <em>PURE HTML · CSS · JS</em>
          </div>
          <div className="winctl">
            <ThemeToggle />
            <button
              id="btnMin2"
              title="মিনিমাইজ"
              onClick={() => {
                void deskWin().then((w) =>
                  w ? w.minimize() : setWinMinimized(true),
                );
              }}
            >
              <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14"/></svg>
            </button>
            <button
              id="btnMax2"
              title="ম্যাক্সিমাইজ / পুনরুদ্ধার"
              onClick={() => {
                void deskWin().then((w) =>
                  w ? w.toggleMaximize() : setWinMaximized(!winMaximized),
                );
              }}
            >
              <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="6" y="6" width="12" height="12" rx="1.5"/></svg>
            </button>
            <button
              id="btnClose2"
              title="বন্ধ · অ্যাপ বন্ধ করুন"
              onClick={() => {
                void deskWin().then((w) =>
                  w ? w.close() : openAdmin(SITE_URL),
                );
              }}
            >
              <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
          </div>
        </div>

        <div className="menubar">
          <a href="/" onClick={(e) => { e.preventDefault(); void openAdmin(SITE_URL); }}>ফাইল</a>
          <button onClick={() => jump("watchlist")}>সোর্স</button>
          <button onClick={() => jump("collector")}>রান</button>
          <button onClick={() => jump("vault")}>ভল্ট</button>
          <a href="/system" onClick={(e) => { e.preventDefault(); void openAdmin(`${SITE_URL}/system`); }}>সাহায্য</a>
          <span className="pure-badge">100% NO-FRAMEWORK</span>
          <span className="kbd-hint">1–7 TABS</span>
        </div>

        <div className="winbody">
          <aside className="side">
            <nav className="sidenav" id="sideNav">
              {VIEW_ORDER.map((v, i) => (
                <TabButton
                  key={v}
                  id={v}
                  icon={TAB_LABELS[v].icon}
                  label={TAB_LABELS[v].label}
                  active={view === v}
                  onClick={() => jump(v)}
                  shortcut={String(i + 1)}
                />
              ))}
            </nav>
            <div className="side-foot">
              <p className="online"><span className="pulse-dot"></span>CONTROLLER ONLINE</p>
              <p className="watching" id="sideWatch">{toBn(watchingCount)} সোর্স সক্রিয়</p>
              <p className="datasrc" id="dataSrc">
                ডেটা: {dbDriver} · সংযুক্ত
              </p>
            </div>
          </aside>

          <div className="maincol">
            <div className="mtabs" id="mTabs">
              {VIEW_ORDER.map((v) => (
                <MTabsButton
                  key={v}
                  id={v}
                  label={TAB_LABELS[v].label}
                  active={view === v}
                  onClick={() => jump(v)}
                />
              ))}
            </div>

            <main className="stage">
              <section className="pane" id="pane-dashboard" hidden={view !== "dashboard"}>
                <Dashboard
                  sources={sources}
                  queueRows={queueRows}
                  statsData={statsData}
                  logs={logs}
                  onOpen={jump}
                  hours={hours}
                />
              </section>

              <section className="pane col" id="pane-watchlist" hidden={view !== "watchlist"}>
                <Watchlist sources={sources} refresh={refresh} />
              </section>

              <section className="pane col" id="pane-queue" hidden={view !== "queue"}>
                <Queue rows={queueRows} refresh={refresh} />
              </section>

              <section className="pane col" id="pane-collector" hidden={view !== "collector"}>
                <Collector logs={logs} running={running} onStart={() => void runNow()} onStop={() => void stopNow()} />
              </section>

              <section className="pane col" id="pane-vault" hidden={view !== "vault"}>
                <Vault configured={configured} onEdit={() => jump("settings")} />
              </section>

              <section className="pane" id="pane-settings" hidden={view !== "settings"}>
                <Settings refresh={refresh} refreshBrand={refresh} />
              </section>

              <section className="pane" id="pane-moderation" hidden={view !== "moderation"}>
                <Moderation />
              </section>
            </main>
          </div>
        </div>

        <footer className="statusbar">
          <span className="sb lime"><svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2.5 9a15 15 0 0 1 19 0M5.5 12.5a10 10 0 0 1 13 0M8.6 16a5 5 0 0 1 6.8 0"/><circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none"/></svg>PURE · NO BUILD</span>
          <span className="sb" id="dbState"><svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>{dbDriver} · CONNECTED</span>
          <span className="sb"><svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="12" r="2.5"/><path d="M6 8.5v7M18 12H8.5"/></svg>HOICHOI-CONTENT</span>
          <StatusClock />
        </footer>
      </div>
    </div>
  );
}