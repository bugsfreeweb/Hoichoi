"use client";

import { useState } from "react";
import type { MediaStorageAdapterConfig, MediaStorageConfig, MediaStorageMode } from "@hoichoi/shared-types";
import { Field, Section, Segmented, TextInput, ToggleRow } from "./ui";

const DEFAULT_CONFIG: MediaStorageConfig = {
  adapters: [
    {
      kind: "github",
      label: "GitHub Media (Primary)",
      repo: "bugsfreeweb/HoichoiMedia",
      branch: "main",
      mediaPath: "media/",
      enabled: true,
    },
  ],
  mode: "failover",
  purge_local_after_upload: false,
  retention_months: 1,
  cleanup_enabled: false,
};

export function MediaStorageSection({
  initialJson,
  onSave,
}: {
  initialJson?: string | null;
  onSave: (jsonStr: string) => Promise<void>;
}) {
  const [cfg, setCfg] = useState<MediaStorageConfig>(() => {
    if (!initialJson) return DEFAULT_CONFIG;
    try {
      const parsed = JSON.parse(initialJson) as MediaStorageConfig;
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        adapters: Array.isArray(parsed.adapters) && parsed.adapters.length > 0 ? parsed.adapters : DEFAULT_CONFIG.adapters,
      };
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateAdapter = (index: number, patch: Partial<MediaStorageAdapterConfig>) => {
    setCfg((prev) => {
      const nextAdapters = [...prev.adapters];
      nextAdapters[index] = { ...nextAdapters[index]!, ...patch };
      return { ...prev, adapters: nextAdapters };
    });
  };

  const addGithubRepo = () => {
    setCfg((prev) => ({
      ...prev,
      adapters: [
        ...prev.adapters,
        {
          kind: "github",
          label: `GitHub Media Repo ${prev.adapters.length + 1}`,
          repo: "bugsfreeweb/HoichoiMedia2",
          branch: "main",
          mediaPath: "media/",
          enabled: true,
        },
      ],
    }));
  };

  const removeAdapter = (index: number) => {
    setCfg((prev) => ({
      ...prev,
      adapters: prev.adapters.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await onSave(JSON.stringify(cfg));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Section
        title="মাল্টি-রিপোজিটরি মিডিয়া স্টোরেজ পলিসি"
        kicker="MEDIA STORAGE & CDN DECOUPLING"
        hint="আপনার অ্যাপের মিডিয়া ফাইলগুলোকে অ্যাপ থেকে সম্পূর্ণ আলাদা করে একাধিক পাবলিক GitHub রিপোজিটরিতে (যেমন bugsfreeweb/HoichoiMedia) সংসংরক্ষণ করুন।"
      >
        <Field
          label="ডিস্ট্রিবিউশন মোড (DISTRIBUTION MODE)"
          hint="একাধিক স্টোরেজ রিপোজিটরিতে মিডিয়া কীভাবে ফাইল বন্টন করা হবে তা চয়ন করুন।"
        >
          <Segmented<MediaStorageMode>
            value={cfg.mode ?? "failover"}
            options={[
              { value: "failover", label: "Failover (ব্যাকআপ চেইন)" },
              { value: "shard", label: "Shard (রিপো জুড়ে সমবন্টন)" },
              { value: "mirror", label: "Mirror (সব রিপোতে হুবহু কপি)" },
            ]}
            onChange={(m) => setCfg((prev) => ({ ...prev, mode: m }))}
          />
        </Field>

        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="font-sans-bn text-[14px] font-bold text-ink">
              কনফিগার করা মিডিয়া রিপোজিটরি ও অবজেক্ট স্টোর ({cfg.adapters.length})
            </h4>
            <button
              type="button"
              onClick={addGithubRepo}
              className="rounded border border-ink/30 bg-paper px-3 py-1 text-[12px] font-bold text-ink hover:bg-ink hover:text-paper"
            >
              + নতুন GitHub মিডিয়া রিপো যোগ করুন
            </button>
          </div>

          {cfg.adapters.map((ad, idx) => (
            <div key={idx} className="space-y-3 rounded-lg border border-ink/20 bg-paper p-4">
              <div className="flex items-center justify-between gap-2 border-b border-ink/10 pb-2">
                <span className="font-mono-x text-[11px] font-bold uppercase text-alizarin">
                  #{idx + 1} {ad.kind === "github" ? "GitHub Media Repository" : `S3 (${ad.provider})`}
                </span>
                <div className="flex items-center gap-2">
                  <ToggleRow
                    on={ad.enabled}
                    onChange={(v) => updateAdapter(idx, { enabled: v })}
                    label={ad.enabled ? "সক্রিয়" : "নিষ্ক্রিয়"}
                  />
                  {cfg.adapters.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAdapter(idx)}
                      className="text-[11px] font-bold text-rose-600 hover:underline"
                    >
                      মুছে ফেলুন
                    </button>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="লেবেল (LABEL)">
                  <TextInput
                    value={ad.label}
                    onChange={(e) => updateAdapter(idx, { label: e.target.value })}
                  />
                </Field>

                {ad.kind === "github" && (
                  <Field label="GitHub রিপোজিটরি (OWNER/REPO)">
                    <TextInput
                      value={ad.repo ?? ""}
                      placeholder="bugsfreeweb/HoichoiMedia"
                      onChange={(e) => updateAdapter(idx, { repo: e.target.value })}
                    />
                  </Field>
                )}

                {ad.kind === "github" && (
                  <Field label="ব্রাঞ্চ (BRANCH)">
                    <TextInput
                      value={ad.branch ?? "main"}
                      onChange={(e) => updateAdapter(idx, { branch: e.target.value })}
                    />
                  </Field>
                )}

                {ad.kind === "github" && (
                  <Field label="CDN Base URL (ঐচ্ছিক কাস্টম সিডিএন)">
                    <TextInput
                      value={ad.cdnBase ?? ""}
                      placeholder="https://cdn.jsdelivr.net/gh/owner/repo@main"
                      onChange={(e) => updateAdapter(idx, { cdnBase: e.target.value })}
                    />
                  </Field>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3 border-t border-ink/10 pt-4">
          <ToggleRow
            on={cfg.purge_local_after_upload}
            onChange={(v) => setCfg((prev) => ({ ...prev, purge_local_after_upload: v }))}
            label="রিমোট আপলোডের পর লোকাল কপি মুছে ফেলুন (Purge local disk copy)"
            hint="সফলভাবে GitHub/S3 তে ফাইল ওঠার পর লোকাল ডিস্কের জায়গা খালি করতে সাহায্য করবে।"
          />

          <ToggleRow
            on={cfg.cleanup_enabled}
            onChange={(v) => setCfg((prev) => ({ ...prev, cleanup_enabled: v }))}
            label="মাসে একবার পুরোনো মিডিয়া মোটামুটি পরিচ্ছন্নকরণ (Scheduled Remote Cleanup)"
            hint="কনফিগার করা মাসের চেয়ে পুরোনো ফাইল স্বয়ংক্রিয়ভাবে মুছে যাবে।"
          />
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded border border-ink bg-ink px-5 py-2 text-[13px] font-bold text-paper transition hover:bg-alizarin disabled:opacity-50"
          >
            {saving ? "সংরক্ষণ হচ্ছে..." : saved ? "✓ সংরক্ষিত হয়েছে" : "মিডিয়া কনফিগ সংরক্ষণ করুন"}
          </button>
        </div>
      </Section>
    </div>
  );
}
