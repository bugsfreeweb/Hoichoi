"use client";

import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { Field, Section, ToggleRow } from "./ui";
import { useSettings } from "./state";
import type { LiveThemeKey } from "@hoichoi/shared-types";

const THEMES: Array<{
  key: LiveThemeKey;
  no: string;
  bn: string;
  en: string;
  hint: string;
  features: string;
  accent: string;
}> = [
  { key: "stage", no: "০১", bn: "মঞ্চ", en: "Stage Takeover", hint: "বড় ঘটনার জন্য পূর্ণাঙ্গ লাইভ মঞ্চ", features: "ভিডিও · স্কোর · আপডেট · রিঅ্যাকশন", accent: "#d2202c" },
  { key: "broadsheet", no: "০২", bn: "ব্রডশিট", en: "Editorial Broadsheet", hint: "সম্পাদকীয়, সংবাদ ও পাঠকের মতামত", features: "সম্পাদকীয় লেআউট · পোল · পাঠকের মত", accent: "#0b7c72" },
  { key: "scoreboard", no: "০৩", bn: "স্কোরবোর্ড", en: "Data-first Scoreboard", hint: "ফলাফল ও লাইভ ডেটাকে সামনে রাখে", features: "স্কোর · মেট্রিক · আপডেট · এনগেজমেন্ট", accent: "#5f8f0e" },
  { key: "timeline", no: "০৪", bn: "টাইমলাইন", en: "Live Blog Timeline", hint: "সময়ের ধারায় যাচাইকৃত ঘটনাপ্রবাহ", features: "স্টিকি ভিডিও · গুরুত্বপূর্ণ মুহূর্ত · আপডেট", accent: "#2563eb" },
  { key: "compact", no: "০৫", bn: "স্ট্রিপ", en: "Compact Strip", hint: "হোমপেজের জন্য সংক্ষিপ্ত লাইভ কার্ড", features: "কমপ্যাক্ট ভিডিও · স্কোর · সর্বশেষ আপডেট", accent: "#b45309" },
  { key: "studio", no: "০৬", bn: "স্টুডিও", en: "TV Studio", hint: "একাধিক সম্প্রচার-চ্যানেলের ডার্ক স্টুডিও", features: "চ্যানেল সুইচার · লাইভ চ্যাট · স্কোর ব্যান্ড", accent: "#111827" },
];

export function LiveEventsSettings({ eventCount }: { eventCount: number }) {
  const { cfg, setCfg } = useSettings();
  const live = cfg.live_events;
  const patch = <K extends keyof typeof live>(key: K, value: (typeof live)[K]) =>
    setCfg((current) => ({ ...current, live_events: { ...current.live_events, [key]: value } }));

  return (
    <div className="space-y-6">
      <Section
        kicker="Live events"
        title="লাইভ ইভেন্টের গ্লোবাল সেটিংস"
        hint="এই ডিফল্ট থিম ও অভিজ্ঞতা সব ইভেন্টে প্রযোজ্য। কোনো ইভেন্টে আলাদা থিম বেছে নিলে সেটি শুধু ওই ইভেন্টে প্রযোজ্য হবে।"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border border-ink/15 bg-paper px-4 py-3">
          <p className="text-[12.5px] text-ink-soft">
            সংরক্ষিত লাইভ ইভেন্ট: <b className="text-ink">{eventCount}</b> · কোনো নমুনা বা ডেমো ইভেন্ট দেখানো হয় না।
          </p>
          <Link href="/admin/live" className="inline-flex items-center gap-1.5 border border-ink/25 px-3 py-2 text-[12px] font-bold text-ink hover:border-ink">
            ইভেন্ট পরিচালনা <ArrowUpRight size={13} />
          </Link>
        </div>

        <div>
          <div className="mb-3">
            <h4 className="text-[13px] font-bold text-ink">গ্লোবাল ডিফল্ট থিম</h4>
            <p className="mt-1 text-[11.5px] text-ink-soft">ইভেন্টের থিম “সাইটের ডিফল্ট” থাকলে এই ডিজাইনটি ব্যবহৃত হবে।</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {THEMES.map((theme) => {
              const active = live.default_theme === theme.key;
              return (
                <button
                  key={theme.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => patch("default_theme", theme.key)}
                  className={`overflow-hidden border text-left transition-colors ${active ? "border-ink bg-paper shadow-[3px_3px_0_0_var(--color-ink)]" : "border-ink/15 bg-paper-deep hover:border-ink/45"}`}
                >
                  <div className="flex h-12 items-center gap-1.5 border-b border-ink/10 px-3" aria-hidden="true">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: theme.accent }} />
                    <span className="h-1.5 w-12 rounded-full bg-ink/15" />
                    <span className="ml-auto h-4 w-10 rounded-sm" style={{ backgroundColor: `${theme.accent}24` }} />
                    <span className="h-4 w-6 rounded-sm" style={{ backgroundColor: `${theme.accent}55` }} />
                  </div>
                  <span className="block p-3.5">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-mono-x text-[9px] tracking-[0.16em] text-alizarin">{theme.no} · {theme.en}</span>
                      {active && <Check size={14} className="shrink-0 text-lime" aria-label="নির্বাচিত" />}
                    </span>
                    <span className="mt-1 block font-serif-bn text-[16px] font-extrabold text-ink">{theme.bn}</span>
                    <span className="mt-1 block text-[11.5px] leading-relaxed text-ink-soft">{theme.hint}</span>
                    <span className="mt-2 block font-mono-x text-[9px] leading-relaxed text-ink-soft/80">{theme.features}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {eventCount === 0 && (
            <p className="mt-3 border-l-2 border-amberx px-3 py-2 text-[11.5px] text-ink-soft">
              আসল ইভেন্ট তৈরি হলে এখানে সেটির তথ্য দিয়ে প্রিভিউ দেখা যাবে। এখন কোনো কল্পিত শিরোনাম বা ভিডিও ব্যবহার করা হচ্ছে না।
            </p>
          )}
        </div>
      </Section>

      <Section kicker="Reader experience" title="রিডার অভিজ্ঞতা ও মডারেশন">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="লাইভ ডেটা রিফ্রেশ (৪–৬০ সেকেন্ড)">
            <input
              type="number"
              min={4}
              max={60}
              value={live.refresh_seconds}
              onChange={(event) => patch("refresh_seconds", Math.min(60, Math.max(4, Number(event.target.value) || 8)))}
              className="w-full border border-ink/30 bg-paper px-3 py-2 text-[13px] text-ink outline-none focus:border-alizarin"
            />
          </Field>
          <Field label="লাইভ টিকারের লেবেল">
            <input
              maxLength={60}
              value={live.ticker_label}
              onChange={(event) => patch("ticker_label", event.target.value)}
              className="w-full border border-ink/30 bg-paper px-3 py-2 text-[13px] text-ink outline-none focus:border-alizarin"
            />
          </Field>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <ToggleRow
            on={live.floating_player}
            onChange={(value) => patch("floating_player", value)}
            label="ভাসমান মিনি প্লেয়ার"
            hint="ভিডিও স্ক্রল করে পর্দার বাইরে গেলে প্লেয়ারটি কোণে থাকবে।"
          />
          <ToggleRow
            on={live.auto_moderation}
            onChange={(value) => patch("auto_moderation", value)}
            label="স্বয়ংক্রিয় মন্তব্য পর্যালোচনা"
            hint="নিষিদ্ধ শব্দযুক্ত মন্তব্য প্রকাশের আগে রিভিউতে যাবে।"
          />
        </div>
        <Field label="পর্যালোচনার জন্য নিষিদ্ধ শব্দ" hint="কমা বা নতুন লাইনে আলাদা করুন।">
          <textarea
            rows={3}
            value={live.banned_words.join(", ")}
            onChange={(event) => patch("banned_words", event.target.value.split(/[,\n]/).map((word) => word.trim()).filter(Boolean).slice(0, 100))}
            className="w-full border border-ink/30 bg-paper px-3 py-2 text-[13px] leading-relaxed text-ink outline-none focus:border-alizarin"
          />
        </Field>
      </Section>
    </div>
  );
}
