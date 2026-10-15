"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { Palette } from "lucide-react";
import type { SiteSettings } from "@/lib/types";
import { loc } from "@/lib/types";
import { THEMES, themeName, themeTagline } from "@/lib/themes";
import { Card, ColorField, Field, Segmented, Toggle } from "@/app/admin/ui";
import { FitPreview } from "@/components/themes/registry";

const PALETTES: { name: string; colors: SiteSettings["colors"] }[] = [
  {
    name: "হৈচৈ কাগজ",
    colors: { primary: "#d2202c", accent: "#c8f65d", bg: "#f3eee1", surface: "#ffffff", text: "#1a140d" },
  },
  {
    name: "নাইট ডেস্ক",
    colors: { primary: "#d2202c", accent: "#c8f65d", bg: "#050608", surface: "#0c1017", text: "#f3eee1" },
  },
  {
    name: "ব্রেকিং রেড",
    colors: { primary: "#f34f4f", accent: "#ffb454", bg: "#160a0c", surface: "#2a0d12", text: "#f3eee1" },
  },
  {
    name: "প্রেস ব্লু",
    colors: { primary: "#1d4ed8", accent: "#7dd3fc", bg: "#10141b", surface: "#0c1017", text: "#e9e2cf" },
  },
  {
    name: "সকাল",
    colors: { primary: "#5f8f0e", accent: "#d2202c", bg: "#f3eee1", surface: "#ffffff", text: "#1a140d" },
  },
  {
    name: "অ্যাম্বার প্রেস",
    colors: { primary: "#b45309", accent: "#ffb454", bg: "#1a140d", surface: "#241a10", text: "#f3eee1" },
  },
];

function ThemePicker({
  s,
  setS,
}: {
  s: SiteSettings;
  setS: Dispatch<SetStateAction<SiteSettings>>;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const L = loc(s);
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {THEMES.map((tm) => {
        const selected = s.activeTheme === tm.id;
        return (
          <div
            key={tm.id}
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            onMouseEnter={() => setHover(tm.id)}
            onMouseLeave={() => setHover(null)}
            onClick={() => setS((p) => ({ ...p, activeTheme: tm.id }))}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setS((p) => ({ ...p, activeTheme: tm.id }));
              }
            }}
            className={`group cursor-pointer overflow-hidden rounded-2xl border-2 bg-white text-left transition ${
              selected ? "border-[#d2202c] ring-2 ring-[#d2202c]/20" : "border-[#1a140d]/12 hover:border-[#1a140d]/45"
            }`}
          >
            <span className="relative block aspect-[16/10] w-full overflow-hidden bg-[#0a0c10]">
              <FitPreview id={tm.id} s={{ ...s, activeTheme: tm.id }} paused={hover !== tm.id} className="h-full w-full" />
              {selected && (
                <span className="absolute top-2 left-2 rounded-full bg-[#d2202c] px-2 py-0.5 text-[9px] font-bold tracking-[0.16em] text-white uppercase">
                  Active
                </span>
              )}
            </span>
            <span className="block px-3 py-2.5">
              <span className="font-serif-bn block text-[13px] font-extrabold text-[#1a140d]">{themeName(tm, L)}</span>
              <span className="font-mono-x mt-0.5 block text-[9px] tracking-[0.16em] text-[#d2202c] uppercase">{themeTagline(tm, L)}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function DesignTab({
  s,
  setS,
}: {
  s: SiteSettings;
  setS: Dispatch<SetStateAction<SiteSettings>>;
}) {
  const L = loc(s);
  const bn = L === "bn";

  const EFFECTS: { key: keyof SiteSettings["effects"]; label: string; hint: string }[] = [
    { key: "particles", label: bn ? "পার্টিকেল ও ধুলো" : "Particles & dust", hint: bn ? "দৃশ্যে ভাসমান কণা" : "Floating motes rising through the scene" },
    { key: "meteors", label: bn ? "উল্কা" : "Meteors", hint: bn ? "ডার্ক থিমে আলোর রেখা" : "Streaking light across dark themes" },
    { key: "spotlight", label: bn ? "কার্সর স্পটলাইট" : "Cursor spotlight", hint: bn ? "পয়েন্টার-অনুসরণকারী আলো" : "Pointer-following radial light" },
    { key: "tilt", label: "3D tilt / parallax", hint: bn ? "হিরো কার্ড পয়েন্টার ট্র্যাক করে" : "Hero card tracks the pointer in perspective" },
    { key: "marquee", label: bn ? "টিকার মার্কি" : "Ticker marquee", hint: bn ? "চলমান ব্রেকিং টেক্সট স্ট্রিপ" : "Running text strip where the design supports it" },
    { key: "grain", label: bn ? "ফিল্ম গ্রেইন" : "Film grain", hint: bn ? "টেক্সচারের জন্য অ্যানিমেটেড নয়েজ" : "Animated noise overlay for texture" },
    { key: "sound", label: bn ? "অ্যামবিয়েন্ট সাউন্ড" : "Ambient sound", hint: bn ? "ভিজিটর-চালিত WebAudio গুঞ্জন" : "Adds a visitor-toggled WebAudio hum" },
  ];

  return (
    <div className="space-y-5">
      <Card
        title={bn ? "ডিজাইন বেছে নিন" : "Choose a design"}
        desc={bn ? "কার্ডে হোভার করলে অ্যানিমেশন চলবে, ক্লিকে লাইভ রক্ষণাবেক্ষণ ডিজাইন হবে। প্রতিটি ডিজাইন নিচের কপি, রঙ ও টগল মেনে চলে।" : "Hover a card to play its animations, click to make it the live maintenance design. Every design respects the copy, colours and toggles below."}
      >
        <ThemePicker s={s} setS={setS} />
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card
          title={bn ? "ব্র্যান্ড প্যালেট" : "Brand palette"}
          desc={bn ? "CSS ভেরিয়েবল হিসেবে ইনজেক্ট হয় — গ্রেডিয়েন্ট, গ্লো, কাউন্টডাউন ও বোতাম সব অনুসরণ করে।" : "Injected as CSS variables, so gradients, glows, countdowns and buttons all follow."}
          actions={
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1a140d] px-2.5 py-1 text-[11px] font-bold text-[#c8f65d]">
              <Palette size={12} /> {themeName(THEMES.find((x) => x.id === s.activeTheme) ?? THEMES[0], L)}
            </span>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["primary", bn ? "প্রাইমারি" : "Primary"],
                ["accent", bn ? "অ্যাকসেন্ট" : "Accent"],
                ["bg", bn ? "পটভূমি" : "Background"],
                ["surface", bn ? "সারফেস / গ্লাস" : "Surface / glass"],
                ["text", bn ? "টেক্সট" : "Text"],
              ] as const
            ).map(([key, label]) => (
              <ColorField
                key={key}
                label={label}
                value={s.colors[key]}
                onChange={(v) => setS((p) => ({ ...p, colors: { ...p.colors, [key]: v } }))}
              />
            ))}
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-bold text-[#1a140d]">{bn ? "প্রিসেট" : "Presets"}</p>
            <div className="flex flex-wrap gap-2">
              {PALETTES.map((p) => (
                <button
                  key={p.name}
                  onClick={() => setS((prev) => ({ ...prev, colors: p.colors }))}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-[#1a140d]/12 bg-white py-1.5 pr-3 pl-1.5 text-[11px] font-bold text-[#1a140d] transition hover:border-[#1a140d]"
                >
                  <span className="flex">
                    {[p.colors.primary, p.colors.accent, p.colors.bg].map((c) => (
                      <span key={c} className="h-4 w-4 rounded-full ring-1 ring-black/10" style={{ background: c }} />
                    ))}
                  </span>
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          <Card title={bn ? "মোশন ও ইফেক্ট" : "Motion & effects"} desc={bn ? "প্রতিটি ইফেক্ট আলাদাভাবে চালু/বন্ধ করুন — সমর্থিত সব ডিজাইনে প্রযোজ্য।" : "Turn individual effects on or off — they apply to every design that supports them."}>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {EFFECTS.map((fx) => (
                <Toggle
                  key={fx.key}
                  label={fx.label}
                  hint={fx.hint}
                  checked={s.effects[fx.key]}
                  onChange={(v) => setS((p) => ({ ...p, effects: { ...p.effects, [fx.key]: v } }))}
                />
              ))}
            </div>
          </Card>

          <Card title={bn ? "অ্যানিমেশন ইনটেনসিটি" : "Animation intensity"} desc={bn ? "পার্টিকেল সংখ্যা, তারার ঘনত্ব ও মোশনের মাত্রা নির্ধারণ করে।" : "Scales particle counts, star density and motion richness."}>
            <Segmented
              value={s.intensity}
              onChange={(v) => setS((p) => ({ ...p, intensity: v }))}
              options={[
                { id: "subtle", label: bn ? "মৃদু" : "Subtle", hint: "Calm, minimal movement" },
                { id: "balanced", label: bn ? "সুষম" : "Balanced", hint: "Recommended default" },
                { id: "bold", label: bn ? "তীব্র" : "Bold", hint: "Maximum particles & motion" },
              ]}
            />
          </Card>

          <Card title={bn ? "কাউন্টডাউন স্টাইল" : "Countdown style"} desc={bn ? "কাউন্টডাউন কম্পোনেন্ট রেন্ডার করে এমন ডিজাইনে প্রযোজ্য।" : "Applies to designs that render the countdown component."}>
            <div className="space-y-3">
              <Toggle
                label={bn ? "কাউন্টডাউন দেখান" : "Show countdown"}
                hint={bn ? "লঞ্চ / ফিরে আসার তারিখ পর্যন্ত গণনা" : "Counts down to the launch / back-online date"}
                checked={s.countdown.enabled}
                onChange={(v) => setS((p) => ({ ...p, countdown: { ...p.countdown, enabled: v } }))}
              />
              <Segmented
                value={s.countdown.style}
                onChange={(v) => setS((p) => ({ ...p, countdown: { ...p.countdown, style: v } }))}
                options={[
                  { id: "digits", label: bn ? "ডিজিট" : "Glass digits" },
                  { id: "flip", label: bn ? "ফ্লিপ" : "Split-flap 3D" },
                  { id: "rings", label: bn ? "রিং" : "Progress rings" },
                  { id: "inline", label: bn ? "ইনলাইন" : "Mono inline" },
                ]}
              />
            </div>
          </Card>

          <Card title={bn ? "পেজ ক্রোম" : "Page chrome"} desc={bn ? "রক্ষণাবেক্ষণ পেজের উপরে দেখানো ছোট ইউটিলিটি।" : "Small utilities shown on top of the maintenance page."}>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <Toggle
                label={bn ? "ভাসমান ডিজাইন ডক" : "Floating design dock"}
                hint={bn ? "ভিজিটররা ডিজাইন বদলাতে ও অ্যাডমিনে যেতে পারে" : "Lets visitors switch designs & reach the admin"}
                checked={s.ui.showDock}
                onChange={(v) => setS((p) => ({ ...p, ui: { ...p.ui, showDock: v } }))}
              />
              <Toggle
                label={bn ? "ডিজাইন ব্যাজ" : "Design badge"}
                hint={bn ? "কোন মকআপ লাইভ আছে তা দেখায়" : "Shows which mockup is currently live"}
                checked={s.ui.showThemeBadge}
                onChange={(v) => setS((p) => ({ ...p, ui: { ...p.ui, showThemeBadge: v } }))}
              />
            </div>
            <div className="mt-3">
              <Field label={bn ? "পেজের ভাষা" : "Page language"}>
                <Segmented
                  size="sm"
                  value={s.ui.language}
                  onChange={(v) => setS((p) => ({ ...p, ui: { ...p.ui, language: v } }))}
                  options={[
                    { id: "bn", label: "বাংলা" },
                    { id: "en", label: "English" },
                  ]}
                />
              </Field>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
