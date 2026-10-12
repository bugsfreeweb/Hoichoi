"use client";

import { useMemo, useState } from "react";
import {
  ZONE_LABELS,
  SCOPE_LABELS,
  type SectionState,
  type SectionZone,
} from "@hoichoi/shared-types";

type Status = { kind: "ok" | "err"; text: string } | null;

const ZONE_ORDER: SectionZone[] = ["header", "hero", "main", "major", "footer"];

/**
 * Admin switcher for the section variant engine. Every section currently offers
 * only the shipped `"default"` variant; the selects exist so the optional mockup
 * variants can be enabled later without a UI rewrite. Choosing anything other
 * than the default would change the rendered site, so mockup-only ids are shown
 * disabled until they are ported.
 */
export function VariantSwitcher({
  initialSections,
  initialSiteVariant,
}: {
  initialSections: SectionState[];
  initialSiteVariant: string;
}) {
  const [sections, setSections] = useState<SectionState[]>(initialSections);
  const [siteVariant, setSiteVariant] = useState(initialSiteVariant);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const grouped = useMemo(() => {
    return ZONE_ORDER.map((zone) => ({
      zone,
      items: sections.filter((s) => s.meta.zone === zone),
    })).filter((g) => g.items.length > 0);
  }, [sections]);

  const patch = (key: string, fields: Partial<SectionState>) => {
    setSections((prev) => prev.map((s) => (s.key === key ? { ...s, ...fields } : s)));
    setDirty((prev) => new Set(prev).add(key));
  };

  async function save() {
    setBusy(true);
    setStatus(null);
    try {
      const targets = sections.filter((s) => dirty.has(s.key));
      for (const s of targets) {
        const res = await fetch("/api/admin/sections", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ key: s.key, variant: s.variant, enabled: s.enabled, sort_order: s.sort_order }),
        });
        const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
        if (!res.ok || !data?.ok) throw new Error(data?.error ?? "সেভ করা যায়নি।");
      }
      setDirty(new Set());
      setStatus({ kind: "ok", text: "সেকশন সেটিংস সংরক্ষিত হয়েছে।" });
    } catch (e) {
      setStatus({ kind: "err", text: e instanceof Error ? e.message : "সেভ করা যায়নি।" });
    } finally {
      setBusy(false);
    }
  }

  async function saveSite(variant: string) {
    setSiteVariant(variant);
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/sections", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ siteVariant: variant }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? "সেভ করা যায়নি।");
      setStatus({ kind: "ok", text: "ডিফল্ট ভ্যারিয়েন্ট সংরক্ষিত হয়েছে।" });
    } catch (e) {
      setStatus({ kind: "err", text: e instanceof Error ? e.message : "সেভ করা যায়নি।" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="border border-ink/20 bg-paper-deep p-5">
        <h3 className="font-sans-bn text-[15px] font-bold text-ink">সাইট-ডিফল্ট ভ্যারিয়েন্ট</h3>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
          সব সেকশনের জন্য প্রযোজ্য ডিফল্ট নকশা। এই সংস্করণে শুধু “ডিফল্ট (বর্তমান নকশা)” উপলব্ধ।
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select
            value={siteVariant}
            disabled={busy}
            onChange={(e) => void saveSite(e.target.value)}
            className="border border-ink/20 bg-paper px-3 py-2 text-[13px] text-ink"
          >
            <option value="default">ডিফল্ট (বর্তমান নকশা)</option>
          </select>
        </div>
      </div>

      {grouped.map(({ zone, items }) => (
        <section key={zone} className="border border-ink/20 bg-paper-deep p-5">
          <header className="flex items-baseline justify-between">
            <h3 className="font-sans-bn text-[15px] font-bold text-ink">{ZONE_LABELS[zone].bn}</h3>
            <span className="font-mono-x text-[10px] tracking-[0.2em] text-ink-soft uppercase">
              {ZONE_LABELS[zone].en} · {items.length}
            </span>
          </header>
          <ul className="mt-3 divide-y divide-ink/10">
            {items.map((s) => (
              <li key={s.key} className="flex flex-wrap items-start gap-3 py-3">
                <div className="min-w-[180px] flex-1">
                  <p className="text-[13px] font-bold text-ink">{s.meta.label}</p>
                  <p className="mt-0.5 text-[11px] text-ink-soft">{s.meta.description}</p>
                  <p className="mt-1 font-mono-x text-[10px] tracking-[0.16em] text-ink-soft uppercase">
                    {SCOPE_LABELS[s.meta.scope].bn} · {s.key}
                  </p>
                </div>
                <select
                  value={s.variant}
                  disabled={busy}
                  onChange={(e) => patch(s.key, { variant: e.target.value })}
                  className="border border-ink/20 bg-paper px-3 py-2 text-[13px] text-ink"
                >
                  {s.meta.variants.map((v) => (
                    <option key={v.id} value={v.id} disabled={!v.available}>
                      {v.label}
                      {v.available ? "" : " — শীঘ্রই"}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-[12px] text-ink-soft">
                  <input
                    type="checkbox"
                    checked={s.enabled}
                    disabled={busy}
                    onChange={(e) => patch(s.key, { enabled: e.target.checked })}
                    className="size-4 accent-[color:var(--color-alizarin)]"
                  />
                  সক্রিয়
                </label>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || dirty.size === 0}
          onClick={() => void save()}
          className="border border-ink bg-ink px-4 py-2 text-[13px] font-bold text-paper disabled:opacity-40"
        >
          {busy ? "সংরক্ষণ হচ্ছে…" : `সংরক্ষণ (${dirty.size})`}
        </button>
        {status ? (
          <span className={status.kind === "ok" ? "text-[12px] text-ink-soft" : "text-[12px] text-alizarin"}>
            {status.text}
          </span>
        ) : null}
      </div>
    </div>
  );
}
