import { useEffect, useState } from "react";
import Overview from "./views/Overview";
import Analytics from "./views/Analytics";
import Pipeline from "./views/Pipeline";
import Insights from "./views/Insights";
import Content from "./views/Content";
import { BootLoader, Particles } from "./components/effects";
import { NotificationBell } from "./components/Notifications";
import { TabBar, type TabItem } from "./components/TabBar";
import { Badge } from "./components/ui";
import { cn } from "./utils/cn";
import { toBn, useNow } from "./lib/hooks";
import { moderation, palette } from "./lib/data";
import { AppProvider, SCOPES, STAGE_NAMES, useApp, type TabId } from "./context/AppContext";

const TABS: TabItem<TabId>[] = [
  { id: "overview", bn: "ওভারভিউ", en: "Overview", icon: "◧" },
  { id: "analytics", bn: "অ্যানালিটিক্স", en: "Analytics", icon: "◉" },
  { id: "pipeline", bn: "পাইপলাইন", en: "Pipeline", icon: "⬡" },
  { id: "insights", bn: "ইনসাইটস ল্যাব", en: "Insights Lab", icon: "✦" },
  { id: "content", bn: "কনটেন্ট ডেস্ক", en: "Content Desk", icon: "▤" },
];

const TICKER = [
  "DEPLOY #4821 সফল · ISR ৮.২ সে",
  "নতুন সোর্স যুক্ত — Sundarban Live",
  "ফ্যাক্ট-গেট গড় স্কোর ০.৯১",
  "SimHash ডুপ্লিকেট ব্লক ৭৩৮টি",
  "Turso রেপ্লিকা lag ১২ms",
  "LLM টোকেন খরচ ১৮.৪k /রান",
  "কমেন্ট কিউতে ৩টি ফ্ল্যাগড আইটেম",
];

function Clock() {
  const now = useNow(1000);
  const hh = now.getHours() % 12 || 12;
  return (
    <div className="hidden text-right xl:block">
      <div className="mono text-[13px] font-semibold tabular text-white/85">
        {toBn(`${String(hh).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`)}
        <span className="ml-1 text-[9px] text-white/35">{now.getHours() >= 12 ? "PM" : "AM"}</span>
      </div>
      <div className="bn text-[9.5px] text-white/30">কলকাতা · IST</div>
    </div>
  );
}

function CommandPalette({ open, onClose, onGo }: { open: boolean; onClose: () => void; onGo: (t: TabId) => void }) {
  const { state, startRun, markAll } = useApp();
  const [q, setQ] = useState("");
  if (!open) return null;

  const items = [
    ...TABS.map((t) => ({ kind: "TAB", label: `${t.bn} — ${t.en}`, run: () => onGo(t.id) })),
    {
      kind: "RUN",
      label: "ম্যানুয়াল পাইপলাইন রান — Start manual run",
      run: () => {
        if (!state.run.active) startRun("full", SCOPES[0]);
        onGo("pipeline");
      },
    },
    { kind: "ACTION", label: "সব নোটিফিকেশন পড়া — Mark all read", run: () => markAll() },
  ].filter((i) => i.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <div
      className="anim-fade fixed inset-0 z-50 flex items-start justify-center bg-black/65 p-4 pt-[14vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="panel anim-pop w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
          <span className="text-white/35">⌘</span>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ট্যাব বা কমান্ড খুঁজুন…"
            className="bn flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-white/25"
          />
          <kbd className="mono rounded border border-white/10 px-1.5 py-0.5 text-[9px] text-white/35">ESC</kbd>
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          {items.map((i, k) => (
            <button
              key={k}
              onClick={() => {
                i.run();
                onClose();
              }}
              className="bn flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[12.5px] text-white/75 transition hover:bg-white/8"
            >
              <span className="mono rounded border border-white/10 px-1.5 py-0.5 text-[8.5px] tracking-wider text-white/35">
                {i.kind}
              </span>
              {i.label}
            </button>
          ))}
          {!items.length && <div className="bn px-3 py-6 text-center text-[12px] text-white/30">কিছু পাওয়া যায়নি</div>}
        </div>
      </div>
    </div>
  );
}

function Shell() {
  const { state, startRun } = useApp();
  const { run } = state;
  const [tab, setTab] = useState<TabId>("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setBooted(true), 1300);
    return () => clearTimeout(t);
  }, []);

  // ⌘K palette, Esc, and 1–5 to jump between tabs
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (e.key === "Escape") setPaletteOpen(false);
      const el = e.target as HTMLElement;
      const typing = el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT";
      if (!typing && !e.metaKey && !e.ctrlKey) {
        const n = Number(e.key);
        if (n >= 1 && n <= TABS.length) setTab(TABS[n - 1].id);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const current = TABS.find((t) => t.id === tab)!;
  const pendingMod = moderation.filter((m) => m.state !== "approved").length;
  const tabItems: TabItem<TabId>[] = TABS.map((t) => ({
    ...t,
    badge: t.id === "pipeline" && run.active ? "▶" : t.id === "content" ? pendingMod : undefined,
  }));
  const runPct = run.active ? ((run.stageIdx + 1) / STAGE_NAMES.length) * 100 : 96;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-ink-950 text-white">
      {/* ambient background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="aurora absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-amber-brand/12 blur-[130px]" />
        <div
          className="aurora absolute right-[-10%] top-[12%] h-[460px] w-[460px] rounded-full bg-violet-brand/10 blur-[130px]"
          style={{ animationDelay: "-6s" }}
        />
        <div
          className="aurora absolute bottom-[-10%] left-[30%] h-[420px] w-[420px] rounded-full bg-cyan-brand/8 blur-[130px]"
          style={{ animationDelay: "-12s" }}
        />
        <div className="absolute inset-0 grid-bg" />
        <Particles />
      </div>

      <div className="relative z-10 flex">
        {/* ---------------- sidebar: single Dashboard entry ---------------- */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-white/7 bg-ink-900/85 backdrop-blur-xl transition-all duration-500 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
            collapsed ? "w-[74px]" : "w-[246px]",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center gap-2.5 px-4 py-5">
            <div className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-brand to-flame shadow-[0_0_22px_rgba(245,165,36,0.45)]">
              <span className="bn text-[15px] font-bold text-ink-950">হৈ</span>
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-ink-900 bg-emerald-400" />
            </div>
            {!collapsed && (
              <div className="anim-fade min-w-0">
                <div className="bn truncate text-[14px] font-bold leading-tight">হৈচৈ কনসোল</div>
                <div className="mono truncate text-[8.5px] uppercase tracking-[0.18em] text-amber-brand/70">newsroom ops</div>
              </div>
            )}
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="ml-auto hidden h-6 w-6 shrink-0 place-items-center rounded-md border border-white/10 text-[10px] text-white/40 transition hover:border-amber-brand/50 hover:text-amber-brand lg:grid"
            >
              {collapsed ? "»" : "«"}
            </button>
          </div>

          <nav className="flex-1 px-3 pb-4">
            {!collapsed && (
              <p className="mono px-2 pb-2 pt-3 text-[8.5px] uppercase tracking-[0.2em] text-white/25">navigation</p>
            )}
            <button
              onClick={() => {
                setTab("overview");
                setMobileOpen(false);
              }}
              className="group relative flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-amber-brand/18 to-transparent px-3 py-2.5 text-left text-white transition-all duration-300"
            >
              <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-amber-brand shadow-[0_0_10px_#f5a524]" />
              <span className="grid h-6 w-6 shrink-0 place-items-center text-[14px] text-amber-brand transition-transform duration-300 group-hover:scale-110">
                ▦
              </span>
              {!collapsed && (
                <span className="min-w-0 flex-1">
                  <span className="bn block truncate text-[13px] font-semibold">ড্যাশবোর্ড</span>
                  <span className="mono block truncate text-[8.5px] uppercase tracking-wider text-white/30">Dashboard</span>
                </span>
              )}
            </button>

            {!collapsed && (
              <div className="mono mt-4 space-y-1.5 px-2 text-[9px] uppercase tracking-widest text-white/25">
                <div className="flex justify-between">
                  <span>tabs</span>
                  <span className="text-white/40">{TABS.length} views</span>
                </div>
                <div className="flex justify-between">
                  <span>shortcut</span>
                  <span className="text-white/40">1 – {TABS.length} · ⌘K</span>
                </div>
              </div>
            )}
          </nav>

          {!collapsed && (
            <div className="m-3 rounded-xl border border-white/8 bg-gradient-to-br from-white/[0.06] to-transparent p-3">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    run.active ? "bg-amber-brand pulse-ring text-amber-brand" : "bg-emerald-400",
                  )}
                />
                <span className="mono truncate text-[9.5px] uppercase tracking-widest text-white/50">
                  {run.active ? `running · ${STAGE_NAMES[run.stageIdx]}` : "all systems ok"}
                </span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-brand to-emerald-400 transition-all duration-700"
                  style={{ width: `${runPct}%` }}
                />
              </div>
              <p className="bn mt-2 text-[10px] leading-snug text-white/35">
                {run.active ? "ম্যানুয়াল রান চলছে — পাইপলাইন ট্যাবে দেখুন" : "প্রতি ১০ সেকেন্ডে ডাটাবেস পোল করা হচ্ছে"}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2.5 border-t border-white/7 px-4 py-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-brand to-cyan-brand text-[11px] font-bold text-ink-950">
              সম
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="bn truncate text-[11.5px] text-white/80">সম্পাদক ডেস্ক</div>
                <div className="mono truncate text-[9px] text-white/30">editor@hoichoi.feed</div>
              </div>
            )}
          </div>
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
        )}

        {/* ---------------- main ---------------- */}
        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-white/7 bg-ink-950/80 backdrop-blur-xl">
            <div className="flex items-center gap-3 px-4 pt-3 lg:px-6">
              <button
                onClick={() => setMobileOpen(true)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-white/60 lg:hidden"
              >
                ☰
              </button>
              <div className="min-w-0">
                <h1 className="bn truncate text-[16px] font-bold leading-tight">ড্যাশবোর্ড</h1>
                <p className="mono truncate text-[9px] uppercase tracking-[0.18em] text-white/30">
                  hoichoifeed / {current.en.toLowerCase()}
                </p>
              </div>

              <button
                onClick={() => setPaletteOpen(true)}
                className="ml-auto hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11.5px] text-white/35 transition hover:border-amber-brand/40 hover:text-white/70 md:flex"
              >
                <span>🔍</span>
                <span className="bn">সার্চ বা কমান্ড</span>
                <kbd className="mono ml-6 rounded border border-white/12 px-1.5 py-0.5 text-[9px]">⌘K</kbd>
              </button>

              <Badge tone={run.active ? "warn" : "good"} dot>
                {run.active ? "RUNNING" : "LIVE"}
              </Badge>

              <NotificationBell onNavigate={setTab} />

              <button
                onClick={() => {
                  if (!run.active) startRun("full", SCOPES[0]);
                  setTab("pipeline");
                }}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-xl px-3.5 text-[11.5px] font-semibold transition",
                  run.active
                    ? "border border-amber-brand/40 bg-amber-brand/10 text-amber-brand"
                    : "bg-gradient-to-r from-amber-brand to-flame text-ink-950 shadow-[0_0_20px_rgba(245,165,36,0.35)] hover:brightness-110",
                )}
              >
                <span className={cn("inline-block", run.active ? "animate-spin" : "")}>{run.active ? "⟳" : "▶"}</span>
                <span className="bn">
                  {run.active ? `চলছে ${toBn(run.stageIdx + 1)}/${toBn(STAGE_NAMES.length)}` : "ম্যানুয়াল রান"}
                </span>
              </button>

              <Clock />
            </div>

            <div className="px-3 pt-2 lg:px-5">
              <TabBar tabs={tabItems} value={tab} onChange={setTab} />
            </div>
          </header>

          {/* ticker */}
          <div className="relative overflow-hidden border-b border-white/5 bg-black/25 py-1.5">
            <div className="marquee-track">
              {[...TICKER, ...TICKER].map((t, i) => (
                <span key={i} className="bn flex items-center gap-2 whitespace-nowrap px-5 text-[10.5px] text-white/45">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: [palette.amber, palette.cyan, palette.emerald, palette.violet, palette.rose][i % 5] }}
                  />
                  {t}
                </span>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-ink-950 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-ink-950 to-transparent" />
          </div>

          <div key={tab} className="anim-fade p-4 lg:p-6">
            {tab === "overview" && <Overview />}
            {tab === "analytics" && <Analytics />}
            {tab === "pipeline" && <Pipeline />}
            {tab === "insights" && <Insights />}
            {tab === "content" && <Content />}
          </div>

          <footer className="mono flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/7 px-6 py-5 text-[9.5px] uppercase tracking-[0.14em] text-white/25">
            <span>© ২০২৬ হৈচৈ newsroom console</span>
            <span>build 4821 · bn-style-guide v2.4</span>
            <span className="text-emerald-400/60">turso: connected</span>
            <span className="text-amber-brand/60">collector: heartbeat ৮s ago</span>
            <span className="ml-auto">designed for hoichoifeed.vercel.app</span>
          </footer>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onGo={setTab} />
      <BootLoader done={booted} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
