"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ZONE_LABELS,
  SCOPE_LABELS,
  PRESETS,
  ACCENTS,
  DEFAULT_VARIANT,
  type SectionState,
  type SectionZone,
} from "@hoichoi/shared-types";
import { useBi } from "@/components/i18n/LocaleProvider";

type Status = { kind: "ok" | "err"; text: string } | null;

const ZONE_ORDER: SectionZone[] = ["header", "hero", "main", "major", "footer"];

/**
 * Admin studio for the section variant engine.
 *
 * Every changeable design control lives here — the whole-site preset, the
 * accent colour, and each section's variant **and** show/hide toggle. Opening
 * the studio renders the real public site inside an iframe with the current
 * draft applied in memory (short-lived cookie, never persisted), so an admin
 * can see exactly how the whole page will look — including which sections are
 * hidden — and keep tweaking in real time before applying anything.
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
  const b = useBi();
  const [sections, setSections] = useState<SectionState[]>(initialSections);
  const [siteVariant, setSiteVariant] = useState(initialSiteVariant);
  const [accent, setAccent] = useState(accentColor);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [siteDirty, setSiteDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [studio, setStudio] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [frameReady, setFrameReady] = useState(false);
  const router = useRouter();

  const grouped = useMemo(() => {
    return ZONE_ORDER.map((zone) => ({
      zone,
      items: sections.filter((s) => s.meta.zone === zone),
    })).filter((g) => g.items.length > 0);
  }, [sections]);

  // The preview cookie is cleared whenever the studio closes or the component
  // unmounts, so a forgotten preview can never linger on the public site.
  useEffect(() => {
    return () => {
      void fetch("/api/admin/preview", { method: "DELETE" }).catch(() => {});
    };
  }, []);

  // While the studio is open, push the whole draft (debounced) and reload the
  // preview iframe, so preset, accent, per-section variant and show/hide changes
  // are all reflected in real time.
  useEffect(() => {
    if (!studio) return;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch("/api/admin/preview", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              siteVariant,
              sections: sections.map((s) => ({ key: s.key, variant: s.variant, enabled: s.enabled })),
            }),
          });
          const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
          if (!res.ok || !data?.ok) throw new Error(data?.error ?? b("প্রিভিউ লোড করা যায়নি।", "The preview could not be loaded."));
          setNonce((n) => n + 1);
        } catch (e) {
          setStatus({
            kind: "err",
            text: e instanceof Error ? e.message : b("প্রিভিউ লোড করা যায়নি।", "The preview could not be loaded."),
          });
        }
      })();
    }, 250);
    return () => clearTimeout(timer);
  }, [studio, siteVariant, sections]);

  useEffect(() => {
    setFrameReady(false);
  }, [nonce]);

  const patch = (key: string, fields: Partial<SectionState>) => {
    setSections((prev) => prev.map((s) => (s.key === key ? { ...s, ...fields } : s)));
    setDirty((prev) => new Set(prev).add(key));
  };

  const changeCount = dirty.size + (siteDirty ? 1 : 0);

  async function reloadSections() {
    const res = await fetch("/api/admin/sections", { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as
      | { ok?: boolean; sections?: SectionState[]; siteVariant?: string }
      | null;
    if (data?.ok && data.sections) setSections(data.sections);
    if (data?.siteVariant) setSiteVariant(data.siteVariant);
  }

  /** Updates the local draft to a whole-site preset without persisting it. */
  function selectSitePreset(id: string) {
    setSiteVariant(id);
    setSiteDirty(true);
    if (id === DEFAULT_VARIANT) {
      setSections((prev) => prev.map((s) => ({ ...s, variant: s.meta.defaultVariant })));
      return;
    }
    const preset = PRESETS.find((p) => p.id === id);
    if (preset) {
      setSections((prev) => prev.map((s) => ({ ...s, variant: preset.values[s.key] ?? s.variant })));
    }
  }

  function openStudio(id?: string) {
    if (id) selectSitePreset(id);
    setStatus(null);
    setFrameReady(false);
    setStudio(true);
  }

  async function closeStudio() {
    setStudio(false);
    await fetch("/api/admin/preview", { method: "DELETE" }).catch(() => {});
    // Revert any un-applied local edits back to the saved design.
    await reloadSections();
    setDirty(new Set());
    setSiteDirty(false);
  }

  /** Leave the studio and return to the admin dashboard. */
  async function backToAdmin() {
    await closeStudio();
    router.push("/admin");
  }

  /** Persists the current draft (site preset first, then per-section edits). */
  async function persistDraft(): Promise<boolean> {
    setBusy(true);
    setStatus(null);
    try {
      if (siteDirty) {
        const res = await fetch("/api/admin/sections", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ siteVariant }),
        });
        const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
        if (!res.ok || !data?.ok) throw new Error(data?.error ?? b("সেভ করা যায়নি।", "Could not save."));
      }
      const targets = sections.filter((s) => dirty.has(s.key));
      for (const s of targets) {
        const res = await fetch("/api/admin/sections", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ key: s.key, variant: s.variant, enabled: s.enabled, sort_order: s.sort_order }),
        });
        const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
        if (!res.ok || !data?.ok) throw new Error(data?.error ?? b("সেভ করা যায়নি।", "Could not save."));
      }
      setDirty(new Set());
      setSiteDirty(false);
      setStatus({
        kind: "ok",
        text: b("নকশা সংরক্ষিত হয়েছে — পুরো সাইটে প্রযোজ্য।", "Layout saved — it applies to the whole site."),
      });
      await reloadSections();
      return true;
    } catch (e) {
      setStatus({ kind: "err", text: e instanceof Error ? e.message : b("সেভ করা যায়নি।", "Could not save.") });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function applyStudio() {
    if (await persistDraft()) await closeStudio();
  }

  /** Persists one whole-site look immediately (used by the reset shortcut). */
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
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? b("সেভ করা যায়নি।", "Could not save."));
      setSiteVariant(variant);
      setDirty(new Set());
      setSiteDirty(false);
      setStatus({
        kind: "ok",
        text:
          variant === DEFAULT_VARIANT
            ? b("ডিফল্ট নকশা ফিরিয়ে আনা হয়েছে — পুরো সাইটে প্রযোজ্য।", "Back to the default layout — it applies to the whole site.")
            : b("নকশা প্রয়োগ হয়েছে — পুরো সাইটে প্রযোজ্য।", "Layout applied — it applies to the whole site."),
      });
      await reloadSections();
    } catch (e) {
      setStatus({ kind: "err", text: e instanceof Error ? e.message : b("সেভ করা যায়নি।", "Could not save.") });
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
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? b("রং সংরক্ষণ করা যায়নি।", "Could not save the colour."));
      setStatus({ kind: "ok", text: b("অ্যাকসেন্ট রং সংরক্ষিত হয়েছে।", "Accent colour saved.") });
      // The accent is read server-side, so reload the preview to show it.
      if (studio) setNonce((n) => n + 1);
    } catch (e) {
      setStatus({ kind: "err", text: e instanceof Error ? e.message : b("রং সংরক্ষণ করা যায়নি।", "Could not save the colour.") });
    } finally {
      setBusy(false);
    }
  }

  const siteIsPreset = PRESETS.some((p) => p.id === siteVariant);
  const activeLook = siteIsPreset ? siteVariant : DEFAULT_VARIANT;

  const controls = (
    <>
      <div className="border border-ink/20 bg-paper-deep p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-sans-bn text-[15px] font-bold text-ink">
            {b("সাইট-ডিফল্ট নকশা", "Site-default layout")}
          </h3>
          <span className="font-mono-x text-[10px] tracking-[0.18em] text-ink-soft uppercase">
            {b("বর্তমান", "Current")}: {activeLook}
          </span>
        </div>
        <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-ink-soft">
          {b("যেকোনো নকশা ", "Open any layout ")}
          <span className="font-bold text-ink">{b("লাইভ স্টুডিওতে", "in the live studio")}</span>
          {b(
            " খুলে পুরো সাইটে কেমন দেখাবে তা সাথে সাথে দেখুন — সেকশনের ভ্যারিয়েন্ট বদলান কিংবা কোনো সেকশন দেখান/লুকান; সব পরিবর্তন রিয়েল-টাইমে প্রতিফলিত হবে। ",
            " to see the whole site with it at once — switch a section's variant, show or hide a section, and every change lands in real time. ",
          )}
          <span className="font-bold text-ink">{b("ডিফল্ট (বর্তমান নকশা)", "Default (current layout)")}</span>
          {b(
            " সবসময় অন্য যেকোনো নকশা থেকে ফিরে আসার নিরাপদ পথ।",
            " is always the safe way back from any other layout.",
          )}
        </p>

        <button
          type="button"
          disabled={busy}
          onClick={() => openStudio()}
          className="mt-4 flex items-center gap-2 border-2 border-ink bg-ink px-4 py-2.5 text-[13px] font-bold text-on-accent transition hover:bg-alizarin disabled:opacity-40"
        >
          {b("▶ লাইভ ডিজাইন স্টুডিও খুলুন", "▶ Open the live design studio")}
          {changeCount > 0 ? (
            <span className="text-[11px] text-paper">
              {b(`· ${changeCount} অসংরক্ষিত`, `· ${changeCount} unsaved`)}
            </span>
          ) : null}
        </button>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => openStudio(DEFAULT_VARIANT)}
            className={`flex flex-col border p-3 text-left transition-colors ${
              activeLook === DEFAULT_VARIANT
                ? "border-ink bg-paper shadow-[inset_0_0_0_1px_var(--color-ink)]"
                : "border-ink/20 bg-paper hover:border-ink/40"
            }`}
          >
            <span className="flex items-center gap-2 text-[13px] font-bold text-ink">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-ink" />
              {b("ডিফল্ট (বর্তমান নকশা)", "Default (current layout)")}
              {activeLook === DEFAULT_VARIANT ? (
                <span className="text-[10px] text-lime">{b("● সক্রিয়", "● active")}</span>
              ) : null}
            </span>
            <span className="mt-0.5 block text-[11px] text-ink-soft">
              {b(
                "শিপ করা প্রোডাকশন নকশা — সব ডেটা আসল, লাইট/ডার্ক দুটোতেই সঠিক।",
                "The shipped production layout — real data throughout, correct in light and dark.",
              )}
            </span>
            <span className="mt-2 font-mono-x text-[10px] tracking-[0.16em] text-ink-soft uppercase">
              {b("স্টুডিওতে দেখুন →", "Preview in the studio →")}
            </span>
          </button>

          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={busy}
              onClick={() => openStudio(p.id)}
              className={`flex flex-col border p-3 text-left transition-colors ${
                siteVariant === p.id
                  ? "border-ink bg-paper shadow-[inset_0_0_0_1px_var(--color-ink)]"
                  : "border-ink/20 bg-paper hover:border-ink/40"
              }`}
            >
              <span className="flex items-center gap-2 text-[13px] font-bold text-ink">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: p.accent }} />
                {p.name}
                {siteVariant === p.id ? (
                  <span className="text-[10px] text-lime">{b("● সক্রিয়", "● active")}</span>
                ) : null}
              </span>
              <span className="mt-0.5 block text-[11px] text-ink-soft">{p.blurb}</span>
              <span className="mt-2 font-mono-x text-[10px] tracking-[0.16em] text-ink-soft uppercase">
                {b("স্টুডিওতে দেখুন →", "Preview in the studio →")}
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
            {b("⟲ ডিফল্ট নকশায় ফিরুন", "⟲ Back to the default layout")}
          </button>
        </div>
      </div>

      <div className="border border-ink/20 bg-paper-deep p-5">
        <h3 className="font-sans-bn text-[15px] font-bold text-ink">{b("অ্যাকসেন্ট রং", "Accent colour")}</h3>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
          {b(
            "লোগো, বোতাম ও হাইলাইটে ব্যবহৃত রং — নতুন নকশার সব সেকশনে প্রযোজ্য ও সাথে সাথে সংরক্ষিত হয়।",
            "The colour used by the logo, buttons and highlights — applied to every section of the new layout and saved at once.",
          )}
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
            {b("কাস্টম", "Custom")}
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
            {/* One name, in the reader's language: the pair already holds both,
                so printing `bn` big and `en` small said it twice. */}
            <h3 className="font-sans-bn text-[15px] font-bold text-ink">
              {b(ZONE_LABELS[zone].bn, ZONE_LABELS[zone].en)}
            </h3>
            <span className="font-mono-x text-[10px] tracking-[0.2em] text-ink-soft uppercase">
              {items.length}
            </span>
          </header>
          <ul className="mt-3 divide-y divide-ink/10">
            {items.map((s) => (
              <li key={s.key} className="flex flex-wrap items-start gap-3 py-3">
                <div className="min-w-[180px] flex-1">
                  <p className="text-[13px] font-bold text-ink">{b(s.meta.label, s.meta.labelEn)}</p>
                  <p className="mt-0.5 text-[11px] text-ink-soft">
                    {b(s.meta.description, s.meta.descriptionEn ?? s.meta.labelEn)}
                  </p>
                  <p className="mt-1 font-mono-x text-[10px] tracking-[0.16em] text-ink-soft uppercase">
                    {b(SCOPE_LABELS[s.meta.scope].bn, SCOPE_LABELS[s.meta.scope].en)} · {s.key}
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
                      {/* The variant id is English by construction (`breaking`,
                          `pulse`), so an English reader gets a name rather than a
                          Bangla label they cannot read. */}
                      {b(v.label, v.id)}
                      {v.available ? "" : b(" — শীঘ্রই", " — coming soon")}
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
                  {b("দেখান", "Show")}
                </label>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || changeCount === 0}
          onClick={() => void persistDraft()}
          className="border border-ink bg-ink px-4 py-2 text-[13px] font-bold text-paper disabled:opacity-40"
        >
          {busy ? b("সংরক্ষণ হচ্ছে…", "Saving…") : b(`সংরক্ষণ (${changeCount})`, `Save (${changeCount})`)}
        </button>
        {status ? (
          <span className={status.kind === "ok" ? "text-[12px] text-ink-soft" : "text-[12px] text-alizarin"}>
            {status.text}
          </span>
        ) : null}
      </div>
    </>
  );

  if (studio) {
    return (
      <div className="fixed inset-0 z-[80] flex flex-col bg-ink/95 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/12 bg-ink px-4 py-2.5 text-paper">
          <span className="text-[13px] font-bold">{b("লাইভ ডিজাইন স্টুডিও", "Live design studio")}</span>
          <span className="font-mono-x text-[10px] tracking-[0.18em] text-white/50 uppercase">
            {siteVariant}
            {changeCount > 0 ? b(` · ${changeCount} পরিবর্তন`, ` · ${changeCount} changes`) : ""}
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {status ? (
              <span className={status.kind === "ok" ? "text-[11.5px] text-white/60" : "text-[11.5px] text-alizarin"}>
                {status.text}
              </span>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => void backToAdmin()}
              className="border border-white/25 px-3 py-1.5 text-[12px] font-bold text-white/80 transition hover:border-white/50 hover:text-white disabled:opacity-40"
            >
              {b("← অ্যাডমিনে ফিরুন", "← Back to admin")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setNonce((n) => n + 1)}
              className="border border-white/25 px-3 py-1.5 text-[12px] font-bold text-white/80 transition hover:border-white/50 hover:text-white disabled:opacity-40"
            >
              {b("↻ রিফ্রেশ", "↻ Refresh")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void applyStudio()}
              className="border border-lime/60 bg-lime/15 px-3 py-1.5 text-[12px] font-bold text-lime transition hover:bg-lime/25 disabled:opacity-40"
            >
              {b("এই নকশা প্রয়োগ করুন", "Apply this layout")}
            </button>
            <button
              type="button"
              onClick={() => void closeStudio()}
              className="border border-white/25 px-3 py-1.5 text-[12px] font-bold text-white/80 transition hover:border-white/50 hover:text-white"
            >
              {b("বন্ধ করুন", "Close")}
            </button>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          <aside className="h-1/2 w-full shrink-0 overflow-y-auto border-b border-white/12 bg-paper p-4 sm:h-auto sm:max-w-[440px] sm:border-b-0 sm:border-r sm:p-5">
            <div className="space-y-6">{controls}</div>
          </aside>
          <div className="relative min-h-0 flex-1 bg-white">
            {nonce > 0 ? (
              <iframe
                key={nonce}
                src={`/?_pv=${nonce}`}
                title={b("লাইভ ডিজাইন প্রিভিউ", "Live design preview")}
                onLoad={() => setFrameReady(true)}
                className="h-full w-full border-0"
              />
            ) : null}
            {nonce === 0 || !frameReady ? (
              <div className="absolute inset-0 grid place-items-center bg-paper text-[13px] text-ink-soft">
                {b("লাইভ প্রিভিউ লোড হচ্ছে…", "Loading the live preview…")}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return <div className={fullWidth ? "space-y-6" : "space-y-6 max-w-3xl"}>{controls}</div>;
}
