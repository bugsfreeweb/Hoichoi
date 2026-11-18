import { mediaDashboard, type MediaProviderCard } from "@hoichoi/db";
import { PageHeading } from "@/components/admin/ui/PageHeader";
import { MediaReconcilePanel } from "@/components/admin/MediaReconcilePanel";
import { toBn } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Media dashboard.
 *
 * Server-rendered from the same rows the uploader writes, so every number here
 * is measured. No sparkline is drawn from invented data: an empty series means
 * nothing was uploaded, and the zero-filled days make a stall visible instead of
 * collapsing the chart into a single point.
 */

function bytes(n: number): string {
  if (n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = n;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

/** Inline sparkline of the last 14 days. Width is fixed; height scales with data. */
function Spark({ series }: { series: MediaProviderCard["series"] }) {
  const max = Math.max(1, ...series.map((d) => d.bytes));
  const w = 196;
  const h = 34;
  const step = series.length > 1 ? w / (series.length - 1) : w;
  const points = series
    .map((d, i) => `${(i * step).toFixed(1)},${(h - Math.max(1, (d.bytes / max) * h)).toFixed(1)}`)
    .join(" ");
  const empty = series.every((d) => d.bytes === 0);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} role="img" aria-label="শেষ ১৪ দিনের আপলোড">
      <line x1="0" y1={h - 0.5} x2={w} y2={h - 0.5} stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" />
      {empty ? null : (
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      )}
    </svg>
  );
}

const STATE_BADGE: Record<string, { bn: string; cls: string }> = {
  ok: { bn: "স্বাভাবিক", cls: "border-cat-teal text-ink" },
  degraded: { bn: "ব্যর্থতা", cls: "border-alizarin text-alizarin" },
  cooldown: { bn: "বিরতিতে", cls: "border-alizarin text-alizarin" },
  quota_exceeded: { bn: "কোটা শেষ", cls: "border-alizarin text-alizarin" },
  disabled: { bn: "বন্ধ", cls: "border-ink/20 text-ink-soft" },
};

export default async function AdminMediaPage() {
  const dash = await mediaDashboard();
  const { totals, providers, formats, headline } = dash;

  return (
    <div>
      <PageHeading
        emoji="🗄️"
        kicker="STORAGE & QUOTA"
        title="মিডিয়া ড্যাশবোর্ড"
        description="কোন প্রোভাইডারে কত মিডিয়া আছে, কোটা কতটা বাকি আর কোনটি ব্যর্থ হচ্ছে — সবটাই আসল আপলোডের হিসাব থেকে।"
      />

      <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "মোট মিডিয়া", value: bytes(totals.bytes) },
          { label: "ফাইল", value: toBn(totals.objects) },
          { label: "প্রোভাইডার", value: toBn(totals.providers) },
          { label: "সমস্যা", value: toBn(totals.failing + totals.cooldown + totals.overQuota) },
        ].map((box) => (
          <div key={box.label} className="border border-ink/20 bg-paper-deep px-3 py-2.5">
            <p className="font-mono-x text-[9.5px] tracking-[0.2em] text-ink-soft uppercase">{box.label}</p>
            <p className="mt-0.5 font-sans-bn text-[20px] font-bold text-ink">{box.value}</p>
          </div>
        ))}
      </div>

      <p className="mt-3 border-l-2 border-cat-teal bg-cat-teal/10 px-3 py-2 text-[12.5px] leading-relaxed text-ink">
        {headline}
      </p>

      {providers.length === 0 ? (
        <p className="mt-5 border border-ink/20 bg-paper-deep px-4 py-3 text-[12.5px] leading-relaxed text-ink-soft">
          এখনও কোনো মিডিয়া আপলোড হয়নি। প্রথম আপলোডের পরেই এখানে প্রোভাইডারভিত্তিক ব্যবহার, কোটা আর
          শেষ ১৪ দিনের ধারা দেখা যাবে।
        </p>
      ) : (
        <div className="mt-5 space-y-2">
          {providers.map((p) => {
            const badge = STATE_BADGE[p.state] ?? STATE_BADGE.ok!;
            return (
              <div key={p.key} className="border border-ink/20 bg-paper-deep p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono-x text-[11px] tracking-[0.12em] text-ink">{p.label}</span>
                  <span
                    className={`border px-1.5 py-0.5 font-mono-x text-[9px] tracking-[0.14em] uppercase ${badge.cls}`}
                  >
                    {badge.bn}
                  </span>
                  <span className="ml-auto font-mono-x text-[10.5px] text-ink-soft">
                    {bytes(p.usedBytes)}
                    {p.quotaBytes === null ? " · কোটা নির্ধারিত নয়" : ` / ${bytes(p.quotaBytes)}`}
                    {` · ${toBn(p.objects)} ফাইল`}
                  </span>
                </div>

                {p.quotaPercent !== null ? (
                  <div className="mt-2 h-1.5 w-full bg-ink/10" aria-label={`কোটা ব্যবহৃত ${p.quotaPercent}%`}>
                    <div
                      className={p.quotaPercent >= 90 ? "h-1.5 bg-alizarin" : "h-1.5 bg-cat-teal"}
                      style={{ width: `${p.quotaPercent}%` }}
                    />
                  </div>
                ) : null}

                <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                  <p className="text-[11.5px] leading-relaxed text-ink-soft">
                    সফল {toBn(p.successCount)} · ব্যর্থ {toBn(p.failureCount)}
                    {p.consecutiveFailures > 0 ? ` · টানা ${toBn(p.consecutiveFailures)}` : ""}
                    {p.lastSuccessAt ? ` · শেষ সফল ${p.lastSuccessAt.slice(0, 16).replace("T", " ")}` : ""}
                  </p>
                  <span className="text-ink-soft">
                    <Spark series={p.series} />
                  </span>
                </div>

                {p.lastError ? (
                  <p className="mt-1 text-[11.5px] leading-relaxed text-alizarin">শেষ ত্রুটি: {p.lastError}</p>
                ) : null}
                {p.lastFallbackReason ? (
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-soft">
                    বিকল্পে গিয়েছিল: {p.lastFallbackReason}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {formats.length > 0 ? (
        <div className="mt-5 border border-ink/20 bg-paper-deep p-3.5">
          <p className="font-mono-x text-[9.5px] tracking-[0.2em] text-ink-soft uppercase">ফাইল ফরম্যাট</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
            প্রতিটি ফাইলের নিজের হেডার থেকে পড়া — নাম দেখে নয়। যে ফাইলের হেডার পড়া যায়নি সেটি
            &ldquo;অশ্রেণীবদ্ধ&rdquo;, অনুমান নয়।
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {formats.map((f) => {
              const label = f.mime === "unknown" ? "অশ্রেণীবদ্ধ" : f.mime.replace("image/", "").toUpperCase();
              const size = f.maxWidth && f.maxHeight ? ` · সর্বোচ্চ ${toBn(f.maxWidth)}×${toBn(f.maxHeight)}` : "";
              return (
                <span
                  key={f.mime}
                  className="border border-ink/20 bg-paper px-1.5 py-0.5 font-mono-x text-[10px] tracking-[0.1em] text-ink"
                  title={`${f.files} ফাইল · ${bytes(f.bytes)}${size}`}
                >
                  {label} · {toBn(f.files)}
                  <span className="text-ink-soft"> · {bytes(f.bytes)}</span>
                </span>
              );
            })}
          </div>
        </div>
      ) : null}

      <MediaReconcilePanel />
    </div>
  );
}
