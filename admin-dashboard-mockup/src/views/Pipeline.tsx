import { useEffect, useMemo, useRef, useState } from "react";
import { AreaChart, FunnelChart, SemiGauge, Sparkline } from "../components/charts";
import { Badge, Card, CardHead } from "../components/ui";
import { buildTimeseries, palette, pipelineStages } from "../lib/data";
import { useInterval } from "../lib/hooks";
import {
  BASE_RUN,
  SCOPES,
  STAGE_NAMES,
  useApp,
  type LogLine,
  type Lvl,
  type RunMode,
  type StageState,
} from "../context/AppContext";
import { cn } from "../utils/cn";

const lvlColor: Record<Lvl, string> = {
  INFO: palette.cyan,
  OK: palette.emerald,
  WARN: palette.amber,
  ERR: palette.rose,
  SEP: palette.violet,
};

const stageColor = (st: StageState, running: string) =>
  st === "done"
    ? palette.emerald
    : st === "failed"
      ? palette.rose
      : st === "skipped"
        ? palette.slate
        : st === "running"
          ? running
          : "rgba(255,255,255,0.12)";

/* ------------------------------------------------------------ flow diagram */

function FlowDiagram({ stages }: { stages: StageState[] }) {
  const W = 1000;
  const H = 180;
  const y = 72;
  const gap = W / pipelineStages.length;
  const running = stages.includes("running");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" style={{ height: 190 }}>
      <defs>
        <linearGradient id="flowline" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={palette.amber} />
          <stop offset="50%" stopColor={palette.violet} />
          <stop offset="100%" stopColor={palette.emerald} />
        </linearGradient>
      </defs>
      <line x1={gap * 0.5} x2={W - gap * 0.5} y1={y} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
      <line
        x1={gap * 0.5}
        x2={W - gap * 0.5}
        y1={y}
        y2={y}
        stroke="url(#flowline)"
        strokeWidth="2.5"
        className={running ? "dash-flow" : undefined}
        opacity={running ? 0.9 : 0.22}
        style={{ transition: "opacity .5s ease" }}
      />
      {pipelineStages.slice(0, -1).map((_, i) =>
        stages[i] === "done" ? (
          <line
            key={`seg${i}`}
            x1={gap * i + gap / 2}
            x2={gap * (i + 1) + gap / 2}
            y1={y}
            y2={y}
            stroke={palette.emerald}
            strokeWidth="3"
            opacity="0.85"
          />
        ) : null,
      )}
      {pipelineStages.map((s, i) => {
        const cx = gap * i + gap / 2;
        const st = stages[i];
        const c = stageColor(st, s.color);
        const isRun = st === "running";
        return (
          <g key={s.id}>
            {isRun && <circle cx={cx} cy={y} r={26} fill={c} className="svg-ping" />}
            {isRun && <circle cx={cx} cy={y} r={22} fill={c} opacity="0.15" />}
            <circle
              cx={cx}
              cy={y}
              r={isRun ? 20 : 15}
              fill="#0a0c12"
              stroke={c}
              strokeWidth={isRun ? 3 : 1.6}
              style={{
                transition: "all .4s cubic-bezier(.22,1,.36,1)",
                filter: isRun ? `drop-shadow(0 0 12px ${c})` : undefined,
              }}
            />
            <text x={cx} y={y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill={c} className="mono">
              {st === "done" ? "✓" : st === "failed" ? "✕" : st === "skipped" ? "–" : s.id}
            </text>
            <text
              x={cx}
              y={118}
              textAnchor="middle"
              fontSize="11.5"
              fill={st === "idle" ? "rgba(255,255,255,0.55)" : "#fff"}
              className="bn"
            >
              {s.bn}
            </text>
            <text x={cx} y={133} textAnchor="middle" fontSize="8.5" fill="rgba(255,255,255,0.33)" className="mono">
              {s.en}
            </text>
            <text x={cx} y={38} textAnchor="middle" fontSize="10" fill={c} className="mono">
              {s.value}
            </text>
            <text x={cx} y={152} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.28)" className="mono">
              {s.ms}ms
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ---------------------------------------------------------------- terminal */

function Terminal({ logs }: { logs: LogLine[] }) {
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs.length]);

  return (
    <div
      ref={boxRef}
      className="mono h-[250px] overflow-auto rounded-xl border border-white/8 bg-black/55 p-3 text-[10.5px] leading-relaxed"
    >
      {logs.map((l) =>
        l.lvl === "SEP" ? (
          <div key={l.id} className="anim-fade my-2 flex items-center gap-2">
            <span className="h-px flex-1 bg-violet-brand/25" />
            <span className="whitespace-nowrap text-[9.5px] text-violet-300/80">{l.msg}</span>
            <span className="h-px flex-1 bg-violet-brand/25" />
          </div>
        ) : (
          <div key={l.id} className="anim-fade flex gap-2 whitespace-nowrap">
            <span className="text-white/25">{l.t}</span>
            <span className="w-9 shrink-0 font-bold" style={{ color: lvlColor[l.lvl] }}>
              {l.lvl}
            </span>
            <span className="text-white/65">{l.msg}</span>
          </div>
        ),
      )}
      <div className="flex gap-2">
        <span className="text-amber-brand">hoichoi@runner:~$</span>
        <span className="blink text-white">▋</span>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- run panel */

function RunPanel() {
  const { state, startRun, cancelRun } = useApp();
  const { run } = state;
  const [scope, setScope] = useState(SCOPES[0]);
  const [mode, setMode] = useState<RunMode>("full");
  const [now, setNow] = useState(0);
  useInterval(() => setNow(Date.now()), run.active ? 200 : null);

  const elapsed = run.active ? Math.max(0, (now - run.startedAt) / 1000) : 0;
  const doneCount = run.stages.filter((s) => s === "done" || s === "skipped").length;
  const progress = (doneCount + (run.active ? 0.5 : 0)) / STAGE_NAMES.length;

  const stageLabel = run.active && run.stageIdx >= 0
    ? `${STAGE_NAMES[run.stageIdx]} · ${run.stageIdx + 1}/${STAGE_NAMES.length}`
    : run.lastResult === "success"
      ? "সম্পন্ন · complete"
      : run.lastResult === "cancelled"
        ? "বাতিল · cancelled"
        : "প্রস্তুত · ready";

  const badgeTone = run.active ? "warn" : run.lastResult === "success" ? "good" : run.lastResult === "cancelled" ? "bad" : "neutral";

  return (
    <Card delay={40} className="flex flex-col">
      <CardHead
        bn="ম্যানুয়াল রান"
        en="Pipeline · trigger on demand"
        icon="▶"
        right={
          <Badge tone={badgeTone} dot={run.active}>
            {run.active ? "RUNNING" : run.lastResult ? run.lastResult.toUpperCase() : "IDLE"}
          </Badge>
        }
      />

      <label className="mono text-[9.5px] uppercase tracking-widest text-white/35">scope · সোর্স</label>
      <select
        value={scope}
        onChange={(e) => setScope(e.target.value)}
        disabled={run.active}
        className="bn mt-1.5 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-[12px] text-white/85 outline-none transition focus:border-amber-brand/50 disabled:opacity-50"
      >
        {SCOPES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <label className="mono mt-4 block text-[9.5px] uppercase tracking-widest text-white/35">mode · ধরন</label>
      <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
        {(["full", "dry"] as const).map((m) => (
          <button
            key={m}
            disabled={run.active}
            onClick={() => setMode(m)}
            className={cn(
              "mono rounded-md py-1.5 text-[10px] uppercase tracking-wider transition-all duration-300 disabled:cursor-not-allowed",
              mode === m
                ? "bg-amber-brand text-ink-950 shadow-[0_0_14px_rgba(245,165,36,0.4)]"
                : "text-white/45 hover:text-white/80",
            )}
          >
            {m === "full" ? "Full run" : "Dry-run"}
          </button>
        ))}
      </div>
      <p className="bn mt-2 text-[10.5px] text-white/35">
        {mode === "full" ? "সব ধাপ চলবে — কমিট ও ডিপ্লয় সহ" : "কমিট ও ডিপ্লয় বাদ — শুধু সংগ্রহ ও যাচাই"}
      </p>

      <div className="mt-5">
        <div className="mb-1.5 flex justify-between text-[11px]">
          <span className="mono text-white/65">{stageLabel}</span>
          <span className="mono text-white/45">{Math.round(progress * 100)}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progress * 100}%`,
              background: `linear-gradient(90deg, ${palette.amber}, ${palette.flame})`,
              boxShadow: `0 0 14px ${palette.amber}88`,
            }}
          />
        </div>
        <div className="mt-3 grid grid-cols-6 gap-1">
          {run.stages.map((st, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span
                className={cn("h-1.5 w-full rounded-full transition-colors duration-500", st === "running" && "animate-pulse")}
                style={{ background: stageColor(st, pipelineStages[i].color) }}
              />
              <span className="mono text-[8.5px] text-white/35">{pipelineStages[i].id}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mono mt-4 grid grid-cols-2 gap-2 text-center text-[10px]">
        <div className="rounded-lg border border-white/8 bg-white/[0.02] py-2">
          <div className="text-base font-bold tabular text-white">{run.active ? elapsed.toFixed(1) : "—"}</div>
          <div className="tracking-widest text-white/35">ELAPSED · সে</div>
        </div>
        <div className="rounded-lg border border-white/8 bg-white/[0.02] py-2">
          <div className="text-base font-bold tabular text-amber-brand">#{run.runNo}</div>
          <div className="tracking-widest text-white/35">RUN ID</div>
        </div>
      </div>

      <div className="mt-auto pt-5">
        {run.active ? (
          <button
            onClick={cancelRun}
            className="bn w-full rounded-xl border border-rose-400/35 bg-rose-400/10 py-2.5 text-[12.5px] font-semibold text-rose-300 transition hover:bg-rose-400/20"
          >
            ⏹ বাতিল করুন · Cancel run
          </button>
        ) : (
          <button
            onClick={() => startRun(mode, scope)}
            className="bn w-full rounded-xl bg-gradient-to-r from-amber-brand to-flame py-2.5 text-[12.5px] font-semibold text-ink-950 shadow-[0_0_22px_rgba(245,165,36,0.35)] transition hover:brightness-110 active:scale-[0.99]"
          >
            ▶ রান শুরু করুন · Run pipeline
          </button>
        )}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------- page */

const BASE_SUCCESS = 347;
const BASE_TOTAL = 360;

export default function Pipeline() {
  const { state } = useApp();
  const { run, runs, logs } = state;
  const ts = useMemo(() => buildTimeseries("24H", 31), []);

  // session-only runs (ids above the seeded history) feed the success gauge
  const session = runs.filter((r) => Number(r.id.slice(1)) > BASE_RUN && r.state !== "running");
  const sOk = session.filter((r) => r.state === "success").length;
  const sPartial = session.filter((r) => r.state === "partial").length;
  const sFail = session.length - sOk - sPartial;
  const total = BASE_TOTAL + session.length;
  const okTotal = BASE_SUCCESS + sOk;
  const rate = (okTotal / total) * 100;

  return (
    <div className="space-y-5">
      <Card delay={40}>
        <CardHead
          bn="অটোমেশন পাইপলাইন · প্রতি ২ ঘণ্টায়"
          en="FEED → SHOT → HASH → LLM → GIT → DEPLOY"
          icon="🛠️"
          right={
            run.active ? (
              <Badge tone="warn" dot>
                RUNNING · #{run.runNo}
              </Badge>
            ) : (
              <Badge tone="good" dot>
                IDLE · READY
              </Badge>
            )
          }
        />
        <FlowDiagram stages={run.stages} />
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <RunPanel />

        <Card delay={100} className="xl:col-span-2">
          <CardHead
            bn="রানার লগ"
            en="Live stdout · worker-02"
            icon="💻"
            right={<Badge tone={run.active ? "warn" : "info"}>{run.active ? "STREAMING" : "TAIL -F"}</Badge>}
          />
          <Terminal logs={logs} />
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { bn: "CPU", v: run.active ? 74 : 38, c: palette.cyan, d: [20, 28, 24, 36, 32, 38, 34, 38] },
              { bn: "মেমোরি", v: run.active ? 71 : 62, c: palette.violet, d: [40, 44, 48, 52, 58, 56, 60, 62] },
              { bn: "কিউ", v: run.active ? 4 : 17, c: palette.amber, d: [30, 26, 24, 22, 20, 19, 18, 17] },
            ].map((m) => (
              <div key={m.bn} className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                <div className="flex items-baseline justify-between">
                  <span className="bn text-[11px] text-white/50">{m.bn}</span>
                  <span className="mono text-sm font-bold tabular" style={{ color: m.c }}>
                    {m.v}%
                  </span>
                </div>
                <Sparkline values={m.d} color={m.c} width={150} height={30} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card delay={60} className="xl:col-span-2">
          <CardHead bn="২৪ ঘণ্টার রান থ্রুপুট" en="Hourly ingest volume" icon="📉" />
          <AreaChart labels={ts.labels} series={ts.series} height={250} />
        </Card>

        <Card delay={120}>
          <CardHead bn="সফলতার হার" en="Run success rate · all-time" icon="✅" />
          <div className="flex justify-center">
            <SemiGauge value={rate} label={`${rate.toFixed(1)}%`} sub={`${total} রানের মধ্যে`} color={palette.emerald} size={220} />
          </div>
          <div className="mono mt-3 space-y-2 text-[10.5px]">
            {[
              { k: "SUCCESS", v: okTotal, c: palette.emerald },
              { k: "PARTIAL", v: 9 + sPartial, c: palette.amber },
              { k: "FAILED", v: 4 + sFail, c: palette.rose },
            ].map((r) => (
              <div key={r.k} className="flex items-center gap-2">
                <span className="w-16 tracking-widest text-white/40">{r.k}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(r.v / total) * 100}%`, background: r.c }} />
                </div>
                <span className="w-8 text-right text-white/60">{r.v}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card delay={60}>
          <CardHead bn="স্টেজ ফানেল" en="Drop-off per stage" icon="🔻" />
          <FunnelChart stages={pipelineStages} />
        </Card>

        <Card delay={120} pad={false} className="xl:col-span-2">
          <div className="p-5 pb-0">
            <CardHead
              bn="রান ইতিহাস"
              en="Manual + scheduled executions"
              icon="🗂️"
              right={<Badge tone="neutral">{runs.length} রান</Badge>}
            />
          </div>
          <div className="overflow-x-auto px-2 pb-2">
            <table className="w-full min-w-[640px] text-left text-[12px]">
              <thead>
                <tr className="mono text-[9.5px] uppercase tracking-[0.14em] text-white/30">
                  {["run", "time", "items", "published", "dupes", "duration", "status"].map((h) => (
                    <th key={h} className="px-3 py-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr
                    key={r.id}
                    className={cn(
                      "anim-in border-t border-white/5 transition-colors hover:bg-white/[0.035]",
                      r.state === "running" && "bg-amber-brand/[0.05]",
                    )}
                  >
                    <td className="px-3 py-2.5">
                      <div className="mono font-semibold text-amber-brand">{r.id}</div>
                      <div className="mono mt-0.5 text-[9px] text-white/30">
                        {r.mode === "dry" ? "DRY" : "FULL"} · {r.scope.split(" ·")[0]}
                      </div>
                    </td>
                    <td className="mono px-3 py-2.5 text-white/55">{r.time}</td>
                    <td className="mono px-3 py-2.5 text-white/75">{r.items}</td>
                    <td className="mono px-3 py-2.5 text-cyan-300">{r.pub}</td>
                    <td className="mono px-3 py-2.5 text-rose-300">{r.dup}</td>
                    <td className="mono px-3 py-2.5 text-white/55">{r.dur}</td>
                    <td className="px-3 py-2.5">
                      {r.state === "running" ? (
                        <Badge tone="info" dot>
                          RUNNING
                        </Badge>
                      ) : (
                        <Badge tone={r.state === "success" ? "good" : r.state === "partial" ? "warn" : "bad"}>
                          {r.state.toUpperCase()}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
