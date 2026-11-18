import { useEffect, useState, useCallback, useRef } from "react";
import {
  listen,
  openAdmin,
  isTauri,
  startPipeline,
  stopPipeline,
  deskBootstrap,
  deskMediaStorage,
  deskMediaCleanup,
  deskBackupAuto,
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
import { NavIcon, type NavIconName } from "@hoichoi/icons";
import "@hoichoi/icons/styles.css";
import { getDeskSidebarStyle, onDeskSidebarStyle } from "./lib/desk-ui-prefs";
import type { SidebarStyleId } from "@hoichoi/shared-types";
import { bnClock, toBn } from "./lib/format";
import SetupWizard from "./components/SetupWizard";
import Dashboard from "./screens/Dashboard";
import Traffic from "./screens/Traffic";
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
import Notifier from "./components/Notifier";
import PaneBoundary from "./components/PaneBoundary";
import { toast } from "./lib/toast";

export type View =
  | "dashboard"
  | "traffic"
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
// Timestamp of the in-flight run, persisted so a restart mid-run can tell the
// difference between "still working" and "orphaned by a crash".
const RUN_STARTED_KEY = "hoichoi.desk.runStartedAt";

// Watchdog thresholds. A healthy run streams log lines throughout; a run that
// has gone silent for this long, or has run for this long outright, is treated
// as hung so the desk can go back to IDLE and auto-run can continue.
const RUN_IDLE_MS = 10 * 60_000;
const RUN_MAX_MS = 120 * 60_000;

const VIEW_ORDER: View[] = [
  "dashboard",
  "traffic",
  "watchlist",
  "queue",
  "collector",
  "vault",
  "settings",
  "moderation",
  "ads",
];

const TAB_LABELS: Record<View, { icon: NavIconName; label: string }> = {
  dashboard: { icon: "dashboard", label: "মনিটর" },
  traffic: { icon: "traffic", label: "ট্রাফিক" },
  watchlist: { icon: "watchlist", label: "ওয়াচলিস্ট" },
  queue: { icon: "queue", label: "কনটেন্ট সারি" },
  collector: { icon: "collector", label: "কালেক্টর" },
  vault: { icon: "setup", label: "API ভল্ট" },
  settings: { icon: "settings", label: "সেটিংস" },
  moderation: { icon: "moderation", label: "মন্তব্য মডারেশন" },
  ads: { icon: "ads", label: "বিজ্ঞাপন" },
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
  icon: NavIconName;
  label: string;
  active: boolean;
  onClick: () => void;
  shortcut: string;
}) {
  /*
   * The glyph comes from `@hoichoi/icons` — the same catalogue the web console
   * draws from — instead of a hand-drawn SVG per tab. The old map had drifted:
   * the "shield" entry was a list icon, "term" was a rectangle with three lines,
   * and every path had been tuned at a different stroke weight, so the strip had
   * no consistent rhythm. One grid, one weight: the same screen is the same shape
   * in both apps.
   */
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 font-medium text-[12.5px] transition-colors ${
        active ? "active" : ""
      }`}
      data-tab={id}
    >
      <NavIcon name={icon} size={15} active={active} settle={active} />
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
  /**
   * The desk's sidebar template. Read synchronously from the local mirror so the
   * first paint already has the chosen panel, then kept in sync with the picker
   * in Settings (which also writes the shared site config).
   */
  const [sidebarStyle, setSidebarStyle] = useState<SidebarStyleId>(() => getDeskSidebarStyle());
  useEffect(() => onDeskSidebarStyle(setSidebarStyle), []);
  const [configured, setConfigured] = useState<Partial<Record<CredentialName, boolean>>>({});
  /** Set when the server refused a session grant (revoked device, wrong URL). */
  const [grantError, setGrantError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  /*
   * Boot state for the panes that are fed by `refresh()`.
   *
   * The watchlist and the queue rendered their empty state from the first paint,
   * before the runner had answered, so a slow or failed bootstrap looked exactly
   * like "you have no sources". Panes now get `loading` and `loadError` and can
   * show a skeleton or the real error instead.
   */
  const [booted, setBooted] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  // Heartbeat for the dashboard's live panel: the last time a snapshot landed.
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [sources, setSources] = useState<DeskSource[]>([]);
  const [queueRows, setQueueRows] = useState<DeskQueueRow[]>([]);
  // Total posts on the runner, so the desk shows the same "মোট" as the web list.
  const [queueTotal, setQueueTotal] = useState(0);
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
  // The pipeline://done event is the only place that clears `running`. If the
  // child is killed (task manager, crash, OS) or the app restarts mid-run, that
  // event never fires and the desk stays "LIVE" forever, which also permanently
  // blocks the auto-run scheduler. These two refs back the watchdog below.
  const runStartedAtRef = useRef<number | null>(null);
  const runIdleSinceRef = useRef<number | null>(null);
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
      // A refused grant must be said out loud: the screens below would other-
      // wise show an empty newsroom, which reads as "no content" rather than
      // "this device lost access".
      setGrantError(env.HOICHOI_DESK_GRANT_ERROR ?? null);
      if (env.HOICHOI_DESK_GRANT_ERROR) {
        return { ok: false, error: env.HOICHOI_DESK_GRANT_ERROR };
      }
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

  const refresh = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    try {
      const env = await getRunEnv();
      /*
        ONE runner spawn for the whole screen.

        This used to be six-plus separate `desk_*` calls, each of which started
        its own `node.exe`. That is why the desk took several seconds to show
        content on every refresh — the wait was process cold starts, not the
        database. `deskBootstrap` reads settings, sources, queue, stats, radar,
        categories and providers together in a single process.
      */
      const boot = await deskBootstrap(env, { page: 1 });
      const configuredMap = await listConfigured();
      for (const p of boot.providers ?? []) {
        if (p.api_key && p.api_key_env_var) {
          configuredMap[p.api_key_env_var as CredentialName] = true;
        }
      }
      setConfigured(configuredMap);

      const s = boot.settings;
      if (s && Number(s.pipeline_hours) > 0) setHours(Number(s.pipeline_hours));

      setSources(boot.sources ?? []);
      setQueueRows(boot.queue?.rows ?? []);
      setQueueTotal(boot.queue?.total ?? 0);
      setStatsData(boot.stats ?? null);
      setRadarData(boot.radar ?? null);
      setCats(boot.categories ?? null);
      const pending = boot.stats?.stats?.pendingReview ?? 0;
      setPendingCount(pending);
      void deskWin().then((w) => w?.setBadgeCount?.(pending));
      if (pending > prevPendingRef.current && (document.hidden || winMinimizedRef.current)) {
        void notify("হৈচৈ ডেস্ক — অপেক্ষমাণ মন্তব্য", `${toBn(pending)}টি মন্তব্য মডারেশনের অপেক্ষায় আছে।`);
      }
      prevPendingRef.current = pending;
      setLastRefreshAt(Date.now());
      setBooted(true);
      setBootError(null);
      return { ok: true };
    } catch (err) {
      // Surface the actual runner error so a failed refresh is not mistaken for
      // a healthy but empty desk.
      const message = err instanceof Error ? err.message : String(err);
      setBooted(true);
      setBootError(message);
      return { ok: false, error: message };
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
      const i = ["1", "2", "3", "4", "5", "6", "7", "8", "9"].indexOf(e.key);
      if (i >= 0) setView(VIEW_ORDER[i]);
    };
    window.addEventListener("keydown", onKey);
    const unlog = listen<string>("pipeline://log", (e) => {
      // Any log line proves the child is alive, so push the watchdog's idle
      // deadline forward.
      runIdleSinceRef.current = Date.now();
      setLogs((prev) => [...prev.slice(-399), e.payload]);
    });
    const undone = listen<number>("pipeline://done", async (e) => {
      const code = Number(e.payload);
      runStartedAtRef.current = null;
      runIdleSinceRef.current = null;
      try {
        localStorage.removeItem(RUN_STARTED_KEY);
      } catch {
        /* ignore */
      }
      setRunning(false);
      setLogs((prev) => [...prev, `── exit code ${code} ──`]);
      await refresh();
      if (hoursRef.current > 0) setNextRunAt(Date.now() + hoursRef.current * 3_600_000);
      if (code === 0) {
        toast.ok("পাইপলাইন সম্পন্ন", "নতুন রান সফলভাবে শেষ হয়েছে — মনিটর হালনাগাদ।");
      } else {
        toast.err("পাইপলাইন ব্যর্থ", `রান exit code ${code} নিয়ে শেষ হয়েছে — কালেক্টর লগ দেখুন।`);
      }
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

  // Startup recovery: a run recorded in localStorage with no pipeline://done
  // after a restart is orphaned. Kill any surviving child and log the recovery
  // instead of holding the desk on a stuck LIVE forever.
  useEffect(() => {
    let startedAt: number | null = null;
    try {
      const raw = localStorage.getItem(RUN_STARTED_KEY);
      startedAt = raw ? Number(raw) : null;
    } catch {
      startedAt = null;
    }
    if (startedAt == null || !Number.isFinite(startedAt)) return;
    setLogs((prev) => [
      ...prev,
      `[desk] previous run (started ${new Date(startedAt).toLocaleTimeString()}) did not report completion — cleaning up`,
    ]);
    void stopPipeline().catch(() => undefined);
    runStartedAtRef.current = null;
    runIdleSinceRef.current = null;
    try {
      localStorage.removeItem(RUN_STARTED_KEY);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Watchdog: while a run is active, trip if the child goes silent or overruns.
  // Without this the desktop stays "LIVE" forever and blocks auto-run whenever
  // the runner child hangs or is killed without emitting pipeline://done.
  useEffect(() => {
    const t = setInterval(() => {
      if (!runningRef.current) return;
      const started = runStartedAtRef.current;
      if (started == null) return;
      const idleSince = runIdleSinceRef.current ?? started;
      const now = Date.now();
      const idleFor = now - idleSince;
      const totalFor = now - started;
      if (idleFor < RUN_IDLE_MS && totalFor < RUN_MAX_MS) return;
      const why = totalFor >= RUN_MAX_MS ? "সময়সীমা (২ ঘণ্টা) ছাড়িয়ে গেছে" : "১০ মিনিট ধরে কোনো লগ আসেনি";
      setLogs((prev) => [...prev, `[desk] watchdog: ${why} — কালেক্টর বন্ধ করা হচ্ছে`]);
      runStartedAtRef.current = null;
      runIdleSinceRef.current = null;
      try {
        localStorage.removeItem(RUN_STARTED_KEY);
      } catch {
        /* ignore */
      }
      setRunning(false);
      if (hoursRef.current > 0) setNextRunAt(Date.now() + hoursRef.current * 3_600_000);
      void stopPipeline().catch(() => undefined);
      void refresh();
      toast.err("কালেক্টর সাড়া দেয়নি", `${why} — রান থামানো হয়েছে, লগ দেখুন।`);
    }, 15_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runNow = async () => {
    if (running) return;
    const now = Date.now();
    runStartedAtRef.current = now;
    runIdleSinceRef.current = now;
    try {
      localStorage.setItem(RUN_STARTED_KEY, String(now));
    } catch {
      /* ignore */
    }
    setRunning(true);
    setLogs((prev) => [...prev, `[desk] pipeline starting @ ${bnClock(true)}`]);
    try {
      await startPipeline(await getRunEnv());
    } catch (err) {
      runStartedAtRef.current = null;
      runIdleSinceRef.current = null;
      try {
        localStorage.removeItem(RUN_STARTED_KEY);
      } catch {
        /* ignore */
      }
      setLogs((prev) => [...prev, `[desk] failed to start: ${String(err)}`]);
      setRunning(false);
      toast.err("কালেক্টর শুরু ব্যর্থ", err instanceof Error ? err.message : String(err));
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

  /** Dashboard header refresh: reload the snapshot and surface the real result. */
  const manualRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const r = await refresh();
      if (r.ok) {
        toast.ok("স্ন্যাপশট রিফ্রেশ হয়েছে", "মনিটর ও কনটেন্ট সারি হালনাগাদ হয়েছে।");
      } else {
        toast.err("রিফ্রেশ ব্যর্থ", r.error ?? "রানার উত্তর দেয়নি — সংযোগ ও কি যাচাই করুন।");
      }
    } finally {
      setRefreshing(false);
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

  // Device-token mode is the supported connection: the credential lives on the
  // server and this app only carries a revocable token.
  const dbDriver = configured.desk_token ? "SERVER" : configured.turso_url ? "TURSO" : "LOCAL";
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
          <span className="kbd-hint ml-auto">1–9 TABS</span>
        </div>

        <DeskSyncBar
          queueRows={queueRows}
          onSynced={() => refresh()}
        />

        <div className="winbody">
          <aside className="side" data-sidebar-style={sidebarStyle}>
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
                <PaneBoundary name="dashboard">
                <Dashboard
                  sources={sources}
                  queueRows={queueRows}
                  statsData={statsData}
                  radarData={radarData}
                  cats={cats}
                  running={running}
                  dbDriver={dbDriver}
                  onOpen={jump}
                  onRun={() => void runNow()}
                  onRefresh={() => void manualRefresh()}
                  refreshing={refreshing}
                  logs={logs}
                  lastRefreshAt={lastRefreshAt}
                />
                </PaneBoundary>
              </section>

              <section className="pane col" id="pane-traffic" hidden={view !== "traffic"}>
                <PaneBoundary name="traffic">
                  <Traffic />
                </PaneBoundary>
              </section>

              <section className="pane col" id="pane-watchlist" hidden={view !== "watchlist"}>
                <PaneBoundary name="watchlist">
                  <Watchlist
                    sources={sources}
                    refresh={refresh}
                    loading={!booted}
                    loadError={bootError}
                  />
                </PaneBoundary>
              </section>

              <section className="pane col" id="pane-queue" hidden={view !== "queue"}>
                <PaneBoundary name="queue">
                  <Queue
                    rows={queueRows}
                    refresh={refresh}
                    cats={cats}
                    total={queueTotal}
                    loading={!booted}
                    loadError={bootError}
                  />
                </PaneBoundary>
              </section>

              <section className="pane col" id="pane-collector" hidden={view !== "collector"}>
                <PaneBoundary name="collector">
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
                </PaneBoundary>
              </section>

              <section className="pane col" id="pane-vault" hidden={view !== "vault"}>
                <PaneBoundary name="vault">
                  <Vault configured={configured} onEdit={() => jump("settings")} />
                </PaneBoundary>
              </section>

              <section className="pane" id="pane-settings" hidden={view !== "settings"}>
                <PaneBoundary name="settings">
                  <Settings refresh={refresh} refreshBrand={refresh} />
                </PaneBoundary>
              </section>

              <section className="pane" id="pane-moderation" hidden={view !== "moderation"}>
                <PaneBoundary name="moderation">
                  <Moderation />
                </PaneBoundary>
              </section>

              <section className="pane" id="pane-ads" hidden={view !== "ads"}>
                <PaneBoundary name="ads">
                  <Ads refreshBrand={refresh} />
                </PaneBoundary>
              </section>
            </main>
          </div>
        </div>

        <footer className="statusbar">
          <span className="sb lime"><svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2.5 9a15 15 0 0 1 19 0M5.5 12.5a10 10 0 0 1 13 0M8.6 16a5 5 0 0 1 6.8 0"/><circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none"/></svg>TAURI 2.1</span>
          <span className="sb lime"><svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>{dbDriver} · {grantError ? "ACCESS DENIED" : "CONNECTED"}</span>
          <span className="sb"><svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="12" r="2.5"/><path d="M6 8.5v7M18 12H8.5"/></svg>HOICHOI-CONTENT</span>
          <StatusClock />
        </footer>
      </div>

      <ToastHost />
      <Notifier />
    </div>
  );
}