"use client";

import { useEffect, useState } from "react";
import { Check, LayoutDashboard, Loader2 } from "lucide-react";

interface AppConfig {
  show_hero: boolean;
  show_live_graph: boolean;
  show_categories: boolean;
  show_ads: boolean;
  show_rewrite_engine: boolean;
  show_footer: boolean;
  theme_default: "light" | "dark";
  surge_threshold: number;
}

const DEFAULTS: AppConfig = {
  show_hero: true,
  show_live_graph: true,
  show_categories: true,
  show_ads: true,
  show_rewrite_engine: true,
  show_footer: true,
  theme_default: "light",
  surge_threshold: 12,
};

const ITEMS: Array<{ key: keyof AppConfig; label: string; hint: string }> = [
  { key: "show_hero", label: "হিরো সেকশন", hint: "শীর্ষের বড় ক্যাটাগরি-কার্ড" },
  { key: "show_live_graph", label: "Live Analytics গ্রাফ", hint: "প্রবন্ধ-card-এর উপরে ট্রেন্ডগ্রাফ" },
  { key: "show_categories", label: "বিভাগ স্ট্রিপ", hint: "হোমপেজ গ্রিডের আগে ক্যাটাগরি-বোতাম" },
  { key: "show_ads", label: "বিজ্ঞাপন স্লট", hint: "সব ad slot জায়গা" },
  { key: "show_rewrite_engine", label: "রিরাইট ইঞ্জিন ব্যাজ", hint: "ডেস্কটপ অ্যাপ প্রচার-কার্ড" },
  { key: "show_footer", label: "ফুটার", hint: "নিচের ফুটার প্যানেল" },
];

/** ওয়েবসাইটে কোন সেকশন দৃশ্যমান হবে — ডেস্কটপ Settings-এর "সাইট ও বিজ্ঞাপন" ট্যাবের সহোদর। */
export function VisibilityPanel() {
  const [cfg, setCfg] = useState<AppConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        const data = (await res.json()) as { settings?: { app_config_json?: string | null } };
        const raw = data.settings?.app_config_json;
        const parsed = raw ? (JSON.parse(raw) as Partial<AppConfig>) : {};
        if (alive) setCfg({ ...DEFAULTS, ...parsed });
      } catch {
        if (alive) setCfg(DEFAULTS);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const save = async () => {
    if (!cfg) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_config_json: JSON.stringify(cfg) }),
      });
      if (!res.ok) throw new Error("সংরক্ষণ ব্যর্থ");
      setMsg({ type: "ok", text: "সংরক্ষিত — পাবলিক সাইট এখনই নতুন ভিজিবিলিটি অনুসরণ করবে।" });
      setTimeout(() => setMsg(null), 4000);
    } catch (e) {
      setMsg({ type: "err", text: String(e) });
    } finally {
      setSaving(false);
    }
  };

  if (!cfg) {
    return (
      <div className="flex items-center gap-2 border border-ink/20 bg-paper-deep p-6 text-[12.5px] text-ink-soft">
        <Loader2 size={14} className="animate-spin" /> ভিজিবিলিটি সেটিংস লোড হচ্ছে…
      </div>
    );
  }

  const toggle = (k: keyof AppConfig) => setCfg((c) => (c ? { ...c, [k]: !c[k] } : c));

  return (
    <div className="border border-ink/20 bg-paper-deep p-6">
      <h3 className="flex items-center gap-2 font-sans-bn text-[15px] font-bold text-ink">
        <LayoutDashboard size={15} className="text-alizarin" /> ওয়েব ভিজিবিলিটি ও থিম
      </h3>
      <p className="mt-1 text-[12.5px] text-ink-soft">
        কোন সেকশন পাবলিক সাইটে দেখাবে — ডেস্কটপ Settings-এও একই কনফিগ সম্পাদনা করা যায়
        (app_config_json, shared settings টেবিল)।
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {ITEMS.map((v) => (
          <label key={v.key} className="flex items-center justify-between gap-3 rounded-lg border border-ink/15 bg-ink/5 px-3 py-2.5">
            <span className="min-w-0">
              <span className="block text-[13px] font-bold text-ink">{v.label}</span>
              <span className="block text-[10.5px] text-ink-soft">{v.hint}</span>
            </span>
            <button
              type="button"
              onClick={() => toggle(v.key)}
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${cfg[v.key] ? "bg-lime" : "bg-ink/25"}`}
              aria-pressed={cfg[v.key] === true}
            >
              <span
                className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all"
                style={{ left: cfg[v.key] ? 18 : 2 }}
              />
            </button>
          </label>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="font-mono-x text-[10px] tracking-[0.18em] text-ink-soft uppercase">ডিফল্ট থিম</span>
          <select
            className="mt-1 rounded-lg border border-ink/15 bg-paper px-3 py-2 text-[13px] outline-none"
            value={cfg.theme_default}
            onChange={(e) => setCfg({ ...cfg, theme_default: e.target.value as "light" | "dark" })}
          >
            <option value="light">light</option>
            <option value="dark">dark</option>
          </select>
        </label>
        <label className="block">
          <span className="font-mono-x text-[10px] tracking-[0.18em] text-ink-soft uppercase">Surge threshold</span>
          <input
            type="number"
            className="mt-1 rounded-lg border border-ink/15 bg-paper px-3 py-2 text-[13px] outline-none"
            value={cfg.surge_threshold}
            onChange={(e) => setCfg({ ...cfg, surge_threshold: Number(e.target.value) })}
          />
        </label>
        <button onClick={() => void save()} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-lime px-4 py-2 text-[12px] font-bold text-night disabled:opacity-50">
          <Check size={14} /> {saving ? "সংরক্ষণ হচ্ছে…" : "সংরক্ষণ"}
        </button>
      </div>

      {msg && (
        <p className={`mt-3 rounded-lg px-3 py-2 text-[12px] font-bold ${msg.type === "ok" ? "bg-lime text-night" : "bg-alizarin text-paper"}`}>
          {msg.type === "ok" ? "✓ " : "✕ "}
          {msg.text}
        </p>
      )}
    </div>
  );
}