import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import { sources } from "../lib/data";
import { toBn, useInterval } from "../lib/hooks";

/* ------------------------------------------------------------------ types */

export type TabId = "overview" | "analytics" | "pipeline" | "insights" | "content";

export const TAB_LABEL: Record<TabId, string> = {
  overview: "ওভারভিউ",
  analytics: "অ্যানালিটিক্স",
  pipeline: "পাইপলাইন",
  insights: "ইনসাইটস ল্যাব",
  content: "কনটেন্ট ডেস্ক",
};

export type Tone = "good" | "warn" | "bad" | "info" | "brand";
export type Notif = {
  id: number;
  tone: Tone;
  icon: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  tab?: TabId;
};
export type NotifInput = Omit<Notif, "id" | "read" | "time">;

export type StageState = "idle" | "running" | "done" | "skipped" | "failed";
export type Lvl = "INFO" | "OK" | "WARN" | "ERR" | "SEP";
export type LogLine = { id: number; t: string; lvl: Lvl; msg: string };
export type RunMode = "full" | "dry";
export type RunRecord = {
  id: string;
  time: string;
  items: number;
  pub: number;
  dup: number;
  dur: string;
  state: "running" | "success" | "partial" | "failed" | "cancelled";
  mode: RunMode;
  scope: string;
};

/* -------------------------------------------------------------- constants */

export const STAGE_NAMES = ["graph.read", "collector.shot", "dedupe.gate", "llm.rewrite", "git.commit", "vercel.deploy"];
export const STAGE_MS = [1100, 1700, 900, 2000, 1200, 1500];
export const BASE_RUN = 4821;
export const SCOPES = ["সব সোর্স · All (6)", ...sources.map((s) => s.name)];

/* ------------------------------------------------------------------ state */

type RunState = {
  active: boolean;
  runNo: number;
  stageIdx: number;
  stages: StageState[];
  mode: RunMode;
  scope: string;
  startedAt: number;
  lastResult: "success" | "cancelled" | null;
  items: number;
  dup: number;
};

type State = {
  run: RunState;
  runs: RunRecord[];
  logs: LogLine[];
  logSeq: number;
  notifs: Notif[];
  notifSeq: number;
};

type Action =
  | { type: "START"; mode: RunMode; scope: string; now: number }
  | { type: "ADVANCE"; now: number }
  | { type: "CANCEL"; now: number }
  | { type: "PUSH_NOTIF"; n: NotifInput; now: number }
  | { type: "MARK_READ"; id: number }
  | { type: "MARK_ALL" }
  | { type: "CLEAR_NOTIFS" }
  | { type: "REMOVE_NOTIF"; id: number };

const clock = (now: number) => new Date(now).toLocaleTimeString("en-GB", { hour12: false });
const bnTime = (now: number) =>
  toBn(new Date(now).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }));

const idleStages = (): StageState[] => STAGE_NAMES.map((): StageState => "idle");

function counts(runNo: number) {
  const items = 8 + (runNo % 6);
  const dup = 1 + (runNo % 3);
  return { items, dup, pub: items - dup - 1 };
}

function startMsg(i: number, scope: string): [Lvl, string] {
  const msgs: [Lvl, string][] = [
    ["INFO", `graph.read scope="${scope}" window=2h`],
    ["INFO", "collector.shot playwright headless=true"],
    ["INFO", "dedupe.gate sha256 × simhash(k=3) batch"],
    ["INFO", "llm.rewrite model=hoichoi-bn-v2 style=v2.4"],
    ["INFO", "git.commit staging content/*.json"],
    ["INFO", "vercel.deploy ISR revalidate /"],
  ];
  return msgs[i];
}

function doneMsg(i: number, r: RunState): [Lvl, string] {
  const posts = r.items + r.dup;
  switch (i) {
    case 0:
      return ["OK", `graph.read ${posts} posts fetched`];
    case 1:
      return ["OK", `collector.shot captured=${posts} failed=0`];
    case 2:
      return ["WARN", `dedupe.gate blocked=${r.dup} duplicate post(s)`];
    case 3:
      return ["WARN", `factgate pass=${r.items - 1} requeue=1 (score 0.68 < 0.90)`];
    case 4:
      return ["OK", `git.commit pushed files=${r.items - 1}`];
    default:
      return ["OK", "vercel.deploy READY isr=8.2s"];
  }
}

function withLogs(s: State, now: number, lines: [Lvl, string][]) {
  const add: LogLine[] = lines.map(([lvl, msg], k) => ({ id: s.logSeq + k, t: clock(now), lvl, msg }));
  return { logs: [...s.logs, ...add].slice(-160), logSeq: s.logSeq + add.length };
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "START": {
      if (s.run.active) return s;
      const runNo = s.run.runNo + 1;
      const c = counts(runNo);
      const stages = idleStages();
      stages[0] = "running";
      const scope = a.scope;
      return {
        ...s,
        run: {
          ...s.run,
          active: true,
          runNo,
          stageIdx: 0,
          stages,
          mode: a.mode,
          scope,
          startedAt: a.now,
          lastResult: null,
          items: c.items,
          dup: c.dup,
        },
        runs: [
          {
            id: `#${runNo}`,
            time: bnTime(a.now),
            items: c.items,
            pub: a.mode === "dry" ? 0 : c.pub,
            dup: c.dup,
            dur: "…",
            state: "running" as const,
            mode: a.mode,
            scope,
          },
          ...s.runs,
        ].slice(0, 12),
        ...withLogs(s, a.now, [
          ["SEP", `manual run #${runNo} · ${a.mode === "full" ? "full" : "dry-run"} · ${scope}`],
          startMsg(0, scope),
        ]),
      };
    }

    case "ADVANCE": {
      const r = s.run;
      if (!r.active || r.stageIdx < 0) return s;
      const i = r.stageIdx;
      const stages = [...r.stages];
      stages[i] = "done";
      const lines: [Lvl, string][] = [doneMsg(i, r)];
      let next = i + 1;
      while (next < STAGE_NAMES.length && r.mode === "dry" && next >= 4) {
        stages[next] = "skipped";
        lines.push(["INFO", `${STAGE_NAMES[next]} skipped · dry-run`]);
        next++;
      }
      if (next >= STAGE_NAMES.length) {
        const secs = Math.max(1, Math.round((a.now - r.startedAt) / 1000));
        const pub = r.mode === "dry" ? 0 : r.items - r.dup - 1;
        lines.push(["OK", `run #${r.runNo} complete · ${pub} published · ${secs}s`]);
        return {
          ...s,
          run: { ...r, active: false, stageIdx: -1, stages, lastResult: "success" },
          runs: s.runs.map((x) => (x.state === "running" ? { ...x, state: "success", pub, dur: `${secs}s` } : x)),
          ...withLogs(s, a.now, lines),
        };
      }
      stages[next] = "running";
      lines.push(startMsg(next, r.scope));
      return {
        ...s,
        run: { ...r, stageIdx: next, stages },
        ...withLogs(s, a.now, lines),
      };
    }

    case "CANCEL": {
      const r = s.run;
      if (!r.active) return s;
      const i = r.stageIdx;
      const stages = [...r.stages];
      stages[i] = "failed";
      return {
        ...s,
        run: { ...r, active: false, stageIdx: -1, stages, lastResult: "cancelled" },
        runs: s.runs.map((x) => (x.state === "running" ? { ...x, state: "cancelled", dur: "—" } : x)),
        ...withLogs(s, a.now, [["ERR", `run cancelled by operator at ${STAGE_NAMES[i]}`]]),
      };
    }

    case "PUSH_NOTIF":
      return {
        ...s,
        notifs: [{ ...a.n, id: s.notifSeq, read: false, time: bnTime(a.now) }, ...s.notifs].slice(0, 40),
        notifSeq: s.notifSeq + 1,
      };

    case "MARK_READ":
      return { ...s, notifs: s.notifs.map((n) => (n.id === a.id ? { ...n, read: true } : n)) };

    case "MARK_ALL":
      return { ...s, notifs: s.notifs.map((n) => ({ ...n, read: true })) };

    case "CLEAR_NOTIFS":
      return { ...s, notifs: [] };

    case "REMOVE_NOTIF":
      return { ...s, notifs: s.notifs.filter((n) => n.id !== a.id) };

    default:
      return s;
  }
}

/* ------------------------------------------------------------------- seed */

const SEED_LOGS: [string, Lvl, string][] = [
  ["11:58:02", "INFO", "graph.read sources=10 window=2h"],
  ["11:58:04", "OK", "collector.shot captured=12 failed=0"],
  ["11:58:07", "WARN", "dedupe.simhash distance=3 → blocked post_9f3ac1"],
  ["11:58:09", "INFO", "llm.rewrite model=hoichoi-bn-v2 tokens=18412"],
  ["11:58:14", "OK", "factgate.score 0.93 ≥ 0.90 → accept"],
  ["11:58:15", "ERR", "factgate.score 0.68 < 0.90 → requeue post_c70e2a"],
  ["11:58:18", "INFO", "git.commit content/2026-02-11-*.json files=9"],
  ["11:58:26", "OK", "vercel.deploy isr=8.2s status=READY"],
];

const SEED_RUNS: RunRecord[] = [
  { id: "#4821", time: "১১:৫৮", items: 12, pub: 9, dup: 3, dur: "76s", state: "success", mode: "full", scope: SCOPES[0] },
  { id: "#4820", time: "০৯:৫৮", items: 15, pub: 11, dup: 4, dur: "82s", state: "success", mode: "full", scope: SCOPES[0] },
  { id: "#4819", time: "০৭:৫৮", items: 9, pub: 5, dup: 2, dur: "68s", state: "partial", mode: "full", scope: SCOPES[0] },
  { id: "#4818", time: "০৫:৫৮", items: 14, pub: 10, dup: 4, dur: "91s", state: "success", mode: "full", scope: SCOPES[0] },
  { id: "#4817", time: "০৩:৫৮", items: 7, pub: 0, dup: 1, dur: "24s", state: "failed", mode: "full", scope: SCOPES[0] },
];

const SEED_NOTIFS: Notif[] = [
  { id: 6, tone: "good", icon: "✓", title: "ডিপ্লয় সফল", body: "রান #4821 · ISR রিফ্রেশ ৮.২ সেকেন্ডে", time: "১১:৫৮", read: false, tab: "pipeline" },
  { id: 5, tone: "warn", icon: "⚠", title: "ফ্যাক্ট-গেট স্কোর কমেছে", body: "post_c70e2a · ০.৬৮ — পুনর্লিখনে পাঠানো হয়েছে", time: "১১:৫৪", read: false, tab: "pipeline" },
  { id: 4, tone: "bad", icon: "🛡", title: "ফ্ল্যাগড মন্তব্য", body: "anon_4471 — ঝুঁকি ০.৭৪ · রিভিউ দরকার", time: "১১:৫০", read: false, tab: "content" },
  { id: 3, tone: "bad", icon: "📡", title: "Metro Rail Alerts ডাউন", body: "সফলতা ৭২.৩% — রিট্রাই কনফিগ যাচাই করুন", time: "১১:৪৬", read: false, tab: "content" },
  { id: 2, tone: "info", icon: "🗄", title: "Turso রেপ্লিকা স্বাভাবিক", body: "lag ১২ms · সব রিজিয়ন সিঙ্কড", time: "১১:৪০", read: true },
  { id: 1, tone: "brand", icon: "✦", title: "AI ইনসাইট আপডেট", body: "সন্ধ্যার সংগ্রহ ২.৪× বাড়তে পারে — পূর্বাভাস", time: "১১:৩০", read: true, tab: "insights" },
];

const LIVE_POOL: NotifInput[] = [
  { tone: "info", icon: "📥", title: "নতুন রেকর্ড সংগৃহীত", body: "৩টি নতুন পোস্ট ড্রাফটে যোগ হয়েছে", tab: "content" },
  { tone: "good", icon: "💚", title: "কালেক্টর heartbeat", body: "Desktop collector সংযুক্ত · সম্প্রতি", tab: "pipeline" },
  { tone: "warn", icon: "💬", title: "নতুন মন্তব্য ফ্ল্যাগড", body: "Sayan D. — ফোন নম্বর শেয়ার হয়েছে", tab: "content" },
  { tone: "info", icon: "🧬", title: "SimHash ডুপ্লিকেট ব্লক", body: "একই ঘটনার ২টি পোস্ট আটকানো হয়েছে", tab: "pipeline" },
  { tone: "brand", icon: "📈", title: "ট্রাফিক স্পাইক", body: "মুখ্য খবরে ভিউ +৩৮% — গত ১০ মিনিটে", tab: "analytics" },
];

const SEED_STATE: State = {
  run: {
    active: false,
    runNo: BASE_RUN,
    stageIdx: -1,
    stages: idleStages(),
    mode: "full",
    scope: SCOPES[0],
    startedAt: 0,
    lastResult: null,
    items: 9,
    dup: 3,
  },
  runs: SEED_RUNS,
  logs: SEED_LOGS.map(([t, lvl, msg], i) => ({ id: i, t, lvl, msg })),
  logSeq: SEED_LOGS.length,
  notifs: SEED_NOTIFS,
  notifSeq: 7,
};

/* --------------------------------------------------------------- provider */

type AppCtx = {
  state: State;
  startRun: (mode: RunMode, scope: string) => void;
  cancelRun: () => void;
  notify: (n: NotifInput) => void;
  markRead: (id: number) => void;
  markAll: () => void;
  clearAll: () => void;
  removeNotif: (id: number) => void;
};

const AppContextObj = createContext<AppCtx | null>(null);

export function useApp() {
  const c = useContext(AppContextObj);
  if (!c) throw new Error("useApp must be used inside AppProvider");
  return c;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, SEED_STATE);
  const { run } = state;

  // advance the pipeline one stage at a time
  useEffect(() => {
    if (!run.active || run.stageIdx < 0) return;
    const id = window.setTimeout(() => dispatch({ type: "ADVANCE", now: Date.now() }), STAGE_MS[run.stageIdx]);
    return () => window.clearTimeout(id);
  }, [run.active, run.stageIdx]);

  // notify on run start / finish / cancel
  const prevActive = useRef(run.active);
  useEffect(() => {
    const was = prevActive.current;
    prevActive.current = run.active;
    const now = Date.now();
    const modeLabel = run.mode === "full" ? "পূর্ণ রান" : "ড্রাই-রান";
    if (!was && run.active) {
      dispatch({
        type: "PUSH_NOTIF",
        now,
        n: { tone: "brand", icon: "▶", title: `ম্যানুয়াল রান #${run.runNo} শুরু`, body: `${run.scope} · ${modeLabel}`, tab: "pipeline" },
      });
    } else if (was && !run.active) {
      const pub = run.mode === "dry" ? 0 : run.items - run.dup - 1;
      if (run.lastResult === "success") {
        dispatch({
          type: "PUSH_NOTIF",
          now,
          n: { tone: "good", icon: "✓", title: `রান #${run.runNo} সম্পন্ন`, body: `${toBn(pub)} টি প্রকাশিত · ${toBn(run.dup)} টি ডুপ্লিকেট বাতিল`, tab: "pipeline" },
        });
      } else {
        dispatch({
          type: "PUSH_NOTIF",
          now,
          n: { tone: "warn", icon: "⏹", title: `রান #${run.runNo} বাতিল`, body: "অপারেটর দ্বারা থামানো হয়েছে", tab: "pipeline" },
        });
      }
    }
  }, [run.active, run.mode, run.runNo, run.scope, run.lastResult, run.items, run.dup]);

  // simulated live notification feed
  const liveIdx = useRef(0);
  useInterval(() => {
    const item = LIVE_POOL[liveIdx.current % LIVE_POOL.length];
    liveIdx.current += 1;
    dispatch({ type: "PUSH_NOTIF", n: item, now: Date.now() });
  }, 24000);

  const startRun = useCallback((mode: RunMode, scope: string) => dispatch({ type: "START", mode, scope, now: Date.now() }), []);
  const cancelRun = useCallback(() => dispatch({ type: "CANCEL", now: Date.now() }), []);
  const notify = useCallback((n: NotifInput) => dispatch({ type: "PUSH_NOTIF", n, now: Date.now() }), []);
  const markRead = useCallback((id: number) => dispatch({ type: "MARK_READ", id }), []);
  const markAll = useCallback(() => dispatch({ type: "MARK_ALL" }), []);
  const clearAll = useCallback(() => dispatch({ type: "CLEAR_NOTIFS" }), []);
  const removeNotif = useCallback((id: number) => dispatch({ type: "REMOVE_NOTIF", id }), []);

  const value = useMemo(
    () => ({ state, startRun, cancelRun, notify, markRead, markAll, clearAll, removeNotif }),
    [state, startRun, cancelRun, notify, markRead, markAll, clearAll, removeNotif],
  );

  return <AppContextObj.Provider value={value}>{children}</AppContextObj.Provider>;
}
