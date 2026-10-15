"use client";

import { useState } from "react";
import {
  DEFAULT_APP_CONFIG,
  type SiteAppConfig,
  type SiteSettings,
  type SectionState,
} from "@hoichoi/shared-types";
import type { RecentPipelineRun } from "@hoichoi/db";
import { SettingsCtx, type AdsForm, type IdentityForm, type MaintenanceInbox } from "./state";
import { SiteSection } from "./SiteSection";
import { AdsSection } from "./AdsSection";
import { VisibilitySection } from "./VisibilitySection";
import { MaintenanceEditor } from "./MaintenanceEditor";
import { OperationsSection } from "./OperationsSection";
import { VariantSwitcher } from "@/components/admin/VariantSwitcher";

type Tab = "site" | "visibility" | "ads" | "design" | "maintenance" | "operations";

const TABS: Array<{ key: Tab; emoji: string; bn: string; en: string }> = [
  { key: "site", emoji: "📰", bn: "সাইট", en: "Site" },
  { key: "visibility", emoji: "👁️", bn: "ভিজিবিলিটি", en: "Visibility" },
  { key: "ads", emoji: "📣", bn: "বিজ্ঞাপন", en: "Ads" },
  { key: "design", emoji: "🎨", bn: "ডিজাইন", en: "Design" },
  { key: "maintenance", emoji: "🛠️", bn: "রক্ষণাবেক্ষণ", en: "Maintenance" },
  { key: "operations", emoji: "⚙️", bn: "অপারেশন", en: "Operations" },
];

function toIdentity(s: SiteSettings): IdentityForm {
  return {
    site_name: s.site_name,
    slogan_bn: s.slogan_bn,
    tagline: s.tagline,
    logo_url: s.logo_url ?? "",
    favicon_url: s.favicon_url ?? "",
    accent_color: s.accent_color,
    footer_about_bn: s.footer_about_bn ?? "",
    contact_email: s.contact_email,
    police_helpline: s.police_helpline,
    child_helpline: s.child_helpline,
    pipeline_hours: s.pipeline_hours,
    archive_visible_days: s.archive_visible_days,
    archive_retention_days: s.archive_retention_days,
  };
}

function toAds(s: SiteSettings): AdsForm {
  return {
    ad_leaderboard_html: s.ad_leaderboard_html ?? "",
    ad_rect_html: s.ad_rect_html ?? "",
    ad_infeed_html: s.ad_infeed_html ?? "",
    ad_strip_html: s.ad_strip_html ?? "",
  };
}

/**
 * Tabbed settings console. One shared object for the whole console, saved with
 * a single "সংরক্ষণ করুন" — a nested maintenance subtree and the visibility
 * knobs both ride inside `app_config_json`, so the browser builds one faithful
 * SiteAppConfig and the server PATCH only whitelists known fields.
 */
export function SettingsConsole({
  initial,
  initialRuns,
  inbox,
  sections,
  siteVariant,
  initialTab,
}: {
  initial: SiteSettings;
  initialRuns: RecentPipelineRun[];
  inbox: MaintenanceInbox | null;
  sections: SectionState[];
  siteVariant: string;
  initialTab?: string;
}) {
  const [tab, setTab] = useState<Tab>(() =>
    TABS.some((t) => t.key === initialTab) ? (initialTab as Tab) : "site",
  );
  const [identity, setIdentityRaw] = useState<IdentityForm>(() => toIdentity(initial));
  const [ads, setAdsRaw] = useState<AdsForm>(() => toAds(initial));
  const [cfg, setCfgRaw] = useState<SiteAppConfig>(() => {
    try {
      const parsed = initial.app_config_json
        ? (JSON.parse(initial.app_config_json) as Partial<SiteAppConfig>)
        : {};
      const base: SiteAppConfig = JSON.parse(JSON.stringify(DEFAULT_APP_CONFIG));
      return { ...base, ...parsed, maintenance: { ...base.maintenance, ...(parsed.maintenance ?? {}) } };
    } catch {
      return JSON.parse(JSON.stringify(DEFAULT_APP_CONFIG));
    }
  });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<null | "ok" | "err" | "denied">(null);

  const patchIdentity = (p: Partial<IdentityForm>) => {
    setIdentityRaw((prev) => ({ ...prev, ...p }));
    setDirty(true);
  };
  const patchAds = (p: Partial<AdsForm>) => {
    setAdsRaw((prev) => ({ ...prev, ...p }));
    setDirty(true);
  };
  const setCfg = (updater: (c: SiteAppConfig) => SiteAppConfig) => {
    setCfgRaw(updater);
    setDirty(true);
  };

  const ctx = {
    identity,
    setIdentity: patchIdentity,
    ads,
    setAds: patchAds,
    cfg,
    setCfg,
    dirty,
  };

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...identity,
          ...ads,
          app_config_json: JSON.stringify(cfg),
        }),
      });
      if (res.status === 401 || res.status === 403) return setStatus("denied");
      if (!res.ok) return setStatus("err");
      setDirty(false);
      setStatus("ok");
      setTimeout(() => setStatus(null), 4000);
    } catch {
      setStatus("err");
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = async () => {
    if (!window.confirm("visibility ও maintenance কনফিগ সব ডিফল্টে ফিরে যাবে — Nনিশ্চিত?")) return;
    const base: SiteAppConfig = JSON.parse(JSON.stringify(DEFAULT_APP_CONFIG));
    setCfgRaw(base);
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_config_json: JSON.stringify(base) }),
      });
      if (res.status === 401 || res.status === 403) return setStatus("denied");
      if (!res.ok) return setStatus("err");
      setDirty(false);
      setStatus("ok");
      setTimeout(() => setStatus(null), 4000);
    } catch {
      setStatus("err");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCtx.Provider value={ctx}>
      <div className="mt-6">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-ink/20 bg-paper-deep p-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-bold transition-all ${
                tab === t.key ? "bg-ink text-paper" : "text-ink-soft hover:bg-ink/8 hover:text-ink"
              }`}
            >
              <span>{t.emoji}</span>
              <span>{t.bn}</span>
              {t.key === "maintenance" && cfg.maintenance_mode && (
                <span className="h-1.5 w-1.5 rounded-full bg-alizarin" title="মেইনটেন্যান্স চালু" />
              )}
              {t.key === "visibility" && dirty && (
                <span className="h-1.5 w-1.5 rounded-full bg-lime" title="অসংরক্ষিত পরিবর্তন" />
              )}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {tab === "site" && <SiteSection />}
          {tab === "visibility" && <VisibilitySection />}
          {tab === "ads" && <AdsSection />}
          {tab === "design" && (
            <div className="border border-ink/15 bg-paper-deep/40 p-2 sm:p-4">
              <div className="mb-4">
                <h3 className="font-sans-bn text-[17px] font-bold text-ink">নকশা ও ভ্যারিয়েন্ট</h3>
                <p className="mt-1 max-w-4xl text-[12.5px] leading-relaxed text-ink-soft">
                  পুরো সাইটের নকশা এখান থেকেই বাছুন, প্রয়োগের আগে লাইভ প্রিভিউ দেখুন এবং যেকোনো সময় ডিফল্টে
                  ফিরে যান। এই ট্যাবের পরিবর্তনগুলো আলাদাভাবে সাথে সাথে সংরক্ষিত হয় — নিচের “সংরক্ষণ করুন”
                  বোতাম এর জন্য প্রয়োজন নেই।
                </p>
              </div>
              <VariantSwitcher
                initialSections={sections}
                initialSiteVariant={siteVariant}
                accentColor={initial.accent_color}
                fullWidth
              />
            </div>
          )}
          {tab === "maintenance" && <MaintenanceEditor />}
          {tab === "operations" && <OperationsSection initialRuns={initialRuns} inbox={inbox} />}
        </div>

        {tab !== "design" && (
          <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-ink/15 pt-4">
            <button
              onClick={() => void save()}
              disabled={saving || !dirty}
              className="flex items-center gap-2 border-2 border-ink bg-ink px-6 py-2.5 text-[13px] font-bold text-paper transition hover:bg-alizarin disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "সংরক্ষণ হচ্ছে…" : dirty ? "সংরক্ষণ করুন →" : "✓ সংরক্ষিত"}
            </button>
            <button
              onClick={() => void resetDefaults()}
              disabled={saving}
              className="flex items-center gap-2 border-2 border-ink/30 px-5 py-2.5 text-[13px] font-bold text-ink-soft transition hover:border-alizarin hover:text-alizarin disabled:cursor-not-allowed disabled:opacity-40"
            >
              ⟲ ডিফল্টে রিসেট
            </button>
            {status === "ok" && <span className="text-[12.5px] font-bold text-ink">সব সেটিংস সংরক্ষিত — পাবলিক সাইট এখনই নতুন কনফিগ অনুসরণ করবে।</span>}
            {status === "err" && <span className="text-[12.5px] font-bold text-alizarin">ব্যর্থ — আবার চেষ্টা করুন।</span>}
            {status === "denied" && <span className="text-[12.5px] font-bold text-alizarin">অনুমতি নেই — admin প্রয়োজন।</span>}
          </div>
        )}
      </div>
    </SettingsCtx.Provider>
  );
}