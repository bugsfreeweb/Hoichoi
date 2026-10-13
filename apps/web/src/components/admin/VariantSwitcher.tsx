"use client";

import { useMemo, useState } from "react";
import {
  ZONE_LABELS,
  SCOPE_LABELS,
  PRESETS,
  ACCENTS,
  type SectionState,
  type SectionZone,
} from "@hoichoi/shared-types";

type Status = { kind: "ok" | "err"; text: string } | null;

const ZONE_ORDER: SectionZone[] = ["header", "hero", "main", "major", "footer"];

/**
 * Admin switcher for the section variant engine. Every section offers the
 * shipped `"default"` design plus the ported mockup variants, and a whole-site
 * preset applies a coherent look across every section at once.
 */
export function VariantSwitcher({
  initialSections,
  initialSiteVariant,
  accentColor,
}: {
  initialSections: SectionState[];
  initialSiteVariant: string;
  accentColor: string;
}) {
  const [sections, setSections] = useState<SectionState[]>(initialSections);
  const [siteVariant, setSiteVariant] = useState(initialSiteVariant);
  const [accent, setAccent] = useState(accentColor);
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

  async function reloadSections() {
    const res = await fetch("/api/admin/sections", { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as
      | { ok?: boolean; sections?: SectionState[]; siteVariant?: string }
      | null;
    if (data?.ok && data.sections) setSections(data.sections);
    if (data?.siteVariant) setSiteVariant(data.siteVariant);
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
      await reloadSections();
    } catch (e) {
      setStatus({ kind: "err", text: e instanceof Error ? e.message : "সেভ করা যায়নি।" });
    } finally {
      setBusy(false);
    }
  }

  async function applyPreset(id: string) {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/sections", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ preset: id }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? "প্রিসেট প্রয়োগ করা যায়নি।");
      setDirty(new Set());
      setStatus({ kind: "ok", text: "প্রিসেট প্রয়োগ হয়েছে — পুরো সাইটে প্রযোজ্য।" });
      await reloadSections();
    } catch (e) {
      setStatus({ kind: "err", text: e instanceof Error ? e.message : "প্রিসেট প্রয়োগ করা যায়নি।" });
    } finally {
      setBusy(false);
    }
  }

  async function saveAccent(hex: string) {
    setAccent(hex);
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accent_color: hex }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? "রং সংরক্ষণ করা যায়নি।");
      setStatus({ kind: "ok", text: "অ্যাকসেন্ট রং সংরক্ষিত হয়েছে।" });
    } catch (e) {
      setStatus({ kind: "err", text: e instanceof Error ? e.message : "রং সংরক্ষণ করা যায়নি।" });
    } finally {
      setBusy(false);
    }
  }

  const siteIsPreset = PRESETS.some((p) => p.id === siteVariant);

  return (
    <div className="space-y-6">
      <div className="border border-ink/20 bg-paper-deep p-5">
        <h3 className="font-sans-bn text-[15px] font-bold text-ink">সাইট-ডিফল্ট নকশা</h3>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
          একটি প্রিসেট বাছলে পুরো সাইটে সেটিই প্রযোজ্য হয়; নিচে আলাদা সেকশনের ভ্যারিয়েন্ট বদলে
          সূক্ষ্ম নিয়ন্ত্রণও নিতে পারেন।
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select
            value={siteIsPreset ? siteVariant : "default"}
            disabled={busy}
            onChange={(e) => (e.target.value === "default" ? void saveSite("default") : void applyPreset(e.target.value))}
            className="border border-ink/20 bg-paper px-3 py-2 text-[13px] text-ink"
          >
            <option value="default">ডিফল্ট (বর্তমান নকশা)</option>
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.nameEn}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={busy}
              onClick={() => void applyPreset(p.id)}
              className={`border p-3 text-left transition-colors ${
                siteVariant === p.id ? "border-ink bg-ink text-paper" : "border-ink/20 bg-paper text-ink hover:border-ink/40"
              }`}
            >
              <span className="flex items-center gap-2 text-[13px] font-bold">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: p.accent }} />
                {p.name}
              </span>
              <span className="mt-0.5 block text-[11px] opacity-70">{p.blurb}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="border border-ink/20 bg-paper-deep p-5">
        <h3 className="font-sans-bn text-[15px] font-bold text-ink">অ্যাকসেন্ট রং</h3>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
          লোগো, বোতাম ও হাইলাইটে ব্যবহৃত রং — নতুন নকশার সব সেকশনে প্রযোজ্য।
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              type="button"
              disabled={busy}
              title={a.name}
              onClick={() => void saveAccent(a.hex)}
              className={`grid h-9 w-9 place-items-center rounded-full border-2 transition-transform hover:scale-105 ${
                accent.toLowerCase() === a.hex.toLowerCase() ? "border-ink" : "border-transparent"
              }`}
              style={{ background: a.hex }}
            >
              {accent.toLowerCase() === a.hex.toLowerCase() ? (
                <span className="text-[11px] font-bold text-white">✓</span>
              ) : null}
            </button>
          ))}
          <label className="ml-1 flex items-center gap-2 text-[12px] text-ink-soft">
            কাস্টম
            <input
              type="color"
              value={accent}
              disabled={busy}
              onChange={(e) => void saveAccent(e.target.value)}
              className="h-9 w-12 border border-ink/30 bg-paper"
            />
          </label>
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