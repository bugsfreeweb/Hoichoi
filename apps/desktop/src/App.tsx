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
  deskProviders,
  deskMediaStorage,
  deskMediaCleanup,
  deskBackupAuto,
  deskRadarStats,
  deskCategories,
  type DeskCategory,
  type DeskQueueRow,
  type DeskSource,
  type DeskStats,
  type DeskRadarSnapshot,
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
import Ads from "./screens/Ads";
import ThemeToggle from "./components/ThemeToggle";
import DeskSyncBar from "./components/DeskSyncBar";
import { ToastHost } from "./components/ToastHost";
import { toast } from "./lib/toast";

export type View =
  | "dashboard"
  | "watchlist"
  | "queue"
  | "collector"
  | "vault"
  | "settings"
  | "moderation"
  | "ads";

const ONBOARD_KEY = "hoichoi.desk.onboarded.v1";
const AUTORUN_KEY = "hoichoi.desk.autoru";
const AUTO_BACKUP_KEY = "hoichoi.desk.autobk";
const VIEW_ORDER: View[] = [
  "dashboard",
  "watchlist",
  "queue",
  "collector",
  "vault",
  "settings",
  "moderation",
  "ads",
];

const TAB_LABELS: Record<View, { icon: string; label: string }> = {
  dashboard: { icon: "dash", label: "মনিটর" },
  watchlist: { icon: "radio", label: "ওয়াচলিস্ট" },
  queue: { icon: "list", label: "কনটেন্ট সারি" },
  collector: { icon: "term", label: "কালেক্টর" },
  vault: { icon: "key", label: "API ভল্ট" },
  settings: { icon: "gear", label: "সেটিংস" },
  moderation: { icon: "shield", label: "মন্তব্য মডারেশন" },
  ads: { icon: "mega", label: "বিজ্ঞাপন" },
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
  setBadgeCount?: (n: number) => Promise<void>;
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
    list: <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 6h11M10 12h11M10 18h11"/><path d="M4 6h1v4M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>,
    term: <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3a2 2 0 0 0-2 2"/><path d="M19 3a2 2 0 0 1 2 2"/><path d="M21 19a2 2 0 0 1-2 2"/><path d="M5 21a2 2 0 0 1-2-2"/><path d="M9 7h1M9 11h6M9 15h3"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>,
    key: <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="15" r="4.5"/><path d="M11.5 11.5L21 2M16.5 6.5l3 3M13.5 9.5l2.5 2.5"/></svg>,
    gear: <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    shield: <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 6h11M10 12h11M10 18h11"/><path d="M4 6h1v4M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>,
    mega: <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 13z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>,
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
  const [radarData, setRadarData] = useState<DeskRadarSnapshot | null>(null);
  const [cats, setCats] = useState<DeskCategory[] | null>(null);
  const [hours, setHours] = useState(2);
  const [autoRun, _setAutoRun] = useState(() => localStorage.getItem(AUTORUN_KEY) !== "0");
  const [nextRunAt, setNextRunAt] = useState<number | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [winMaximized, setWinMaximized] = useState(false);
  const [winMinimized, setWinMinimized] = useState(false);
  const winRef = useRef<HTMLDivElement>(null);

  const setAutoRun = (v: boolean) => {
    _setAutoRun(v);
    try {
      localStorage.setItem(AUTORUN_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  const runningRef = useRef(running);
  runningRef.current = running;
  const hoursRef = useRef(hours);
  hoursRef.current = hours;
  const autoRunRef = useRef(autoRun);
  autoRunRef.current = autoRun;
  const nextRunAtRef = useRef(nextRunAt);
  nextRunAtRef.current = nextRunAt;
  const prevPendingRef = useRef(0);
  const winMinimizedRef = useRef(winMinimized);
  winMinimizedRef.current = winMinimized;

  const notify = async (title: string, body: string) => {
    try {
      if (!isTauri()) {
        if (typeof Notification === "undefined") return;
        if (Notification.permission === "granted") {
          new Notification(title, { body });
        } else if (Notification.permission === "default") {
          const p = await Notification.requestPermission();
          if (p === "granted") new Notification(title, { body });
        }
        return;
      }
      const { isPermissionGranted, requestPermission, sendNotification } = await import("@tauri-apps/plugin-notification");
      let granted = await isPermissionGranted();
      if (!granted) granted = (await requestPermission()) === "granted";
      if (granted) sendNotification({ title, body });
    } catch {
      /* notifications are optional */
    }
  };

  const maybeAutoBackup = async () => {
    try {
      const raw = localStorage.getItem(AUTO_BACKUP_KEY);
      if (!raw) return;
      const cfg = JSON.parse(raw) as { enabled: boolean; folder: string; keep: number; pass: string } | null;
      if (!cfg?.enabled || !cfg.folder || !cfg.pass) return;
      const res = await deskBackupAuto(cfg.pass, cfg.folder, Math.max(1, cfg.keep || 7), await getRunEnv());
      setLogs((prev) => [...prev, `[backup]auto → ${res.file} · kept ${res.kept} pruned ${res.pruned}`]);
      toast.ok("অটো-ব্যাকআপ সম্পন্ন", `${res.file} · kept ${res.kept}`);
    } catch (e) {
      setLogs((prev) => [...prev, `[backup]auto failed: ${String(e)}`]);
      toast.err("অটো-ব্যাকআপ ব্যর্থ", String(e));
    }
  };

  const maybeRevalidate = async () => {
    try {
      const env = await getRunEnv();
      const u = new URL("/api/revalidate", SITE_URL);
      const secret = env["REVALIDATE_SECRET"];
      if (secret) u.searchParams.set("secret", secret);
      const res = await fetch(u.toString());
      if (res.ok) {
        setLogs((prev) => [...prev, "[web]revalidate OK"]);
        toast.ok("ওয়েব ক্যাশ রিফ্রেশ হয়েছে", "হোমপেজ ও ক্যাটাগরি পেজ নতুন কনটেন্ট দেখাবে।");
      } else {
        toast.err("ওয়েব রিফ্রেশ ব্যর্থ", `HTTP ${res.status}`);
      }
    } catch {
      /* offline: skip */
    }
  };

  const maybeCleanup = async () => {
    try {
      const m = await deskMediaStorage(await getRunEnv());
      if (!m.config?.cleanup_enabled) return;
      const res = await deskMediaCleanup(await getRunEnv(), {
        dryRun: false,
        months: m.config.retention_months || 1,
      });
      setLogs(
        (prev) => [...prev, `[media]cleanup → removed ${res.removed} · skipped ${res.skipped} (cutoff ${res.cutoff.slice(0, 10)})`],
      );
    } catch {
      /* cleanup failure is non-fatal */
    }
  };

  const refresh = useCallback(async () => {
    try {
      const env = await getRunEnv();
      // Merge DB provider key overrides into the vault "configured" map so
      // keys stored via the provider panel (mistral/openai/manifest/copilot…)
      // still surface as filled in the vault UI.
      const configuredMap = await listConfigured();
      try {
        const provs = await deskProviders(env);
        for (const p of provs) {
          if (p.api_key && p.api_key_env_var) {
            configuredMap[p.api_key_env_var as CredentialName] = true;
          }
        }
      } catch {
        /* provider list is optional */
      }
      setConfigured(configuredMap);
      const s = await settingsGet(env).catch(() => null);
      if (s && Number(s.pipeline_hours) > 0) setHours(Number(s.pipeline_hours));
      const [src, rows, stats, radar] = await Promise.all([
        deskSources(env),
        deskQueue(env),
        deskStats(env).catch(() => null),
        deskRadarStats(env).catch(() => null),
      ]);
      setSources(src);
      setQueueRows(rows);
      setStatsData(stats);
      setRadarData(radar);
      // Category names and dots come from the DB so an admin's rename shows up
      // in the desk. Failing to load them only costs the local fallback labels.
      const catList = await deskCategories(env).catch(() => null);
      setCats(catList);
      const pending = stats?.stats?.pendingReview ?? 0;
      setPendingCount(pending);
      void deskWin().then((w) => w?.setBadgeCount?.(pending));
      if (pending > prevPendingRef.current && (document.hidden || winMinimizedRef.current)) {
        void notify("হৈচৈ ডেস্ক — অপেক্ষমাণ মন্তব্য", `${toBn(pending)}টি মন্তব্য মডারেশনের অপেক্ষায় আছে।`);
      }
      prevPendingRef.current = pending;
    } catch {
      /* partial refresh failures are non-fatal */
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.isContentEditable) return;
      if (t.closest("input, textarea, select, hoichoi-moderation")) return;
      const i = ["1", "2", "3", "4", "5", "6", "7", "8"].indexOf(e.key);
      if (i >= 0) setView(VIEW_ORDER[i]);
    };
    window.addEventListener("keydown", onKey);
    const unlog = listen<string>("pipeline://log", (e) => {
      setLogs((prev) => [...prev.slice(-399), e.payload]);
    });
    const undone = listen<number>("pipeline://done", async (e) => {
      setRunning(false);
      setLogs((prev) => [...prev, `── exit code ${e.payload} ──`]);
      await refresh();
      if (hoursRef.current > 0) setNextRunAt(Date.now() + hoursRef.current * 3_600_000);
      void maybeAutoBackup();
      void maybeRevalidate();
      void maybeCleanup();
    });
    return () => {
      window.removeEventListener("keydown", onKey);
      void unlog.then((f) => f());
      void undone.then((f) => f());
    };
  }, [refresh]);

  useEffect(() => {
    // Seed a first cadence point when auto-run is on and none is pending.
    if (!autoRunRef.current || hoursRef.current <= 0) return;
    if (nextRunAtRef.current != null) return;
    setNextRunAt(Date.now() + hoursRef.current * 3_600_000);
  }, [autoRun, nextRunAt]);

  useEffect(() => {
    if (!autoRunRef.current || hoursRef.current <= 0) return;
    const t = setInterval(() => {
      if (!autoRunRef.current || runningRef.current) return;
      const at = nextRunAtRef.current;
      if (at == null || Date.now() < at) return;
      setNextRunAt(null);
      void runNow();
    }, 1000);
    return () => clearInterval(t);
    // runNow is stable by identity; scheduler fires on wall-clock only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <small>CLICK TO RESTORE</small>
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
            <em>TAURI 2.1</em>
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
          <span className="kbd-hint ml-auto">1–8 TABS</span>
        </div>

        <DeskSyncBar
          queueRows={queueRows}
          onSynced={() => refresh()}
        />

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
              {pendingCount > 0 && (
                <p className="watching pending-badge" id="sidePending">
                  {toBn(pendingCount)} মন্তব্য মডারেশনে
                </p>
              )}
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
                  cats={cats}
                />
              </section>

              <section className="pane col" id="pane-watchlist" hidden={view !== "watchlist"}>
                <Watchlist sources={sources} refresh={refresh} />
              </section>

              <section className="pane col" id="pane-queue" hidden={view !== "queue"}>
                <Queue rows={queueRows} refresh={refresh} cats={cats} />
              </section>

              <section className="pane col" id="pane-collector" hidden={view !== "collector"}>
                <Collector
                  logs={logs}
                  running={running}
                  onStart={() => void runNow()}
                  onStop={() => void stopNow()}
                  statsData={statsData}
                  nextRunAt={nextRunAt}
                  autoRun={autoRun}
                  onAutoRun={setAutoRun}
                  radarData={radarData}
                  queueRows={queueRows}
                />
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

              <section className="pane" id="pane-ads" hidden={view !== "ads"}>
                <Ads refreshBrand={refresh} />
              </section>
            </main>
          </div>
        </div>

        <footer className="statusbar">
          <span className="sb lime"><svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2.5 9a15 15 0 0 1 19 0M5.5 12.5a10 10 0 0 1 13 0M8.6 16a5 5 0 0 1 6.8 0"/><circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none"/></svg>TAURI 2.1</span>
          <span className="sb lime"><svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>{dbDriver} · CONNECTED</span>
          <span className="sb"><svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="12" r="2.5"/><path d="M6 8.5v7M18 12H8.5"/></svg>HOICHOI-CONTENT</span>
          <StatusClock />
        </footer>
      </div>

      <ToastHost />
    </div>
  );
}