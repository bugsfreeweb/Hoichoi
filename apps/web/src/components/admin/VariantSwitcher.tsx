"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ZONE_LABELS,
  SCOPE_LABELS,
  PRESETS,
  ACCENTS,
  DEFAULT_VARIANT,
  type SectionState,
  type SectionZone,
} from "@hoichoi/shared-types";

type Status = { kind: "ok" | "err"; text: string } | null;

const ZONE_ORDER: SectionZone[] = ["header", "hero", "main", "major", "footer"];

/** Renders the live public site inside a modal with the chosen look applied in
 *  memory (cookie overlay), so an admin can inspect a design before committing. */
function PreviewModal({
  variant,
  label,
  onClose,
  onApply,
  busy,
}: {
  variant: string;
  label: string;
  onClose: () => void;
  onApply: () => void;
  busy: boolean;
}) {
  const [ready, setReady] = useState(false);
  const src = useMemo(() => `/?_pv=${Date.now()}`, []);
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink/80 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/12 bg-ink px-4 py-2.5 text-paper">
        <span className="text-[13px] font-bold">প্রিভিউ — {label}</span>
        <span className="font-mono-x text-[10px] tracking-[0.18em] text-white/50 uppercase">{variant}</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void onApply()}
            className="border border-lime/60 bg-lime/15 px-3 py-1.5 text-[12px] font-bold text-lime transition hover:bg-lime/25 disabled:opacity-40"
          >
            এই নকশা প্রয়োগ করুন
          </button>
          <button
            type="button"
            onClick={onClose}
            className="border border-white/25 px-3 py-1.5 text-[12px] font-bold text-white/80 transition hover:border-white/50 hover:text-white"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
      <div className="relative min-h-0 flex-1 bg-white">
        {!ready ? (
          <div className="absolute inset-0 grid place-items-center bg-paper text-[13px] text-ink-soft">
            লাইভ প্রিভিউ লোড হচ্ছে…
          </div>
        ) : null}
        <iframe
          key={src}
          src={src}
          title="সাইট প্রিভিউ"
          onLoad={() => setReady(true)}
          className="h-full w-full border-0"
        />
      </div>
    </div>
  );
}

/**
 * Admin switcher for the section variant engine. Every section offers the
 * shipped `"default"` design plus the ported mockup variants, and a whole-site
 * preset applies a coherent look across every section at once. Each whole-site
 * look can be previewed live before it is applied, and `"default"` always
 * restores the shipped production design for the entire site.
 */
export function VariantSwitcher({
  initialSections,
  initialSiteVariant,
  accentColor,
  fullWidth = false,
}: {
  initialSections: SectionState[];
  initialSiteVariant: string;
  accentColor: string;
  fullWidth?: boolean;
}) {
  const [sections, setSections] = useState<SectionState[]>(initialSections);
  const [siteVariant, setSiteVariant] = useState(initialSiteVariant);
  const [accent, setAccent] = useState(accentColor);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [preview, setPreview] = useState<{ variant: string; label: string } | null>(null);

  const grouped = useMemo(() => {
    return ZONE_ORDER.map((zone) => ({
      zone,
      items: sections.filter((s) => s.meta.zone === zone),
    })).filter((g) => g.items.length > 0);
  }, [sections]);

  // The preview cookie is cleared whenever the modal closes or the component
  // unmounts, so a forgotten preview can never linger on the public site.
  useEffect(() => {
    return () => {
      void fetch("/api/admin/preview", { method: "DELETE" }).catch(() => {});
    };
  }, []);

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

  async function applySiteVariant(variant: string) {
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
      setSiteVariant(variant);
      setDirty(new Set());
      setStatus({
        kind: "ok",
        text:
          variant === DEFAULT_VARIANT
            ? "ডিফল্ট নকশা ফিরিয়ে আনা হয়েছে — পুরো সাইটে প্রযোজ্য।"
            : "নকশা প্রয়োগ হয়েছে — পুরো সাইটে প্রযোজ্য।",
      });
      await reloadSections();
      setPreview(null);
    } catch (e) {
      setStatus({ kind: "err", text: e instanceof Error ? e.message : "সেভ করা যায়নি।" });
    } finally {
      setBusy(false);
    }
  }

  async function openPreview(variant: string, label: string) {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ variant }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? "প্রিভিউ শুরু করা যায়নি।");
      setPreview({ variant, label });
    } catch (e) {
      setStatus({ kind: "err", text: e instanceof Error ? e.message : "প্রিভিউ শুরু করা যায়নি।" });
    } finally {
      setBusy(false);
    }
  }

  async function closePreview() {
    setPreview(null);
    await fetch("/api/admin/preview", { method: "DELETE" }).catch(() => {});
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
  const activeLook = siteIsPreset ? siteVariant : DEFAULT_VARIANT;

  return (
    <div className={fullWidth ? "space-y-6" : "space-y-6 max-w-3xl"}>
      {preview ? (
        <PreviewModal
          variant={preview.variant}
          label={preview.label}
          busy={busy}
          onClose={() => void closePreview()}
          onApply={() => void applySiteVariant(preview.variant)}
        />
      ) : null}

      <div className="border border-ink/20 bg-paper-deep p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-sans-bn text-[15px] font-bold text-ink">সাইট-ডিফল্ট নকশা</h3>
          <span className="font-mono-x text-[10px] tracking-[0.18em] text-ink-soft uppercase">
            বর্তমান: {activeLook}
          </span>
        </div>
        <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-ink-soft">
          যেকোনো নকশা <span className="font-bold text-ink">প্রিভিউ</span> করে দেখুন — প্রয়োগ করার আগেই পুরো সাইটে কেমন
          দেখাবে তা লাইভ দেখা যায়। <span className="font-bold text-ink">ডিফল্ট (বর্তমান নকশা)</span> সবসময় অন্য
          যেকোনো নকশা থেকে ফিরে আসার নিরাপদ পথ, এবং সব সেকশন একসাথে আগের অবস্থায় রিসেট করে।
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void openPreview(DEFAULT_VARIANT, "ডিফল্ট (বর্তমান নকশা)")}
            className={`flex flex-col border p-3 text-left transition-colors ${
              activeLook === DEFAULT_VARIANT
                ? "border-ink bg-paper shadow-[inset_0_0_0_1px_var(--color-ink)]"
                : "border-ink/20 bg-paper hover:border-ink/40"
            }`}
          >
            <span className="flex items-center gap-2 text-[13px] font-bold text-ink">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-ink" />
              ডিফল্ট (বর্তমান নকশা)
              {activeLook === DEFAULT_VARIANT ? <span className="text-[10px] text-lime">● সক্রিয়</span> : null}
            </span>
            <span className="mt-0.5 block text-[11px] text-ink-soft">
              শিপ করা প্রোডাকশন নকশা — সব ডেটা আসল, লাইট/ডার্ক দুটোতেই সঠিক।
            </span>
            <span className="mt-2 font-mono-x text-[10px] tracking-[0.16em] text-ink-soft uppercase">
              প্রিভিউ দেখুন →
            </span>
          </button>

          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={busy}
              onClick={() => void openPreview(p.id, `${p.name} · ${p.nameEn}`)}
              className={`flex flex-col border p-3 text-left transition-colors ${
                siteVariant === p.id
                  ? "border-ink bg-paper shadow-[inset_0_0_0_1px_var(--color-ink)]"
                  : "border-ink/20 bg-paper hover:border-ink/40"
              }`}
            >
              <span className="flex items-center gap-2 text-[13px] font-bold text-ink">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: p.accent }} />
                {p.name}
                {siteVariant === p.id ? <span className="text-[10px] text-lime">● সক্রিয়</span> : null}
              </span>
              <span className="mt-0.5 block text-[11px] text-ink-soft">{p.blurb}</span>
              <span className="mt-2 font-mono-x text-[10px] tracking-[0.16em] text-ink-soft uppercase">
                প্রিভিউ দেখুন →
              </span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void applySiteVariant(DEFAULT_VARIANT)}
            className="border-2 border-ink px-4 py-2 text-[13px] font-bold text-ink transition hover:bg-ink hover:text-paper disabled:opacity-40"
          >
            ⟲ ডিফল্ট নকশায় ফিরুন
          </button>
          {activeLook !== DEFAULT_VARIANT ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void applySiteVariant(activeLook)}
              className="border border-ink/30 px-4 py-2 text-[13px] font-bold text-ink-soft transition hover:border-ink hover:text-ink disabled:opacity-40"
            >
              বর্তমান নকশা পুনঃপ্রয়োগ
            </button>
          ) : null}
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
