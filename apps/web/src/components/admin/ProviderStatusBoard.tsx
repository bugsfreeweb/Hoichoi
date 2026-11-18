import {
  listAiProviderStatus,
  providerVerdict,
  VERDICT_LABEL_BN,
  type AiProviderStatusRow,
  type ProviderVerdict,
} from "@hoichoi/db";
import { Card, CardHead } from "@/components/admin/ui/Card";

/**
 * Every AI provider's state, at once.
 *
 * The old panel described the *page* of rows on screen, so a dead provider that
 * happened to sit on page two simply was not in the report, and the totals
 * changed as you paged. This reads the whole fleet in one query and draws it
 * from measured facts only:
 *
 *  - `ai_task_runs` — one row per real AI call, giving success rate, latency and
 *    an hourly bar chart of what actually happened.
 *  - `llm_providers.last_ok_at / last_error_at / error_count` — the resolver's own
 *    verdict on the last attempt.
 *  - `rate_limit_rpm` — the operator's declared ceiling, compared with the calls
 *    the ledger recorded in the last minute. A provider that does not declare a
 *    ceiling says so; it is never given an invented one.
 */

const VERDICT_STYLE: Record<ProviderVerdict, { classes: string; dot: string; tint: string }> = {
  // The accent tokens are CSS variables, so a Tailwind alpha modifier (`bg-cat-teal/10`)
  // silently produces no rule at all — the pill and the bars came out transparent.
  // Tints are mixed from the token instead, which keeps them theme-aware.
  alive: {
    classes: "border-cat-teal text-cat-teal",
    dot: "bg-cat-teal",
    tint: "color-mix(in srgb, var(--color-cat-teal) 12%, transparent)",
  },
  failing: {
    classes: "border-alizarin text-alizarin",
    dot: "bg-alizarin",
    tint: "color-mix(in srgb, var(--color-alizarin) 12%, transparent)",
  },
  unused: { classes: "border-ink/25 text-ink-soft", dot: "ink-40", tint: "transparent" },
  off: { classes: "border-ink/25 text-ink-soft", dot: "ink-25", tint: "transparent" },
};

/**
 * The glow is inline, not a utility class: it is a status signal (the only
 * colour on the card), and it must not depend on a Tailwind rule that could be
 * purged or on a light-theme override the audit would then demand.
 */
const PROVIDER_VERDICT_GLOW: Partial<Record<ProviderVerdict, string>> = {
  alive:
    "inset 3px 0 0 0 #2f9e6e, 0 0 0 1px rgba(47,158,110,0.45), 0 0 18px rgba(47,158,110,0.28), inset 0 0 26px rgba(47,158,110,0.06)",
  failing:
    "inset 3px 0 0 0 #d64541, 0 0 0 1px rgba(214,69,65,0.45), 0 0 18px rgba(214,69,65,0.28), inset 0 0 26px rgba(214,69,65,0.06)",
};

function clock(iso: string | null): string {
  if (!iso) return "—";
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return "—";
  const mins = Math.round((Date.now() - at) / 60_000);
  if (mins < 1) return "এইমাত্র";
  if (mins < 60) return `${mins} মিনিট আগে`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} ঘণ্টা আগে`;
  return `${Math.round(hours / 24)} দিন আগে`;
}

function pct(part: number, whole: number): string {
  if (whole <= 0) return "—";
  return `${Math.round((part / whole) * 100)}%`;
}

/** Why a provider has the verdict it has — in the operator's language. */
function reason(row: AiProviderStatusRow, verdict: ProviderVerdict): string {
  if (verdict === "off") return "রো-টি বন্ধ — চেইনে ডাকা হবে না।";
  if (!row.hasStoredKey && !row.keyEnvVar) return "কোনো কী নেই — env ভেরিয়েবলও ঘোষণা করা নেই।";
  if (verdict === "failing") {
    const tail = row.stats.fails24h > 0 ? ` · ২৪ ঘণ্টায় ${row.stats.fails24h} ব্যর্থ` : "";
    return `${row.stats.lastErrorKind ? `${row.stats.lastErrorKind}: ` : ""}শেষ চেষ্টা ব্যর্থ${tail}`;
  }
  if (verdict === "unused") return "এখনো একটি কলও রেকর্ড হয়নি — তাই প্রমাণ নেই।";
  const latency = row.stats.p50Ms === null ? "" : ` · মধ্য ${row.stats.p50Ms}ms`;
  return `শেষ কল সফল${latency}`;
}

function HourBars({ row }: { row: AiProviderStatusRow }) {
  const buckets = row.stats.hourly;
  const max = Math.max(1, ...buckets.map((b) => b.calls));
  return (
    <div className="mt-2">
      <div className="flex h-14 items-end gap-[2px]" role="img" aria-label={`২৪ ঘণ্টার কল: ${row.stats.calls24h}, ব্যর্থ ${row.stats.fails24h}`}>
        {buckets.map((b) => {
          const height = Math.max(2, Math.round((b.calls / max) * 100));
          const failShare = b.calls > 0 ? Math.round((b.fails / b.calls) * 100) : 0;
          return (
            <div
              key={b.hour}
              /** An hour with no calls is a faint baseline, not a teal bar: a
               *  silent hour must not look like a healthy one. */
              className="relative flex-1 rounded-sm"
              style={{
                height: `${height}%`,
                minHeight: b.calls > 0 ? 3 : 2,
                background:
                  b.calls > 0 ? "color-mix(in srgb, var(--color-cat-teal) 72%, transparent)" : "rgba(26,20,13,0.10)",
              }}
              title={`${b.hour}:00 · ${b.calls} কল · ${b.fails} ব্যর্থ`}
            >
              {failShare > 0 ? (
                <span
                  className="absolute inset-x-0 bottom-0 rounded-sm bg-alizarin"
                  style={{ height: `${failShare}%` }}
                />
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between font-mono-x text-[9px] tracking-[0.12em] text-ink-soft uppercase">
        <span>24h আগে</span>
        <span>24h ব্যর্থ {row.stats.fails24h}</span>
        <span>এখন</span>
      </div>
    </div>
  );
}

function ProviderCard({
  row,
  envKeyPresent,
}: {
  row: AiProviderStatusRow;
  envKeyPresent: boolean;
}) {
  const verdict = providerVerdict(row);
  const style = VERDICT_STYLE[verdict];
  const glow = PROVIDER_VERDICT_GLOW[verdict];
  const ok = row.stats.calls24h - row.stats.fails24h;
  const successPct = row.stats.calls24h > 0 ? Math.round((ok / row.stats.calls24h) * 100) : null;
  const limit = row.rateLimitRpm;
  const remaining = limit === null ? null : Math.max(0, limit - row.callsLastMinute);

  return (
    <article
      className="rounded-lg border border-ink/20 bg-paper-deep px-3 py-2.5"
      style={glow ? { boxShadow: glow } : undefined}
      data-provider-status={verdict}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono-x text-[9.5px] tracking-[0.14em] uppercase ${style.classes}`}
          style={{ background: style.tint }}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${style.dot.startsWith("bg-") ? style.dot : ""} ${
              verdict === "alive" ? "animate-pulse" : ""
            }`}
            style={
              style.dot.startsWith("bg-")
                ? undefined
                : {
                    background: `color-mix(in srgb, var(--color-ink) ${style.dot === "ink-40" ? "40%" : "25%"}, transparent)`,
                  }
            }
            aria-hidden
          />
          {VERDICT_LABEL_BN[verdict]}
        </span>
        <span className="font-sans-bn text-[13px] font-bold text-ink">{row.name}</span>
        <span className="font-mono-x text-[9.5px] tracking-[0.14em] text-ink-soft uppercase">
          {row.key} · {row.purpose === "image" ? "ছবি" : "লেখা"} · P{row.priority}
        </span>
        {row.isFreeTier ? (
          <span className="rounded border border-ink/20 px-1 font-mono-x text-[8.5px] tracking-[0.12em] text-ink-soft uppercase">
            free
          </span>
        ) : null}
      </div>

      <p className="mt-1 break-all font-mono-x text-[10.5px] text-ink-soft">{row.model}</p>
      <p className={`mt-1 text-[11.5px] leading-relaxed ${verdict === "failing" ? "text-alizarin" : "text-ink-soft"}`}>
        {reason(row, verdict)}
      </p>

      {row.stats.calls7d > 0 ? <HourBars row={row} /> : null}

      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] sm:grid-cols-4">
        <div>
          <dt className="font-mono-x text-[8.5px] tracking-[0.12em] text-ink-soft uppercase">সফলতা</dt>
          <dd className="font-mono-x text-ink">
            {successPct === null ? "—" : `${successPct}%`}{" "}
            <span className="text-ink-soft">({ok}/{row.stats.calls24h})</span>
          </dd>
        </div>
        <div>
          <dt className="font-mono-x text-[8.5px] tracking-[0.12em] text-ink-soft uppercase">মধ্য / p95</dt>
          <dd className="font-mono-x text-ink">
            {row.stats.p50Ms === null ? "—" : `${row.stats.p50Ms} / ${row.stats.p95Ms ?? "—"} ms`}
          </dd>
        </div>
        <div>
          <dt className="font-mono-x text-[8.5px] tracking-[0.12em] text-ink-soft uppercase">rate limit</dt>
          <dd className="font-mono-x text-ink">
            {limit === null ? "ঘোষিত নয়" : `${row.callsLastMinute}/${limit} rpm`}
            {remaining !== null ? <span className="text-ink-soft"> · বাকি {remaining}</span> : null}
          </dd>
        </div>
        <div>
          <dt className="font-mono-x text-[8.5px] tracking-[0.12em] text-ink-soft uppercase">শেষ কল</dt>
          <dd className="font-mono-x text-ink">{clock(row.stats.lastCallAt ?? row.lastOkAt)}</dd>
        </div>
      </dl>

      <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 font-mono-x text-[9.5px] tracking-[0.1em] text-ink-soft uppercase">
        <span>{row.isActive ? "active" : "inactive"}</span>
        <span>
          {row.hasStoredKey
            ? "key · DB-তে সংরক্ষিত"
            : envKeyPresent
              ? `key · env ${row.keyEnvVar}`
              : `key · নেই (${row.keyEnvVar || "env নেই"})`}
        </span>
        <span>৭ দিনে {row.stats.calls7d} কল · {row.stats.fails7d} ব্যর্থ</span>
      </p>
    </article>
  );
}

function Group({
  title,
  kicker,
  rows,
  present,
}: {
  title: string;
  kicker: string;
  rows: AiProviderStatusRow[];
  present: Set<string>;
}) {
  if (rows.length === 0) {
    return (
      <div className="mt-4">
        <GroupHead title={title} kicker={kicker} count={0} />
        <p className="mt-2 rounded-lg border border-dashed border-ink/25 px-3 py-4 text-center text-[12px] text-ink-soft">
          এই কাজের জন্য কোনো রো নেই।
        </p>
      </div>
    );
  }
  return (
    <div className="mt-4">
      <GroupHead title={title} kicker={kicker} count={rows.length} />
      <div className="mt-2 grid gap-2 lg:grid-cols-2">
        {rows.map((row) => (
          <ProviderCard key={row.id} row={row} envKeyPresent={present.has(row.keyEnvVar)} />
        ))}
      </div>
    </div>
  );
}

function GroupHead({ title, kicker, count }: { title: string; kicker: string; count: number }) {
  return (
    <div className="flex items-baseline gap-2 border-b border-ink/10 pb-1">
      <h3 className="font-sans-bn text-[13px] font-bold text-ink">{title}</h3>
      <span className="font-mono-x text-[9px] tracking-[0.18em] text-ink-soft uppercase">
        {kicker} · {count}
      </span>
    </div>
  );
}

function MiniTile({ label, value, tone }: { label: string; value: number | string; tone?: "teal" | "alarm" | "ink" }) {
  const color = tone === "teal" ? "text-cat-teal" : tone === "alarm" ? "text-alizarin" : "text-ink";
  return (
    <div className="rounded-lg border border-ink/15 bg-paper px-2.5 py-1.5">
      <p className="font-mono-x text-[8.5px] tracking-[0.14em] text-ink-soft uppercase">{label}</p>
      <p className={`font-sans-bn text-[15px] font-bold ${color}`}>{value}</p>
    </div>
  );
}

export async function ProviderStatusBoard({ envKeys }: { envKeys: string[] }) {
  const present = new Set(envKeys);
  const rows = await listAiProviderStatus().catch(() => [] as AiProviderStatusRow[]);
  const verdicts = rows.map((row) => providerVerdict(row));
  const count = (v: ProviderVerdict) => verdicts.filter((x) => x === v).length;
  const textRows = rows.filter((r) => r.purpose === "text").sort((a, b) => a.priority - b.priority);
  const imageRows = rows.filter((r) => r.purpose === "image").sort((a, b) => a.priority - b.priority);
  const textAlive = textRows.filter((r) => providerVerdict(r) === "alive").length;
  const imageAlive = imageRows.filter((r) => providerVerdict(r) === "alive").length;

  return (
    <Card>
      <CardHead
        title="প্রোভাইডার অবস্থা"
        kicker="ALL PROVIDERS · LIVE FROM THE CALL LEDGER"
        note="পুরো তালিকা, পাতায় ভাগ করে নয়। সবুজ = কাজ করছে, লাল = ব্যর্থ হচ্ছে (কারণ নিচে), ধূসর = কল হয়নি বা বন্ধ। প্রতিটি সংখ্যা ai_task_runs লেজার থেকে।"
      />
      <div className="p-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <MiniTile label="মোট" value={rows.length} />
          <MiniTile label="জীবিত" value={count("alive")} tone={count("alive") > 0 ? "teal" : "ink"} />
          <MiniTile label="ব্যর্থ" value={count("failing")} tone={count("failing") > 0 ? "alarm" : "ink"} />
          <MiniTile label="কল হয়নি" value={count("unused")} />
          <MiniTile label="বন্ধ" value={count("off")} />
          <MiniTile label="লেখা · ছবি" value={`${textAlive}/${textRows.length} · ${imageAlive}/${imageRows.length}`} />
        </div>

        <Group title="লেখা (TEXT)" kicker="REWRITE / OCR / TRANSLATE" rows={textRows} present={present} />
        <Group title="ছবি (IMAGE)" kicker="PLATE + PHOTO" rows={imageRows} present={present} />

        <p className="mt-3 border-t border-ink/10 pt-2 text-[11px] leading-relaxed text-ink-soft">
          রেট লিমিট হলো রো-তে ঘোষিত rpm এবং লেজারে গত ৬০ সেকেন্ডের আসল কল। প্রোভাইডার নিজে যেখানে দিনের
          কোটা প্রকাশ করে না, সেখানে কোটা লেখা হয় না — অনুমান করা হয় না।
        </p>
      </div>
    </Card>
  );
}
