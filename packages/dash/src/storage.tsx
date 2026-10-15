import type { StorageSnapshot } from "@hoichoi/shared-types";
import { fmt, fmtBytes, useCountUp } from "./hooks";
import { Badge, BarChart, Card, CardHead, DonutChart, EmptyState, RankBars, Sparkline } from "./kit";

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#a855f7", "#d64541", "#14b8a6", "#ec4899", "#8b5cf6"];

const KIND_LABEL: Record<string, string> = {
  local: "লোকাল ডিস্ক",
  github: "GitHub",
  s3: "S3 / অবজেক্ট স্টোর",
};

/** Animated big-number tile that counts up from zero. */
function ByteTile({
  bn,
  en,
  bytes,
  files,
  color,
  hint,
}: {
  bn: string;
  en: string;
  bytes: number;
  files?: number;
  color: string;
  hint?: string;
}) {
  const shown = useCountUp(bytes, 1400);
  return (
    <Card className="relative overflow-hidden">
      <div className="aurora pointer-events-none absolute -top-14 -right-10 h-36 w-36 rounded-full opacity-25 blur-3xl" style={{ background: color }} />
      <div className="relative">
        <p className="bn text-[12.5px] text-white/55">{bn}</p>
        <p className="mono mt-0.5 text-[9px] tracking-[0.16em] text-white/28 uppercase">{en}</p>
        <p className="mono tabular mt-3 text-[28px] leading-none font-bold text-white">{fmtBytes(shown)}</p>
        {typeof files === "number" ? (
          <p className="mono mt-1.5 text-[11px] text-white/45">{fmt(files)} ফাইল</p>
        ) : null}
        {hint ? <p className="bn mt-1.5 text-[10.5px] text-white/35">{hint}</p> : null}
      </div>
    </Card>
  );
}

/**
 * Storage report — database size, on-disk media growth, and the media held at
 * every storage location (local disk plus each remote adapter). Shared by the
 * web admin and the desktop monitor; charts animate in via the kit hooks.
 */
export function StorageView({ data, loading = false, error = null }: { data: StorageSnapshot | null; loading?: boolean; error?: string | null }) {
  if (!data) {
    return (
      <Card>
        <EmptyState>
          স্টোরেজ রিপোর্ট এখনো তৈরি হয়নি। ডেটাবেস ও মিডিয়া সূচনা হলে এখানে ডিস্ক, GitHub ও অন্যান্য
          রিমোট স্টোরেজের ব্যবহার লাইভ দেখা যাবে।
        </EmptyState>
      </Card>
    );
  }

  const { db, media, locations, tables } = data;
  const totalBytes = media.bytes + db.bytes;
  const donut = locations
    .filter((l) => l.bytes > 0)
    .map((l, i) => ({ label: l.label, value: l.bytes, color: COLORS[i % COLORS.length]! }));
  const maxLoc = Math.max(1, ...locations.map((l) => l.bytes));
  const daily = [...media.byDay].reverse();
  const maxTable = Math.max(1, ...tables.map((t) => t.rows));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="bn text-[15px] font-bold text-white">স্টোরেজ ও ডেটাবেস</p>
          <p className="bn text-[11.5px] text-white/45">ডিস্ক, ডেটাবেস ও প্রতিটি রিমোট স্টোরেজে মিডিয়ার ব্যবহার</p>
        </div>
        <span className="mono text-[10.5px] tracking-[0.12em] text-white/40 uppercase">
          {loading ? "SYNCING…" : `UPDATED ${new Date(data.generatedAt).toLocaleTimeString()}`}
          {error ? ` · ${error}` : ""}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ByteTile bn="ডেটাবেস" en="DATABASE" bytes={db.bytes} color="#3b82f6" hint={`${db.pages.toLocaleString()} পেজ · ${db.pageSize} বাইট/পেজ`} />
        <ByteTile bn="মিডিয়া (লোকাল)" en="MEDIA ON DISK" bytes={media.bytes} files={media.files} color="#22c55e" hint="এই ডিভাইসে সংরক্ষিত" />
        <ByteTile bn="সর্বমোট ব্যবহৃত" en="TOTAL FOOTPRINT" bytes={totalBytes} color="#d64541" hint="ডেটাবেস + লোকাল মিডিয়া" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHead bn="স্টোরেজ লোকেশন অনুযায়ী" en="BY LOCATION" right={<Badge tone="good" dot>{locations.filter((l) => l.enabled).length} সক্রিয়</Badge>} />
          {donut.length === 0 ? (
            <p className="bn text-[12px] text-white/40">এখনো কোনো ফাইল নেই।</p>
          ) : (
            <DonutChart data={donut} centerLabel="bytes" />
          )}
          <div className="mt-4 space-y-3">
            {locations.map((l, i) => (
              <div key={l.id} className="border-t border-white/5 pt-3 first:border-0 first:pt-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2 text-[12.5px] font-semibold text-white/85">
                    <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="truncate">{l.label}</span>
                    <span className="mono text-[9px] tracking-[0.14em] text-white/30 uppercase">{KIND_LABEL[l.kind] ?? l.kind}</span>
                    {l.enabled ? null : <Badge tone="warn">নিষ্ক্রিয়</Badge>}
                  </span>
                  <span className="mono shrink-0 text-[12px] text-white/60">{fmtBytes(l.bytes)} · {fmt(l.files)}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <span
                    className="block h-full rounded-full transition-[width] duration-700"
                    style={{ width: `${Math.round((l.bytes / maxLoc) * 100)}%`, background: COLORS[i % COLORS.length] }}
                  />
                </div>
                <p className="bn mt-1 text-[10.5px] text-white/35">{l.detail}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHead bn="রিমোট স্টোরেজে ফাইল" en="REMOTE MIRROR" />
          {locations.filter((l) => l.kind !== "local").length === 0 ? (
            <p className="bn text-[12px] text-white/40">
              কোনো রিমোট স্টোরেজ কনফিগার করা নেই — সেটিংস → মিডিয়া স্টোরেজে GitHub বা S3 যোগ করুন।
            </p>
          ) : (
            <RankBars
              data={locations
                .filter((l) => l.kind !== "local")
                .map((l, i) => ({ label: l.label, sub: `${fmt(l.files)} ফাইল`, value: l.files, color: COLORS[i % COLORS.length]! }))}
            />
          )}
        </Card>
      </div>

      <Card>
        <CardHead bn="মিডিয়া বৃদ্ধি (দিন অনুযায়ী)" en="MEDIA GROWTH · BY DAY" right={<Sparkline values={daily.map((d) => d.bytes)} color="#22c55e" />} />
        {daily.length === 0 ? (
          <p className="bn text-[12px] text-white/40">এখনো কোনো মিডিয়া ফাইল সংরক্ষিত হয়নি।</p>
        ) : (
          <BarChart
            labels={daily.map((d) => d.day.slice(5))}
            series={[{ name: "bytes", color: "#22c55e", values: daily.map((d) => d.bytes) }]}
            height={240}
          />
        )}
      </Card>

      <Card>
        <CardHead bn="ডেটাবেস টেবিল (সারি)" en="DATABASE TABLES · ROWS" />
        <RankBars
          data={tables
            .slice()
            .sort((a, b) => b.rows - a.rows)
            .slice(0, 12)
            .map((t, i) => ({ label: t.name, sub: `${fmt(t.rows)} সারি`, value: Math.round((t.rows / maxTable) * 100), color: COLORS[i % COLORS.length]! }))}
        />
      </Card>
    </div>
  );
}
