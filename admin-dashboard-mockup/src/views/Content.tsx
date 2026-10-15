import { useMemo, useState } from "react";
import { DonutChart, RankBars, Sparkline } from "../components/charts";
import { Badge, Card, CardHead } from "../components/ui";
import { categories, moderation, palette, sources, stories } from "../lib/data";
import { cn } from "../utils/cn";
import { useApp } from "../context/AppContext";
import { fmt } from "../lib/hooks";

const FILTERS = ["সব", "published", "review", "queued"] as const;
type Filter = (typeof FILTERS)[number];

const stateTone: Record<string, "good" | "warn" | "info"> = {
  published: "good",
  review: "warn",
  queued: "info",
};

export default function Content() {
  const [filter, setFilter] = useState<Filter>("সব");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"score" | "views">("views");
  const [selected, setSelected] = useState<string | null>(null);
  const [modState, setModState] = useState(() => moderation.map((m) => m.state));
  const { notify } = useApp();

  const rows = useMemo(() => {
    return stories
      .filter((s) => (filter === "সব" ? true : s.state === filter))
      .filter((s) => (q ? s.title.includes(q) || s.hash.includes(q.toLowerCase()) : true))
      .sort((a, b) => (sort === "score" ? b.score - a.score : b.views - a.views));
  }, [filter, q, sort]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2" pad={false} delay={40}>
          <div className="flex flex-wrap items-center gap-3 p-5 pb-3">
            <CardHead bn="আজকের সংগ্রহ" en="Auto-curated story table" icon="🗞️" />
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <div className="relative">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="খুঁজুন / hash…"
                  className="bn w-44 rounded-lg border border-white/10 bg-white/[0.03] py-1.5 pl-8 pr-3 text-[11.5px] text-white/85 outline-none transition placeholder:text-white/25 focus:border-amber-brand/50 focus:bg-white/[0.06]"
                />
                <span className="pointer-events-none absolute left-2.5 top-1.5 text-[11px] opacity-40">🔍</span>
              </div>
              <div className="flex rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "mono rounded-[6px] px-2 py-1 text-[9.5px] uppercase transition-all duration-300",
                      filter === f ? "bg-white/90 text-ink-950" : "text-white/40 hover:text-white/75",
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto px-2 pb-3">
            <table className="w-full min-w-[720px] text-left text-[12px]">
              <thead>
                <tr className="mono text-[9.5px] uppercase tracking-[0.14em] text-white/30">
                  <th className="px-3 py-2 font-medium">headline</th>
                  <th className="px-3 py-2 font-medium">category</th>
                  <th className="cursor-pointer px-3 py-2 font-medium hover:text-amber-brand" onClick={() => setSort("score")}>
                    fact-gate {sort === "score" && "▾"}
                  </th>
                  <th className="cursor-pointer px-3 py-2 font-medium hover:text-amber-brand" onClick={() => setSort("views")}>
                    views {sort === "views" && "▾"}
                  </th>
                  <th className="px-3 py-2 font-medium">hash</th>
                  <th className="px-3 py-2 font-medium">state</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s, i) => (
                  <tr
                    key={s.hash}
                    onClick={() => setSelected(selected === s.hash ? null : s.hash)}
                    className={cn(
                      "anim-in cursor-pointer border-t border-white/5 transition-colors",
                      selected === s.hash ? "bg-amber-brand/8" : "hover:bg-white/[0.035]",
                    )}
                    style={{ animationDelay: `${i * 45}ms` }}
                  >
                    <td className="bn max-w-[300px] px-3 py-3 text-white/85">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: s.state === "published" ? palette.emerald : s.state === "review" ? palette.amber : palette.cyan }} />
                        <span className="truncate">{s.title}</span>
                      </div>
                      <span className="mono ml-3.5 text-[9.5px] text-white/30">SYNCED {s.time}</span>
                    </td>
                    <td className="bn px-3 py-3 text-white/55">{s.cat}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-12 overflow-hidden rounded-full bg-white/8">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${s.score * 100}%`, background: s.score >= 0.9 ? palette.emerald : palette.amber }}
                          />
                        </div>
                        <span className="mono text-white/60">{s.score.toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="mono px-3 py-3 tabular text-white/70">{fmt(s.views)}</td>
                    <td className="mono px-3 py-3 text-[10.5px] text-violet-300/80">{s.hash}</td>
                    <td className="px-3 py-3">
                      <Badge tone={stateTone[s.state]}>{s.state}</Badge>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="bn px-3 py-10 text-center text-white/35">
                      কোনো রেকর্ড মেলেনি
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          <Card delay={100}>
            <CardHead bn="সম্পাদকীয় কিউ" en="Moderation queue" icon="🛡️" right={<Badge tone="warn">{modState.filter((s) => s === "pending" || s === "flagged").length} পেন্ডিং</Badge>} />
            <div className="space-y-2.5">
              {moderation.map((m, i) => (
                <div key={i} className="anim-in rounded-xl border border-white/7 bg-white/[0.02] p-3 transition hover:border-white/15" style={{ animationDelay: `${i * 70}ms` }}>
                  <div className="flex items-center gap-2">
                    <span
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold"
                      style={{ background: `${palette.violet}22`, color: palette.violet }}
                    >
                      {m.user.slice(0, 1)}
                    </span>
                    <span className="bn truncate text-[11.5px] text-white/75">{m.user}</span>
                    <span
                      className="mono ml-auto rounded px-1.5 py-0.5 text-[9.5px]"
                      style={{
                        background: m.risk > 0.6 ? `${palette.rose}1f` : m.risk > 0.25 ? `${palette.amber}1f` : `${palette.emerald}1f`,
                        color: m.risk > 0.6 ? palette.rose : m.risk > 0.25 ? palette.amber : palette.emerald,
                      }}
                    >
                      RISK {m.risk.toFixed(2)}
                    </span>
                  </div>
                  <p className="bn mt-1.5 text-[11.5px] leading-snug text-white/60">{m.text}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/6">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${m.risk * 100}%`, background: m.risk > 0.6 ? palette.rose : m.risk > 0.25 ? palette.amber : palette.emerald }}
                      />
                    </div>
                    {modState[i] !== "pending" && modState[i] !== "flagged" ? (
                      <Badge tone={modState[i] === "approved" ? "good" : "bad"}>{modState[i] === "approved" ? "অনুমোদিত" : "বাতিল"}</Badge>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setModState((s) => s.map((v, j) => (j === i ? "approved" : v)));
                            notify({ tone: "good", icon: "✓", title: "মন্তব্য অনুমোদিত", body: `${m.user} — ঝুঁকি ${m.risk.toFixed(2)}`, tab: "content" });
                          }}
                          className="bn rounded-md border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-300 transition hover:bg-emerald-400/20"
                        >
                          অনুমোদন
                        </button>
                        <button
                          onClick={() => {
                            setModState((s) => s.map((v, j) => (j === i ? "rejected" : v)));
                            notify({ tone: "bad", icon: "✕", title: "মন্তব্য বাতিল", body: `${m.user} — স্প্যাম হিসেবে চিহ্নিত`, tab: "content" });
                          }}
                          className="bn rounded-md border border-rose-400/30 bg-rose-400/10 px-2 py-0.5 text-[10px] text-rose-300 transition hover:bg-rose-400/20"
                        >
                          বাতিল
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card delay={160}>
            <CardHead bn="বিভাগ শেয়ার" en="Category donut" icon="🍩" />
            <div className="flex justify-center">
              <DonutChart
                data={categories.map((c) => ({ label: c.bn, value: c.value, color: c.color }))}
                size={180}
                thickness={20}
                centerLabel="৬"
                centerSub="সক্রিয় বিভাগ"
              />
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2" pad={false} delay={60}>
          <div className="p-5 pb-0">
            <CardHead bn="সোর্স মনিটর" en="Facebook watchlist health" icon="📡" right={<Badge tone="info" dot>POLLING</Badge>} />
          </div>
          <div className="overflow-x-auto px-2 pb-3">
            <table className="w-full min-w-[680px] text-left text-[12px]">
              <thead>
                <tr className="mono text-[9.5px] uppercase tracking-[0.14em] text-white/30">
                  {["source", "posts", "success", "latency", "7d trend", "status"].map((h) => (
                    <th key={h} className="px-3 py-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sources.map((s, i) => (
                  <tr key={s.handle} className="anim-in border-t border-white/5 transition-colors hover:bg-white/[0.035]" style={{ animationDelay: `${i * 55}ms` }}>
                    <td className="px-3 py-3">
                      <div className="bn text-white/85">{s.name}</div>
                      <div className="mono text-[9.5px] text-white/30">{s.handle}</div>
                    </td>
                    <td className="mono px-3 py-3 text-white/70">{fmt(s.posts)}</td>
                    <td className="px-3 py-3">
                      <span className="mono" style={{ color: s.ok > 95 ? palette.emerald : s.ok > 85 ? palette.amber : palette.rose }}>
                        {s.ok}%
                      </span>
                    </td>
                    <td className="mono px-3 py-3 text-white/55">{s.latency}s</td>
                    <td className="px-3 py-3">
                      <Sparkline values={s.trend} color={s.status === "paused" ? palette.slate : palette.cyan} width={88} height={26} area={false} />
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={s.status === "live" ? "good" : s.status === "degraded" ? "warn" : "neutral"} dot={s.status === "live"}>
                        {s.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card delay={120}>
          <CardHead bn="সর্বাধিক পঠিত" en="Top stories by views" icon="🔥" />
          <RankBars
            data={[...stories]
              .sort((a, b) => b.views - a.views)
              .slice(0, 6)
              .map((s, i) => ({
                label: s.title.slice(0, 26) + "…",
                value: s.views,
                color: [palette.amber, palette.flame, palette.cyan, palette.violet, palette.emerald, palette.rose][i],
              }))}
          />
        </Card>
      </div>
    </div>
  );
}
