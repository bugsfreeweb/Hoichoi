import { listProviderHealth, providerState, type ProviderHealth } from "@hoichoi/db";

/**
 * Media provider health, server-rendered.
 *
 * Every number here is measured: bytes come from uploads that actually
 * succeeded, and a quota only exists once an operator sets one. When nothing has
 * been uploaded yet the table says so instead of showing a reassuring row of
 * zeroes that looks like a healthy provider.
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

const STATE_LABEL: Record<string, { bn: string; classes: string }> = {
  ok: { bn: "সক্রিয়", classes: "border-cat-teal text-ink" },
  degraded: { bn: "ব্যর্থতা আছে", classes: "border-alizarin text-alizarin" },
  cooldown: { bn: "বিরতিতে", classes: "border-alizarin text-alizarin" },
  quota_exceeded: { bn: "কোটা শেষ", classes: "border-alizarin text-alizarin" },
  disabled: { bn: "বন্ধ", classes: "border-ink/20 text-ink-soft" },
};

function Row({ p }: { p: ProviderHealth }) {
  const state = providerState(p);
  const label = STATE_LABEL[state] ?? STATE_LABEL.ok!;
  const quota = p.quota_bytes === null ? "সীমা নির্ধারিত নয়" : bytes(p.quota_bytes);
  return (
    <div className="border border-ink/20 bg-paper-deep px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono-x text-[11px] tracking-[0.14em] text-ink">{p.provider_key}</span>
        <span className={`border px-1.5 py-0.5 font-mono-x text-[9px] tracking-[0.14em] uppercase ${label.classes}`}>
          {label.bn}
        </span>
        <span className="ml-auto font-mono-x text-[10px] text-ink-soft">
          {bytes(p.used_bytes)} / {quota} · {p.objects} ফাইল
        </span>
      </div>
      <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
        সফল {p.success_count} · ব্যর্থ {p.failure_count}
        {p.last_success_at ? ` · শেষ সফল ${p.last_success_at.slice(0, 16).replace("T", " ")}` : ""}
      </p>
      {p.last_error ? (
        <p className="mt-1 text-[11.5px] leading-relaxed text-alizarin">শেষ ত্রুটি: {p.last_error}</p>
      ) : null}
      {p.last_fallback_reason ? (
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-soft">
          বিকল্পে গিয়েছিল: {p.last_fallback_reason}
        </p>
      ) : null}
    </div>
  );
}

export async function ProviderHealthTable() {
  const providers = await listProviderHealth().catch(() => []);
  if (providers.length === 0) {
    return (
      <div className="mt-6 border border-ink/20 bg-paper-deep px-4 py-3">
        <p className="font-mono-x text-[10px] tracking-[0.24em] text-ink-soft uppercase">
          MEDIA PROVIDER HEALTH
        </p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">
          এখনও কোনো মিডিয়া আপলোড হয়নি — তাই কোনো প্রোভাইডারের স্বাস্থ্য-রেকর্ড নেই। প্রথম আপলোডের পরেই
          এখানে সফল/ব্যর্থ সংখ্যা আর কোটা দেখা যাবে।
        </p>
      </div>
    );
  }
  return (
    <section className="mt-6">
      <p className="font-mono-x text-[10px] tracking-[0.24em] text-ink-soft uppercase">
        MEDIA PROVIDER HEALTH · {providers.length}
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
        মিডিয়া আপলোড কোথায় যাচ্ছে, কোনটি ব্যর্থ হচ্ছে আর কেন পরেরটিতে গড়াচ্ছে — সবটাই আসল আপলোডের
        হিসাব থেকে। পরপর দুইবার ব্যর্থ হলে প্রোভাইডার সাময়িকভাবে ব্রেক নেয়।
      </p>
      <div className="mt-2.5 space-y-1.5">
        {providers.map((p) => (
          <Row key={p.provider_key} p={p} />
        ))}
      </div>
    </section>
  );
}
