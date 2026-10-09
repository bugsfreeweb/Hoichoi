"use client";

import { Field, Section, Segmented, ToggleRow } from "./ui";
import { useSettings } from "./state";

const GRID_ITEMS: Array<{ key: "show_hero" | "show_live_graph" | "show_categories" | "show_ads" | "show_rewrite_engine" | "show_footer" | "ai_hero_images"; label: string; hint: string }> = [
  { key: "show_hero", label: "হিরো সেকশন", hint: "শীর্ষের বড় ক্যাটাগরি-কার্ড" },
  { key: "show_live_graph", label: "Live Analytics গ্রাফ", hint: "প্রবন্ধ-card-এর উপরে ট্রেন্ডগ্রাফ" },
  { key: "show_categories", label: "বিভাগ স্ট্রিপ", hint: "হোমপেজ গ্রিডের আগে ক্যাটাগরি-বোতাম" },
  { key: "show_ads", label: "বিজ্ঞাপন স্লট", hint: "সব ad slot জায়গা" },
  { key: "show_rewrite_engine", label: "রিরাইট ইঞ্জিন ব্যাজ", hint: "আর্টিকেল পেজে AI Engine-লেবেল" },
  { key: "show_footer", label: "ফুটার", hint: "নিচের ফুটার প্যানেল" },
  { key: "ai_hero_images", label: "AI Fallback Image", hint: "মিডিয়া ছাড়া পোস্টে AI হিরো ছবি (Gemini)" },
];

const PAGE_PRESETS = [12, 14, 16, 20];

/** পাবলিক সাইটে কতগুলো আইটেম এক পৃষ্ঠায়/সেকশনে দেখাবে। */
export function VisibilitySection() {
  const { cfg, setCfg } = useSettings();
  const patch = <K extends keyof typeof cfg>(k: K, v: (typeof cfg)[K]) =>
    setCfg((c) => ({ ...c, [k]: v }));

  return (
    <div className="space-y-6">
      <Section kicker="Sections" title="সেকশন গোপন/প্রদর্শন" hint="কোন সেকশন পাবলিক সাইটে দেখাবে — ডেস্কটপ Settings-এও একই কনফিগ (app_config_json) সম্পাদনা করা যায়।">
        <div className="grid gap-3 sm:grid-cols-2">
          {GRID_ITEMS.map((v) => (
            <ToggleRow
              key={v.key}
              on={cfg[v.key]}
              onChange={(next) => patch(v.key, next)}
              label={v.label}
              hint={v.hint}
            />
          ))}
        </div>
      </Section>

      <Section danger kicker="Maintenance mode" title="মেইনটেন্যান্স মোড" hint="চালু করলে সাধারণ দর্শকরা নিচের 'রক্ষণাবেক্ষণ' ট্যাবে সাজানো মেইনটেন্যান্স পেজ দেখবে; লগ-ইন করা অ্যাডমিনদের জন্য সাইট খোলা থাকবে ও সার্চ-ইঞ্জিন থেকে ডি-ইনডেক্স থাকবে।">
        <ToggleRow
          accent="alizarin"
          on={cfg.maintenance_mode}
          onChange={(next) => patch("maintenance_mode", next)}
          label={cfg.maintenance_mode ? "মেইনটেন্যান্স চলছে" : "মেইনটেন্যান্স মোড"}
          hint="সঙ্গে 'রক্ষণাবেক্ষণ' ট্যাবে কনফিগ সম্পাদনা করুন।"
        />
      </Section>

      <Section kicker="Pagination & limits" title="দৃশ্যমানতা সংখ্যা" hint="হোম, আর্টিকেল ও মন্তব্যের 'জনপ্রতি' হিসাব — ব্যক্তিগত পছন্দ অনুযায়ী ১২/১৪/১৬/২০ বা কাস্টম।">
        <Field label="হোমপেজে কতটি পোস্ট (প্রতি পৃষ্ঠা)" hint="হোমপেজের নিউজফিড গ্রিড — ডিফল্ট ১২।">
          <div className="flex flex-wrap items-center gap-2">
            {PAGE_PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => patch("home_post_count", n)}
                className={`rounded-lg px-4 py-2 text-[13px] font-bold transition-all ${
                  cfg.home_post_count === n ? "bg-ink text-paper" : "border border-ink/20 bg-paper text-ink-soft hover:text-ink"
                }`}
              >
                {n}
              </button>
            ))}
            <label className="ml-1 flex items-center gap-2">
              <span className="font-mono-x text-[10px] tracking-[0.16em] text-ink-soft uppercase">কাস্টম</span>
              <input
                type="number"
                min={4}
                max={50}
                className="w-20 rounded-lg border border-ink/30 bg-paper px-3 py-2 text-[13px] outline-none focus:border-alizarin"
                value={cfg.home_post_count}
                onChange={(e) => patch("home_post_count", Math.max(4, Number(e.target.value) || 12))}
              />
            </label>
          </div>
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="আর্টিকেল পেজে 'একই বিভাগ' পোস্ট" hint="পোস্টের নিচে দেখানো সম্পর্কিত পোস্টের সংখ্যা।">
            <input
              type="number"
              min={0}
              max={12}
              className="w-full rounded-lg border border-ink/30 bg-paper px-3 py-2 text-[13px] outline-none focus:border-alizarin"
              value={cfg.detail_similar_count}
              onChange={(e) => patch("detail_similar_count", Math.max(0, Number(e.target.value) || 0))}
            />
          </Field>
          <Field label="পোস্টে 'প্রথমে দেখানো' মন্তব্য" hint="অনুমোদিত মন্তব্যের তালিকা একবারে কতগুলো দেখাবে।">
            <input
              type="number"
              min={0}
              max={30}
              className="w-full rounded-lg border border-ink/30 bg-paper px-3 py-2 text-[13px] outline-none focus:border-alizarin"
              value={cfg.comments_show_count}
              onChange={(e) => patch("comments_show_count", Math.max(0, Number(e.target.value) || 0))}
            />
          </Field>
        </div>
      </Section>

      <Section kicker="Theme & graph" title="থিম ও লাইভ গ্রাফ" hint="ডিফল্ট থিম হাইড্রেশনের আগে বসে; surge থ্রেশহোল্ড লাইভ গ্রাফ 'হঠাৎ ঢেউ' চিনতে ব্যবহার করে।">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="ডিফল্ট থিম">
            <Segmented<"light" | "dark">
              value={cfg.theme_default}
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
              onChange={(v) => patch("theme_default", v)}
            />
          </Field>
          <Field label="Surge threshold">
            <input
              type="number"
              min={1}
              className="w-full rounded-lg border border-ink/30 bg-paper px-3 py-2 text-[13px] outline-none focus:border-alizarin"
              value={cfg.surge_threshold}
              onChange={(e) => patch("surge_threshold", Math.max(1, Number(e.target.value) || 1))}
            />
          </Field>
        </div>
      </Section>
    </div>
  );
}