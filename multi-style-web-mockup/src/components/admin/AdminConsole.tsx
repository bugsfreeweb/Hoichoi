"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Database,
  Eye,
  EyeOff,
  Layers,
  LayoutDashboard,
  Megaphone,
  Monitor,
  RefreshCw,
  RotateCcw,
  Smartphone,
  Sparkles,
  Tablet,
  X,
  Zap,
} from "lucide-react";
import {
  ACCENTS,
  PRESETS,
  SECTIONS,
  SCOPE_LABELS,
  ZONE_LABELS,
  type Scope,
  type SectionMeta,
  type Thumb,
  type Zone,
} from "@/lib/registry";
import TactileToggle from "@/components/ui/TactileToggle";
import ThemeToggle from "@/components/ui/ThemeToggle";
import AdConfigEditor from "@/components/admin/AdConfigEditor";
import { LOGO_ENGINES, normalizeLogoEngine } from "@/lib/logo";
import { playClick } from "@/lib/sound";
import { bn } from "@/lib/format";

export interface AdminSection {
  key: string;
  scope: string;
  zone: string;
  label: string;
  labelEn: string;
  description: string;
  variant: string;
  visible: boolean;
  position: number;
  config: Record<string, unknown>;
}

export interface AdminBrand {
  accent: string;
  motion: boolean;
  density: "compact" | "comfortable" | "spacious";
  siteName: string;
  siteNameEn: string;
}

const ZONE_ORDER: Zone[] = ["header", "hero", "main", "major", "footer"];

/* ══════════════════ variant thumbnail diagrams ══════════════════ */
function ThumbArt({ kind }: { kind: Thumb }) {
  const A = "var(--accent)";
  const B = "#f5a524";
  const M = "rgba(255,255,255,0.22)";
  const common = { className: "h-full w-full" };
  switch (kind) {
    case "dock":
      return (
        <svg viewBox="0 0 64 40" {...common}>
          <rect x="6" y="12" width="52" height="16" rx="8" fill="rgba(255,255,255,0.06)" stroke={M} />
          <circle cx="14" cy="20" r="3.4" fill={A} />
          <rect x="22" y="18.6" width="5" height="2.6" rx="1.3" fill={M} />
          <rect x="30" y="18.6" width="5" height="2.6" rx="1.3" fill={M} />
          <rect x="38" y="18.6" width="5" height="2.6" rx="1.3" fill={M} />
          <rect x="47" y="17" width="8" height="6" rx="3" fill={B} />
        </svg>
      );
    case "split":
      return (
        <svg viewBox="0 0 64 40" {...common}>
          <rect x="5" y="7" width="25" height="26" rx="3" fill="rgba(255,255,255,0.06)" stroke={M} />
          <rect x="34" y="7" width="25" height="12" rx="3" fill={A} opacity="0.85" />
          <rect x="34" y="22" width="25" height="11" rx="3" fill="rgba(255,255,255,0.06)" stroke={M} />
          <rect x="9" y="12" width="16" height="2.4" rx="1.2" fill={M} />
          <rect x="9" y="17" width="12" height="2.4" rx="1.2" fill={M} />
        </svg>
      );
    case "grid":
      return (
        <svg viewBox="0 0 64 40" {...common}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect
              key={i}
              x={5 + (i % 3) * 19}
              y={7 + Math.floor(i / 3) * 14}
              width="16"
              height="11"
              rx="2.5"
              fill={i === 0 ? A : "rgba(255,255,255,0.06)"}
              opacity={i === 0 ? 0.9 : 1}
              stroke={i === 0 ? "none" : M}
            />
          ))}
        </svg>
      );
    case "stack":
      return (
        <svg viewBox="0 0 64 40" {...common}>
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <rect x="6" y={7 + i * 8} width={48 - i * 6} height="5" rx="2.5" fill="rgba(255,255,255,0.06)" stroke={M} />
              <circle cx="9" cy={9.5 + i * 8} r="1.6" fill={i === 0 ? A : B} />
            </g>
          ))}
        </svg>
      );
    case "bars":
      return (
        <svg viewBox="0 0 64 40" {...common}>
          {[16, 26, 10, 22, 30].map((h, i) => (
            <rect key={i} x={7 + i * 10} y={34 - h} width="6" height={h} rx="2" fill={i === 4 ? A : B} opacity={0.35 + i * 0.16} />
          ))}
          <line x1="5" y1="35" x2="59" y2="35" stroke={M} />
        </svg>
      );
    case "wave":
      return (
        <svg viewBox="0 0 64 40" {...common}>
          <path d="M5,30 C14,26 18,12 27,14 C36,16 40,26 49,20 C54,17 56,12 59,10 L59,35 L5,35 Z" fill={A} opacity="0.35" />
          <path d="M5,30 C14,26 18,12 27,14 C36,16 40,26 49,20 C54,17 56,12 59,10" fill="none" stroke={A} strokeWidth="1.8" />
          <path d="M5,34 C14,32 20,24 28,25 C36,26 42,31 50,28 C55,26 57,23 59,21" fill="none" stroke={B} strokeWidth="1.4" opacity="0.8" />
        </svg>
      );
    case "cards":
      return (
        <svg viewBox="0 0 64 40" {...common}>
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={5 + i * 19} y="9" width="16" height="22" rx="3" fill="rgba(255,255,255,0.06)" stroke={M} />
              <rect x={8 + i * 19} y="12.5" width="10" height="2.4" rx="1.2" fill={i === 1 ? A : M} />
              <rect x={8 + i * 19} y="17" width="7" height="2" rx="1" fill={M} opacity="0.7" />
              <rect x={8 + i * 19} y="24" width="10" height="2" rx="1" fill={M} opacity="0.5" />
            </g>
          ))}
        </svg>
      );
    case "table":
      return (
        <svg viewBox="0 0 64 40" {...common}>
          <rect x="5" y="7" width="54" height="26" rx="3" fill="rgba(255,255,255,0.05)" stroke={M} />
          {[0, 1, 2].map((i) => (
            <line key={i} x1="5" y1={14 + i * 7} x2="59" y2={14 + i * 7} stroke={M} />
          ))}
          <line x1="24" y1="7" x2="24" y2="33" stroke={M} />
          <line x1="44" y1="7" x2="44" y2="33" stroke={M} />
          <rect x="8" y="9.5" width="10" height="2.4" rx="1.2" fill={A} />
        </svg>
      );
    case "rail":
      return (
        <svg viewBox="0 0 64 40" {...common}>
          <line x1="4" y1="20" x2="60" y2="20" stroke={M} strokeDasharray="3 3" />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={5 + i * 15} y="10" width="12" height="20" rx="2.5" fill={i === 1 ? A : "rgba(255,255,255,0.07)"} opacity={i === 1 ? 0.9 : 1} stroke={i === 1 ? "none" : M} />
          ))}
        </svg>
      );
    case "donut":
      return (
        <svg viewBox="0 0 64 40" {...common}>
          <circle cx="32" cy="20" r="13" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
          <circle cx="32" cy="20" r="13" fill="none" stroke={A} strokeWidth="6" strokeDasharray="30 60" transform="rotate(-90 32 20)" />
          <circle cx="32" cy="20" r="13" fill="none" stroke={B} strokeWidth="6" strokeDasharray="18 72" transform="rotate(20 32 20)" />
        </svg>
      );
    case "radar":
      return (
        <svg viewBox="0 0 64 40" {...common}>
          <polygon points="32,6 52,20 44,34 20,34 12,20" fill="none" stroke={M} />
          <polygon points="32,13 44,21 40,29 24,29 20,21" fill="none" stroke={M} opacity="0.6" />
          <polygon points="32,10 47,22 39,31 25,28 18,19" fill={A} opacity="0.35" stroke={A} strokeWidth="1.4" />
        </svg>
      );
    case "gauge":
      return (
        <svg viewBox="0 0 64 40" {...common}>
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <path d={`M${12 + i * 18},28 a8,8 0 1,1 16,0`} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" strokeLinecap="round" />
              <path d={`M${12 + i * 18},28 a8,8 0 1,1 16,0`} fill="none" stroke={i === 1 ? B : A} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${16 + i * 6} 60`} />
            </g>
          ))}
        </svg>
      );
    case "funnel":
      return (
        <svg viewBox="0 0 64 40" {...common}>
          {[0, 1, 2, 3].map((i) => {
            const w = 52 - i * 11;
            return <rect key={i} x={32 - w / 2} y={6 + i * 8} width={w} height="6" rx="2" fill={i === 3 ? A : B} opacity={0.35 + i * 0.2} />;
          })}
        </svg>
      );
    case "doc":
      return (
        <svg viewBox="0 0 64 40" {...common}>
          <rect x="10" y="6" width="44" height="28" rx="3" fill="rgba(255,255,255,0.05)" stroke={M} />
          <rect x="15" y="11" width="24" height="3" rx="1.5" fill={A} />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x="15" y={18 + i * 4} width={34 - i * 5} height="2" rx="1" fill={M} />
          ))}
        </svg>
      );
    case "cover":
      return (
        <svg viewBox="0 0 64 40" {...common}>
          <rect x="4" y="5" width="56" height="30" rx="3" fill="rgba(255,255,255,0.07)" stroke={M} />
          <circle cx="17" cy="14" r="4" fill={B} opacity="0.8" />
          <path d="M4,30 L22,18 L34,26 L46,14 L60,24 L60,35 L4,35 Z" fill={A} opacity="0.55" />
        </svg>
      );
    case "log":
      return (
        <svg viewBox="0 0 64 40" {...common}>
          <rect x="5" y="6" width="54" height="28" rx="3" fill="#0b0e16" stroke={M} />
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <rect x="9" y={11 + i * 6} width={26 + ((i * 7) % 18)} height="2.4" rx="1.2" fill={M} opacity={0.9 - i * 0.15} />
              <circle cx={54 - i} cy={12.2 + i * 6} r="1.4" fill={i === 1 ? B : A} />
            </g>
          ))}
        </svg>
      );
    default:
      return null;
  }
}

export default function AdminConsole({
  initialSections,
  initialBrand,
  initialDb,
  firstPostSlug,
}: {
  initialSections: AdminSection[];
  initialBrand: AdminBrand;
  initialDb: boolean;
  firstPostSlug: string;
}) {
  const [rows, setRows] = useState<AdminSection[]>(initialSections);
  const [brand, setBrand] = useState<AdminBrand>(initialBrand);
  const [dbOk, setDbOk] = useState(initialDb);
  const [scope, setScope] = useState<Scope>("home");
  const [preview, setPreview] = useState<"home" | "post">("home");
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [previewKey, setPreviewKey] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [editingAdKey, setEditingAdKey] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const say = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", brand.accent);
    document.documentElement.dataset.motion = brand.motion ? "on" : "off";
  }, [brand.accent, brand.motion]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await fetch("/api/sections", { method: "POST", body: JSON.stringify({ mode: "ensure" }) });
        const res = await fetch("/api/sections");
        const data = await res.json();
        if (!alive) return;
        if (data.db) setDbOk(true);
        if (Array.isArray(data.sections) && data.sections.length) {
          setRows(
            SECTIONS.map((meta) => {
              const row = data.sections.find((r: AdminSection) => r.key === meta.key);
              return {
                ...(row ?? {}),
                key: meta.key,
                scope: meta.scope,
                zone: meta.zone,
                label: meta.label,
                labelEn: meta.labelEn,
                description: meta.description,
                variant: row && meta.variants.some((v) => v.id === row.variant) ? row.variant : meta.defaultVariant,
                visible: row ? row.visible : meta.defaultVisible,
                position: row ? row.position : 0,
                config: row?.config ?? {},
              } as AdminSection;
            }),
          );
        }
        if (data.brand) setBrand((b) => ({ ...b, ...(data.brand as Partial<AdminBrand>) }));
      } catch {
        // offline
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const persist = useCallback(
    async (key: string, patch: Partial<AdminSection>) => {
      setBusy(key);
      try {
        const res = await fetch(`/api/sections/${key}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const data = await res.json();
        if (data.db === false) setDbOk(false);
      } catch {
        setDbOk(false);
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  const patchBrand = useCallback(async (patch: Partial<AdminBrand>) => {
    playClick(720);
    setBrand((b) => ({ ...b, ...patch }));
    try {
      await fetch("/api/brand", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      setPreviewKey((k) => k + 1);
    } catch {
      // ignore
    }
  }, []);

  const setVariant = (key: string, variant: string) => {
    playClick(880);
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, variant } : r)));
    void persist(key, { variant });
    setPreviewKey((k) => k + 1);
    say("নকশা পরিবর্তন সংরক্ষিত হয়েছে");
  };

  const setVisible = (key: string, visible: boolean) => {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, visible } : r)));
    void persist(key, { visible });
    setPreviewKey((k) => k + 1);
    say(visible ? "সেকশনটি দৃশ্যমান করা হয়েছে" : "সেকশনটি লুকানো হয়েছে");
  };

  const saveAdConfig = async (key: string, config: Record<string, unknown>) => {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, config } : r)));
    await persist(key, { config });
    setPreviewKey((k) => k + 1);
    say("বিজ্ঞাপনের তথ্য আপডেট হয়েছে");
  };

  const saveLogoEngine = async (key: string, engine: string | null) => {
    playClick(900);
    const row = rows.find((r) => r.key === key);
    const next: Record<string, unknown> = { ...(row?.config ?? {}) };
    if (engine) next.logoEngine = engine;
    else delete next.logoEngine;
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, config: next } : r)));
    await persist(key, { config: next });
    setPreviewKey((k) => k + 1);
    say(engine ? "লোগো অ্যানিমেশন বদলানো হয়েছে" : "লোগো অ্যানিমেশন নকশা অনুযায়ী স্বয়ংক্রিয়");
  };

  /** Swap with the neighbour in the SAME zone group, which is what the list on screen shows. */
  const move = (key: string, dir: -1 | 1) => {
    const row = rows.find((r) => r.key === key);
    if (!row) return;
    const group = rows
      .filter((r) => (r.scope === scope || r.scope === "global") && r.zone === row.zone)
      .sort((x, y) => x.position - y.position);
    const idx = group.findIndex((r) => r.key === key);
    const other = group[idx + dir];
    if (!other) return;
    playClick(600);
    const posA = row.position;
    const posB = other.position;
    setRows((rs) =>
      rs.map((r) => {
        if (r.key === row.key) return { ...r, position: posB };
        if (r.key === other.key) return { ...r, position: posA };
        return r;
      }),
    );
    void persist(row.key, { position: posB });
    void persist(other.key, { position: posA });
    setPreviewKey((k) => k + 1);
    say("সেকশনের ক্রম বদলানো হয়েছে");
  };

  const applyPreset = async (id: string) => {
    playClick(940);
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setRows((rs) =>
      rs.map((r) => (preset.values[r.key] ? { ...r, variant: preset.values[r.key], visible: true } : r)),
    );
    setBrand((b) => ({ ...b, accent: preset.accent }));
    for (const [key, variant] of Object.entries(preset.values)) {
      try {
        await fetch(`/api/sections/${key}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variant, visible: true }),
        });
      } catch {
        // ignore
      }
    }
    try {
      await fetch("/api/brand", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accent: preset.accent }),
      });
    } catch {
      // ignore
    }
    setPreviewKey((k) => k + 1);
    say(`“${preset.name}” প্রিসেট সফলভাবে সক্রিয় হয়েছে`);
  };

  const showAll = (visible: boolean) => {
    playClick(620);
    setRows((rs) => rs.map((r) => (r.scope === scope ? { ...r, visible } : r)));
    rows.filter((r) => r.scope === scope).forEach((r) => void persist(r.key, { visible }));
    setPreviewKey((k) => k + 1);
    say(visible ? "সব সেকশন দৃশ্যমান করা হয়েছে" : "সব সেকশন লুকানো হয়েছে");
  };

  const resetAll = async () => {
    playClick(500);
    setBusy("__reset");
    try {
      await fetch("/api/sections", { method: "POST", body: JSON.stringify({ mode: "reset" }) });
      const res = await fetch("/api/sections");
      const data = await res.json();
      if (Array.isArray(data.sections) && data.sections.length) {
        setRows(
          SECTIONS.map((meta) => {
            const row = data.sections.find((r: AdminSection) => r.key === meta.key);
            return {
              ...(row ?? {}),
              key: meta.key,
              scope: meta.scope,
              zone: meta.zone,
              label: meta.label,
              labelEn: meta.labelEn,
              description: meta.description,
              variant: row?.variant ?? meta.defaultVariant,
              visible: row?.visible ?? meta.defaultVisible,
              position: row?.position ?? 0,
              config: row?.config ?? {},
            } as AdminSection;
          }),
        );
      }
      setPreviewKey((k) => k + 1);
      say("ডিফল্ট সেটিংসে সফলভাবে ফিরিয়ে আনা হয়েছে");
    } finally {
      setBusy(null);
    }
  };

  const scoped = useMemo(() => {
    const pool = rows.filter((r) => r.scope === scope || r.scope === "global");
    return ZONE_ORDER.map((zone) => ({
      zone,
      items: pool.filter((r) => r.zone === zone).sort((a, b) => a.position - b.position),
    })).filter((g) => g.items.length > 0);
  }, [rows, scope]);

  const metaOf = (key: string): SectionMeta | undefined => SECTIONS.find((s) => s.key === key);
  const visibleCount = scoped.reduce((n, g) => n + g.items.filter((i) => i.visible).length, 0);
  const totalCount = scoped.reduce((n, g) => n + g.items.length, 0);
  const previewSrc = preview === "home" ? "/" : `/post/${firstPostSlug}`;

  return (
    <div className="min-h-screen bg-ink-950">
      {/* ── Admin Header ── */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-ink-950/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1700px] flex-wrap items-center gap-3 px-5 py-3 md:px-7">
          <Link href="/" className="group flex items-center gap-2.5">
            <span
              className="grid h-9 w-9 place-items-center rounded-lg shadow-sm"
              style={{ background: "var(--accent)" }}
            >
              <Zap className="h-4.5 w-4.5 text-ink-950" strokeWidth={2.6} />
            </span>
            <div className="leading-none">
              <span className="font-display-bn block text-lg text-mist-100">হৈচৈ সম্পাদকীয় কন্ট্রোল রুম</span>
              <span className="mono-label mt-0.5 block text-mist-400">ডাইনামিক লেআউট ও ডিজাইন ম্যানেজার</span>
            </div>
          </Link>

          <span
            className={clsx(
              "mono-label ml-2 flex items-center gap-1.5 rounded-full border px-3 py-1.5",
              dbOk
                ? "border-mint-500/30 bg-mint-500/10 text-mint-400"
                : "border-gold-500/30 bg-gold-500/10 text-gold-400"
            )}
          >
            <Database className="h-3 w-3" /> {dbOk ? "পোস্টগ্রেস ডাটাবেস সংযুক্ত" : "লোকাল মোড"}
          </span>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <ThemeToggle showSoundToggle />

            <Link
              href="/"
              className="mono-label flex items-center gap-1.5 rounded-full border border-white/12 px-3.5 py-2 text-mist-200 transition-colors hover:border-white/30 hover:text-white"
            >
              <Eye className="h-3.5 w-3.5" /> হোম
            </Link>
            <Link
              href={`/post/${firstPostSlug}`}
              className="mono-label flex items-center gap-1.5 rounded-full border border-white/12 px-3.5 py-2 text-mist-200 transition-colors hover:border-white/30 hover:text-white"
            >
              <LayoutDashboard className="h-3.5 w-3.5" /> পোস্ট
            </Link>
            <Link
              href="/gallery"
              className="mono-label flex items-center gap-1.5 rounded-full border border-white/12 px-3.5 py-2 text-mist-200 transition-colors hover:border-white/30 hover:text-white"
            >
              <Layers className="h-3.5 w-3.5" /> গ্যালারি
            </Link>
            <button
              onClick={resetAll}
              disabled={busy === "__reset"}
              className="mono-label flex items-center gap-1.5 rounded-full border border-white/12 px-3.5 py-2 text-mist-200 transition-colors hover:border-white/30 hover:text-white disabled:opacity-50"
            >
              <RotateCcw className={clsx("h-3.5 w-3.5", busy === "__reset" && "animate-spin")} /> রিসেট
            </button>
            <button
              onClick={() => {
                playClick(720);
                setPreviewKey((k) => k + 1);
              }}
              className="mono-label flex items-center gap-1.5 rounded-full px-3.5 py-2 font-semibold text-ink-950 transition-all hover:brightness-110"
              style={{ background: "var(--accent)" }}
            >
              <RefreshCw className="h-3.5 w-3.5" /> প্রিভিউ রিফ্রেশ
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1700px] gap-6 px-5 py-6 md:px-7 xl:grid-cols-[minmax(0,1fr)_530px]">
        {/* ── Left: Controls ── */}
        <div className="min-w-0 space-y-5">
          {/* Presets */}
          <section className="surface rounded-2xl p-5">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: "var(--accent)" }} />
              <h2 className="text-[15px] font-semibold text-mist-100">এক ক্লিকে পূর্ণাঙ্গ লুক / প্রিসেট</h2>
              <span className="mono-label ml-auto text-mist-400">
                {bn(visibleCount)}/{bn(totalCount)} সক্রিয়
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  className="group surface card-lift relative overflow-hidden rounded-xl p-4 text-left"
                >
                  <span
                    className="absolute right-3 top-3 h-3.5 w-3.5 rounded-full ring-2 ring-white/10"
                    style={{ background: p.accent }}
                  />
                  <p className="font-display-bn pr-6 text-[17px] leading-snug text-mist-100 group-hover:text-white">
                    {p.name}
                  </p>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-mist-400">{p.blurb}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Global Look */}
          <section className="surface rounded-2xl p-5">
            <h2 className="mb-4 text-[15px] font-semibold text-mist-100">গ্লোবাল ব্র্যান্ড ও থিম নিয়ন্ত্রণ</h2>
            <div className="grid gap-5 md:grid-cols-3">
              <div>
                <p className="mono-label mb-2.5 text-mist-400">উচ্চারক রং (ACCENT COLOR)</p>
                <div className="flex flex-wrap gap-2">
                  {ACCENTS.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => patchBrand({ accent: a.hex })}
                      title={a.name}
                      className={clsx(
                        "grid h-9 w-9 place-items-center rounded-full ring-2 transition-all hover:scale-110",
                        brand.accent === a.hex ? "ring-white/80 scale-105" : "ring-white/10"
                      )}
                      style={{ background: a.hex }}
                    >
                      {brand.accent === a.hex ? <Check className="h-4 w-4 text-ink-950 font-bold" /> : null}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mono-label mb-2.5 text-mist-400">মোশন অ্যানিমেশন (ANIMATIONS)</p>
                <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-2.5">
                  <TactileToggle
                    checked={brand.motion}
                    onChange={(v) => patchBrand({ motion: v })}
                    label={brand.motion ? "অ্যানিমেশন সক্রিয়" : "অ্যানিমেশন নিষ্ক্রিয়"}
                  />
                </div>
              </div>

              <div>
                <p className="mono-label mb-2.5 text-mist-400">ফাঁকা জায়গা বিন্যাস (DENSITY)</p>
                <div className="flex gap-1 rounded-xl border border-white/8 bg-white/[0.02] p-1">
                  {[
                    { id: "compact", label: "সংক্ষিপ্ত" },
                    { id: "comfortable", label: "স্বাভাবিক" },
                    { id: "spacious", label: "প্রশস্ত" },
                  ].map((d) => (
                    <button
                      key={d.id}
                      onClick={() => patchBrand({ density: d.id as typeof brand.density })}
                      className={clsx(
                        "flex-1 rounded-lg py-2 text-[12px] font-medium transition-all text-center",
                        brand.density === d.id
                          ? "text-ink-950 font-bold"
                          : "text-mist-400 hover:text-mist-100"
                      )}
                      style={{
                        background: brand.density === d.id ? "var(--accent)" : undefined,
                      }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Scope Tabs in Bangla */}
          <div className="flex flex-wrap items-center gap-2">
            {(["home", "post", "global"] as Scope[]).map((s) => (
              <button
                key={s}
                onClick={() => {
                  playClick(680);
                  setScope(s);
                }}
                className={clsx(
                  "rounded-full border px-4 py-2 text-[13.5px] font-medium transition-all",
                  scope === s
                    ? "border-transparent text-ink-950 font-bold"
                    : "border-white/12 text-mist-300 hover:border-white/30 hover:text-mist-100"
                )}
                style={{
                  background: scope === s ? "var(--accent)" : undefined,
                }}
              >
                {SCOPE_LABELS[s].bn}
                <span className="mono-label ml-2 opacity-80">
                  {bn(rows.filter((r) => r.scope === s).length)}
                </span>
              </button>
            ))}

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => showAll(true)}
                className="mono-label flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-mist-300 transition-colors hover:border-white/30 hover:text-white"
              >
                <Eye className="h-3.5 w-3.5" /> সব দেখান
              </button>
              <button
                onClick={() => showAll(false)}
                className="mono-label flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-mist-300 transition-colors hover:border-white/30 hover:text-white"
              >
                <EyeOff className="h-3.5 w-3.5" /> সব লুকান
              </button>
            </div>
          </div>

          {/* Sections List */}
          {scoped.map((group) => (
            <section key={group.zone}>
              <div className="mb-3 flex items-center gap-3">
                <h3 className="mono-label text-mist-400">{ZONE_LABELS[group.zone].bn}</h3>
                <span className="h-px flex-1 bg-white/8" />
                <span className="mono-label text-mist-400">{bn(group.items.length)} টি সেকশন</span>
              </div>

              <div className="space-y-3">
                {group.items.map((row, gi) => {
                  const meta = metaOf(row.key);
                  const isBusy = busy === row.key;
                  const isAdSection = row.key === "home-ad" || row.key === "post-ad";
                  const isLogoSection = row.key === "navbar" || row.key === "footer";
                  const chosenEngine = normalizeLogoEngine(row.config?.logoEngine);
                  return (
                    <article
                      key={row.key}
                      className={clsx(
                        "surface overflow-hidden rounded-2xl transition-all duration-300",
                        !row.visible && "opacity-55"
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-3 p-4">
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => move(row.key, -1)}
                            disabled={gi === 0}
                            className="grid h-5 w-6 place-items-center rounded text-mist-400 transition-colors hover:bg-white/8 hover:text-mist-100 disabled:pointer-events-none disabled:opacity-25"
                            aria-label="উপরে তুলুন"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => move(row.key, 1)}
                            disabled={gi === group.items.length - 1}
                            className="grid h-5 w-6 place-items-center rounded text-mist-400 transition-colors hover:bg-white/8 hover:text-mist-100 disabled:pointer-events-none disabled:opacity-25"
                            aria-label="নিচে নামান"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-display-bn text-[17px] text-mist-100">{row.label}</h4>
                            <span className="mono-label rounded-full border border-white/10 px-2 py-0.5 text-mist-400">
                              {row.scope === "global" ? "গ্লোবাল" : row.scope === "home" ? "হোম" : "পোস্ট"}
                            </span>
                          </div>
                          <p className="mt-1 text-[12.5px] leading-relaxed text-mist-400">{row.description}</p>
                        </div>

                        <div className="flex items-center gap-3">
                          {isAdSection && (
                            <button
                              onClick={() => {
                                playClick(640);
                                setEditingAdKey(editingAdKey === row.key ? null : row.key);
                              }}
                              className="mono-label flex items-center gap-1.5 rounded-lg border border-white/12 px-2.5 py-1 text-mist-300 hover:border-white/25 hover:text-mist-100"
                            >
                              <Megaphone className="h-3 w-3" style={{ color: "var(--accent)" }} />
                              বিজ্ঞাপন কনফিগ
                            </button>
                          )}

                          <TactileToggle
                            checked={row.visible}
                            onChange={(v) => setVisible(row.key, v)}
                            size="sm"
                          />
                        </div>
                      </div>

                      {/* Advertisement Slot Editor Accordion */}
                      {isAdSection && editingAdKey === row.key && (
                        <div className="border-t border-white/8 px-4 pb-4">
                          <AdConfigEditor
                            config={row.config}
                            onSave={(cfg) => saveAdConfig(row.key, cfg)}
                          />
                        </div>
                      )}


                      {/* Logo animation picker */}
                      {isLogoSection ? (
                        <div className="border-t border-white/6 bg-white/[0.015] p-4">
                          <p className="mono-label mb-3 text-mist-400">
                            লোগো অ্যানিমেশন · {bn(LOGO_ENGINES.length)}টি দৃশ্য ·{" "}
                            <span style={{ color: "var(--accent)" }}>
                              {chosenEngine
                                ? LOGO_ENGINES.find((e) => e.id === chosenEngine)?.name
                                : "নকশা অনুযায়ী স্বয়ংক্রিয়"}
                            </span>
                          </p>
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            <button
                              onClick={() => saveLogoEngine(row.key, null)}
                              className={clsx(
                                "rounded-xl border p-3 text-left transition-all",
                                !chosenEngine ? "border-transparent bg-white/[0.06]" : "border-white/8 bg-white/[0.02] hover:border-white/22",
                              )}
                              style={!chosenEngine ? { boxShadow: "inset 0 0 0 1.5px var(--accent)" } : undefined}
                            >
                              <p className="text-[13.5px] font-semibold text-mist-100">স্বয়ংক্রিয়</p>
                              <p className="mt-1 text-[11.5px] leading-relaxed text-mist-400">নির্বাচিত নকশার সঙ্গে মানানসই দৃশ্য</p>
                            </button>
                            {LOGO_ENGINES.map((e) => {
                              const active = chosenEngine === e.id;
                              return (
                                <button
                                  key={e.id}
                                  onClick={() => saveLogoEngine(row.key, e.id)}
                                  className={clsx(
                                    "rounded-xl border p-3 text-left transition-all",
                                    active ? "border-transparent bg-white/[0.06]" : "border-white/8 bg-white/[0.02] hover:border-white/22",
                                  )}
                                  style={active ? { boxShadow: "inset 0 0 0 1.5px var(--accent)" } : undefined}
                                >
                                  <p className="text-[13.5px] font-semibold text-mist-100">{e.name}</p>
                                  <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-mist-400">
                                    {e.effects.slice(0, 3).join(" · ")}
                                  </p>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}

                      {/* 5 Distinct Design Variants */}
                      <div className="border-t border-white/6 bg-white/[0.015] p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="mono-label text-mist-400">
                            নকশা রূপভেদ · {bn(meta?.variants.length ?? 0)}টি বিকল্প ·{" "}
                            <span style={{ color: "var(--accent)" }}>{row.variant}</span>
                            {isBusy ? <span className="ml-2 animate-pulse text-gold-400">সংরক্ষণ হচ্ছে…</span> : null}
                          </p>
                        </div>

                        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                          {(meta?.variants ?? []).map((v) => {
                            const active = row.variant === v.id;
                            return (
                              <button
                                key={v.id}
                                onClick={() => setVariant(row.key, v.id)}
                                className={clsx(
                                  "group relative overflow-hidden rounded-xl border p-3 text-left transition-all duration-300",
                                  active
                                    ? "border-transparent bg-white/[0.06] shadow-sm"
                                    : "border-white/8 bg-white/[0.02] hover:border-white/22 hover:bg-white/[0.04]"
                                )}
                                style={{
                                  boxShadow: active ? `inset 0 0 0 1.5px var(--accent)` : undefined,
                                }}
                              >
                                <div className="mb-2.5 flex h-11 items-center justify-center rounded-lg bg-ink-950/70 p-1.5">
                                  <ThumbArt kind={v.thumb} />
                                </div>
                                <div className="flex items-start justify-between gap-1.5">
                                  <div className="min-w-0">
                                    <p className="truncate text-[13.5px] font-semibold text-mist-100">{v.name}</p>
                                  </div>
                                  {active ? (
                                    <span
                                      className="grid h-4.5 w-4.5 shrink-0 place-items-center rounded-full"
                                      style={{ background: "var(--accent)" }}
                                    >
                                      <Check className="h-3 w-3 text-ink-950 font-bold" />
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-2 line-clamp-2 text-[11.5px] leading-relaxed text-mist-400 opacity-80 group-hover:opacity-100">
                                  {v.blurb}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* ── Right: Live Preview ── */}
        <aside className="xl:sticky xl:top-[76px] xl:h-[calc(100vh-96px)]">
          <div className="surface flex h-full flex-col overflow-hidden rounded-2xl shadow-xl">
            <div className="flex flex-wrap items-center gap-2 border-b border-white/8 p-3">
              <div className="flex gap-1 rounded-lg border border-white/8 p-0.5">
                {(["home", "post"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      playClick(620);
                      setPreview(p);
                    }}
                    className={clsx(
                      "mono-label rounded-md px-2.5 py-1.5 transition-all",
                      preview === p ? "text-ink-950 font-bold" : "text-mist-400 hover:text-mist-100"
                    )}
                    style={{
                      background: preview === p ? "var(--accent)" : undefined,
                    }}
                  >
                    {p === "home" ? "হোম পেজ" : "পোস্ট পেজ"}
                  </button>
                ))}
              </div>

              <div className="flex gap-1 rounded-lg border border-white/8 p-0.5">
                {[
                  { id: "desktop", Icon: Monitor },
                  { id: "tablet", Icon: Tablet },
                  { id: "mobile", Icon: Smartphone },
                ].map(({ id, Icon }) => (
                  <button
                    key={id}
                    onClick={() => {
                      playClick(600);
                      setDevice(id as typeof device);
                    }}
                    className={clsx(
                      "grid h-7 w-8 place-items-center rounded-md transition-all",
                      device === id
                        ? "bg-white/10 text-mist-100"
                        : "text-mist-400 hover:text-mist-100"
                    )}
                    aria-label={id}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>

              <span className="mono-label ml-auto truncate text-mist-400">{previewSrc}</span>

              <button
                onClick={() => {
                  playClick(720);
                  setPreviewKey((k) => k + 1);
                }}
                className="grid h-7 w-7 place-items-center rounded-md text-mist-400 transition-colors hover:bg-white/8 hover:text-mist-100"
                aria-label="রিফ্রেশ"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="relative flex-1 overflow-hidden bg-ink-950">
              <div
                className="mx-auto h-full overflow-hidden transition-all duration-500"
                style={{ width: device === "mobile" ? 390 : device === "tablet" ? 768 : "100%" }}
              >
                <iframe
                  key={`${previewKey}-${preview}-${device}`}
                  src={previewSrc}
                  title="লাইভ প্রিভিউ"
                  className="h-full w-full border-0 bg-ink-950"
                  style={{
                    transform: device === "mobile" ? "scale(1)" : undefined,
                    zoom: device === "desktop" ? 0.72 : device === "tablet" ? 0.72 : 0.86,
                  }}
                />
              </div>
            </div>

            <div className="border-t border-white/8 p-3">
              <p className="text-[12px] leading-relaxed text-mist-400">
                পরিবর্তন সঙ্গে সঙ্গে সেভ হয়। প্রিভিউতে দেখতে না পেলে রিফ্রেশ চাপুন — আইফ্রেম ক্যাশ এড়াতে প্রতিবার নতুন
                কী দিয়ে লোড হয়।
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Floating Toast Notification */}
      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-[90] -translate-x-1/2">
          <div className="flex items-center gap-2.5 rounded-full border border-white/15 bg-ink-900/98 px-5 py-3 shadow-2xl backdrop-blur-xl">
            <Check className="h-4 w-4" style={{ color: "var(--accent)" }} />
            <span className="text-[13.5px] text-mist-100 font-medium">{toast}</span>
            <button
              onClick={() => setToast(null)}
              className="text-mist-400 hover:text-mist-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
