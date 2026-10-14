import type { TrafficCountry, TrafficRange, TrafficSnapshot } from "@hoichoi/shared-types";
import { Badge, Card, CardHead, DonutChart, EmptyState, KpiCard, RankBars, SegMent } from "./kit";
import { fmt, fmtCompact } from "./hooks";

const RANGES: readonly TrafficRange[] = ["24h", "7d", "30d"];
const COLORS = ["#d64541", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#14b8a6", "#ec4899", "#8b5cf6"];

/** A flag + name + count row used inside the dark dash panels. */
function CountryList({ countries, empty = "—" }: { countries: TrafficCountry[]; empty?: string }) {
  if (countries.length === 0) return <p className="bn text-[12px] text-white/40">{empty}</p>;
  return (
    <ul className="space-y-1.5">
      {countries.map((c, i) => (
        <li key={`${c.countryCode}-${c.country}-${i}`} className="bn flex items-center justify-between gap-2 text-[12.5px] text-white/80">
          <span className="flex min-w-0 items-center gap-2">
            <span className="text-[15px] leading-none">{c.flag || "🌐"}</span>
            <span className="truncate">{c.country || "Unknown"}</span>
          </span>
          <span className="mono shrink-0 text-white/50">{fmt(c.count)}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * First-party analytics view — the five admin groups (live visitors, most-read
 * content, comments, page-view/OS/browser mix, ads). Shared by the web admin and
 * the desktop monitor so both render the exact same panels.
 */
export function TrafficView({
  data,
  range,
  onRange,
  loading = false,
  error = null,
}: {
  data: TrafficSnapshot | null;
  range: TrafficRange;
  onRange: (r: TrafficRange) => void;
  loading?: boolean;
  error?: string | null;
}) {
  if (!data) {
    return (
      <Card>
        <EmptyState>
          ট্রাফিক ডেটা এখনো নেই। পাঠকরা সাইটে এলে এখানে লাইভ ভিজিটর, জনপ্রিয় পোস্ট, মন্তব্য,
          ডিভাইস-ব্রেকডাউন আর বিজ্ঞাপনের হিসাব দেখা যাবে।
        </EmptyState>
      </Card>
    );
  }

  const { online, visitors, topContent, comments, traffic, ads } = data;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegMent options={RANGES} value={range} onChange={onRange} />
        <span className="mono text-[10.5px] tracking-[0.12em] text-white/40 uppercase">
          {loading ? "SYNCING…" : `UPDATED ${new Date(data.generatedAt).toLocaleTimeString()}`}
          {error ? ` · ${error}` : ""}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard bn="এখন অনলাইন" en="ONLINE NOW" value={online.visitors} delta={0} color="#22c55e" spark={[1, 2]} hint={`শেষ ${online.windowMin} মিনিটে সক্রিয়`} />
        <KpiCard bn="ইউনিক ভিজিটর" en="UNIQUE VISITORS" value={visitors.total} delta={0} color="#3b82f6" spark={[1, 2]} hint={`রেঞ্জ: ${range}`} />
        <KpiCard bn="পেজ ভিউ" en="PAGE VIEWS" value={visitors.pageViews} delta={0} color="#d64541" spark={[1, 2]} hint={`গড় ${visitors.total > 0 ? (visitors.pageViews / visitors.total).toFixed(1) : "0"} পেজ/ভিজিটর`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHead bn="এখন কোথায় কোথায় অনলাইন" en="ONLINE BY COUNTRY" right={<Badge tone="good" dot>{online.visitors} online</Badge>} />
          <CountryList countries={online.countries} />
        </Card>
        <Card>
          <CardHead bn="দেশ অনুযায়ী ভিজিটর" en={`VISITORS · ${range.toUpperCase()}`} />
          <CountryList countries={visitors.countries} />
        </Card>
      </div>

      <Card>
        <CardHead bn="সবচেয়ে বেশি পড়া কনটেন্ট" en={`TOP CONTENT · ${range.toUpperCase()}`} />
        {topContent.length === 0 ? (
          <p className="bn text-[12px] text-white/40">কোনো পোস্ট ভিউ এখনো নেই।</p>
        ) : (
          <div className="space-y-3">
            {topContent.map((p, i) => (
              <div key={p.postId ?? i} className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3 last:border-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="mono grid h-6 w-6 shrink-0 place-items-center rounded-md bg-white/10 text-[11px] text-white/70">{i + 1}</span>
                  <a href={p.href} target="_blank" rel="noreferrer" className="bn truncate text-[13px] font-semibold text-white/90 hover:text-[#d64541]">
                    {p.title}
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    {p.countries.slice(0, 5).map((c, j) => (
                      <span key={`${c.countryCode || c.country}-${j}`} title={`${c.country}: ${c.count}`} className="text-[14px] leading-none">
                        {c.flag || "🌐"}
                      </span>
                    ))}
                  </span>
                  <span className="mono shrink-0 text-[12px] text-white/60">{fmtCompact(p.views)} views</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHead bn="মোট অনুমোদিত মন্তব্য" en="APPROVED COMMENTS" />
          <p className="mono text-[34px] leading-none font-bold text-white">{fmt(comments.total)}</p>
          <p className="bn mt-2 text-[11.5px] text-white/45">সব সময়ের অনুমোদিত মন্তব্য</p>
        </Card>
        <Card>
          <CardHead bn="সাম্প্রতিক মন্তব্য" en="RECENT" />
          {comments.recent.length === 0 ? (
            <p className="text-[12px] text-white/40">—</p>
          ) : (
            <ul className="space-y-2.5">
              {comments.recent.map((c) => (
                <li key={c.id} className="bn text-[12px]">
                  <p className="line-clamp-2 text-white/80">“{c.body}”</p>
                  <p className="mt-0.5 text-[10.5px] text-white/40">
                    <span className="text-white/60">{c.author}</span>
                    {" · "}
                    <a href={c.href} target="_blank" rel="noreferrer" className="hover:text-[#d64541]">{c.postTitle}</a>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHead bn="সবচেয়ে জনপ্রিয়" en="MOST LIKED" />
          {comments.popular.length === 0 ? (
            <p className="text-[12px] text-white/40">—</p>
          ) : (
            <ul className="space-y-2.5">
              {comments.popular.map((c) => (
                <li key={c.id} className="bn text-[12px]">
                  <p className="line-clamp-2 text-white/80">“{c.body}”</p>
                  <p className="mt-0.5 text-[10.5px] text-white/40">
                    ♥ {fmt(c.likes)}
                    {" · "}
                    <a href={c.href} target="_blank" rel="noreferrer" className="hover:text-[#d64541]">{c.postTitle}</a>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHead bn="সেশন ও বাউন্স" en="SESSIONS · BOUNCE" />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="mono text-[24px] font-bold text-white">{fmt(traffic.sessions)}</p>
              <p className="bn text-[10.5px] text-white/45">সেশন</p>
            </div>
            <div>
              <p className="mono text-[24px] font-bold text-white">{fmt(traffic.pageViews)}</p>
              <p className="bn text-[10.5px] text-white/45">পেজ ভিউ</p>
            </div>
            <div>
              <p className="mono text-[24px] font-bold text-[#d64541]">{traffic.bounceRate}%</p>
              <p className="bn text-[10.5px] text-white/45">বাউন্স রেট</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="mono mb-2 text-[9.5px] tracking-[0.14em] text-white/35 uppercase">DEVICE</p>
            <DonutChart
              data={traffic.devices.map((d, i) => ({ label: d.key, value: d.count, color: COLORS[i % COLORS.length]! }))}
              centerLabel="sessions"
            />
          </div>
        </Card>
        <Card>
          <CardHead bn="অপারেটিং সিস্টেম ও ব্রাউজার" en="OS · BROWSER" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mono mb-2 text-[9.5px] tracking-[0.14em] text-white/35 uppercase">OS</p>
              <DonutChart data={traffic.os.map((d, i) => ({ label: d.key, value: d.count, color: COLORS[i % COLORS.length]! }))} size={120} />
            </div>
            <div>
              <p className="mono mb-2 text-[9.5px] tracking-[0.14em] text-white/35 uppercase">BROWSER</p>
              <DonutChart data={traffic.browser.map((d, i) => ({ label: d.key, value: d.count, color: COLORS[i % COLORS.length]! }))} size={120} />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHead bn="বিজ্ঞাপন ভিউ ও ক্লিক" en="AD VIEWS · CLICKS" right={<Badge tone="brand">CTR {ads.ctr}%</Badge>} />
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div>
              <p className="mono text-[24px] font-bold text-white">{fmt(ads.views)}</p>
              <p className="bn text-[10.5px] text-white/45">ভিউ</p>
            </div>
            <div>
              <p className="mono text-[24px] font-bold text-white">{fmt(ads.clicks)}</p>
              <p className="bn text-[10.5px] text-white/45">ক্লিক</p>
            </div>
            <div>
              <p className="mono text-[24px] font-bold text-[#a855f7]">{ads.ctr}%</p>
              <p className="bn text-[10.5px] text-white/45">CTR</p>
            </div>
          </div>
          {ads.bySlot.length === 0 ? (
            <p className="bn text-[12px] text-white/40">কোনো বিজ্ঞাপন ইভেন্ট নেই।</p>
          ) : (
            <RankBars data={ads.bySlot.map((s, i) => ({ label: s.slot, sub: `${s.clicks} click · ${s.ctr}%`, value: s.views, color: COLORS[i % COLORS.length]! }))} />
          )}
        </Card>
        <Card>
          <CardHead bn="পোস্ট অনুযায়ী বিজ্ঞাপন" en="ADS BY POST" />
          {ads.byPost.length === 0 ? (
            <p className="bn text-[12px] text-white/40">পোস্ট-ভিত্তিক বিজ্ঞাপন ডেটা এখনো নেই।</p>
          ) : (
            <ul className="space-y-2.5">
              {ads.byPost.map((p, i) => (
                <li key={p.postId ?? i} className="flex items-center justify-between gap-3 text-[12.5px]">
                  <a href={p.href} target="_blank" rel="noreferrer" className="bn truncate text-white/85 hover:text-[#d64541]">{p.title}</a>
                  <span className="mono shrink-0 text-white/50">{fmt(p.views)}v / {fmt(p.clicks)}c</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
