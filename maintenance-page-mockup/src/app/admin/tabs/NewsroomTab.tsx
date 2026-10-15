"use client";

import type { Dispatch, SetStateAction } from "react";
import type { HoichoiStatus, SiteSettings } from "@/lib/types";
import { HOICHOI_PIPELINE, PIPELINE_STRIP, loc } from "@/lib/types";
import { Card, Field, Segmented, TextArea, TextInput, Toggle, fromLocalInput, toLocalInput } from "@/app/admin/ui";

const STATUS_OPTS: { id: HoichoiStatus; label: string }[] = [
  { id: "live", label: "● Live" },
  { id: "checking", label: "◐ Checking" },
  { id: "down", label: "○ Down" },
];

export function NewsroomTab({
  s,
  setS,
}: {
  s: SiteSettings;
  setS: Dispatch<SetStateAction<SiteSettings>>;
}) {
  const L = loc(s);
  const bn = L === "bn";
  const setH = <K extends keyof SiteSettings["hoichoi"]>(key: K, value: SiteSettings["hoichoi"][K]) =>
    setS((p) => ({ ...p, hoichoi: { ...p.hoichoi, [key]: value } }));

  return (
    <div className="space-y-5">
      <Card
        title={bn ? "সিস্টেম স্ট্যাটাস" : "System status"}
        desc={bn ? "আসল ফ্রন্ট পেজের মতো TURSO / API / কালেক্টর ডট — টার্মিনাল ও স্ট্যাটাস গ্রিডে দেখা যায়।" : "Turso / API / collector dots just like the real front page — shown in the terminal and status grids."}
        actions={
          <span className="font-mono-x rounded-lg bg-[#1a140d] px-2.5 py-1.5 text-[10px] tracking-[0.18em] text-[#c8f65d]">
            GET /api/status · 10s
          </span>
        }
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <Field label="TURSO ডাটাবেস">
            <Segmented size="sm" value={s.hoichoi.turso} onChange={(v) => setH("turso", v)} options={STATUS_OPTS} />
          </Field>
          <Field label={bn ? "পাবলিক ডেটা API" : "Public data API"}>
            <Segmented size="sm" value={s.hoichoi.api} onChange={(v) => setH("api", v)} options={STATUS_OPTS} />
          </Field>
          <Field label={bn ? "ডেস্কটপ কালেক্টর" : "Desktop collector"}>
            <Segmented size="sm" value={s.hoichoi.collector} onChange={(v) => setH("collector", v)} options={STATUS_OPTS} />
          </Field>
        </div>
        <div className="mt-4 max-w-xs">
          <Field label={bn ? "সর্বশেষ নথিভুক্ত রান" : "Last recorded run"} hint="e.g. ১০:৪০ AM">
            <TextInput mono value={s.hoichoi.lastRun} onChange={(v) => setH("lastRun", v)} />
          </Field>
        </div>
        <div className="mt-4 rounded-xl border-2 border-[#1a140d]/10 bg-[#f3eee1]/60 p-4">
          <p className="font-mono-x text-[10px] tracking-[0.3em] text-[#6b6250] uppercase">{PIPELINE_STRIP}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {HOICHOI_PIPELINE.map((p, i) => (
              <div key={p.en} className="rounded-lg border border-[#1a140d]/12 bg-white p-2.5">
                <p className="font-mono-x text-[9px] text-[#d2202c]">0{i + 1}</p>
                <p className="mt-1 text-[12px] font-bold text-[#1a140d]">{bn ? p.bn : p.en}</p>
                <p className="font-mono-x mt-0.5 text-[8px] tracking-[0.12em] text-[#6b6250]">{p.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title={bn ? "নিউজরুম সংখ্যা" : "Newsroom numbers"} desc={bn ? "স্ট্যাট কোয়ার্টেট ও ডেস্ক মেট্রিক স্ট্রিপে দেখা যায়।" : "Shown in the stat quartet and the desk metric strip."}>
          <div className="grid grid-cols-2 gap-4">
            {(
              [
                ["collected", bn ? "সংগৃহীত রেকর্ড" : "Collected"],
                ["published", bn ? "প্রকাশিত প্রতিবেদন" : "Published"],
                ["duplicates", bn ? "ডুপ্লিকেট চিহ্নিত" : "Duplicates"],
                ["comments", bn ? "অনুমোদিত মন্তব্য" : "Comments"],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={label}>
                <TextInput
                  type="number"
                  mono
                  value={String(s.hoichoi.stats[key])}
                  onChange={(v) => setH("stats", { ...s.hoichoi.stats, [key]: Math.max(0, Number(v) || 0) })}
                />
              </Field>
            ))}
          </div>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
            <Toggle label={bn ? "পাইপলাইন" : "Pipeline"} checked={s.hoichoi.showPipeline} onChange={(v) => setH("showPipeline", v)} />
            <Toggle label={bn ? "পরিসংখ্যান" : "Stats"} checked={s.hoichoi.showStats} onChange={(v) => setH("showStats", v)} />
            <Toggle label={bn ? "টিকার" : "Ticker"} checked={s.hoichoi.showTicker} onChange={(v) => setH("showTicker", v)} />
          </div>
        </Card>

        <Card title={bn ? "নির্ধারিত উইন্ডো" : "Scheduled window"} desc={bn ? "নির্ভরযোগ্য রক্ষণাবেক্ষণ: উইন্ডো চলাকালীন সবসময় রক্ষণাবেক্ষণ পেজ, শেষে স্বয়ংক্রিয় লাইভ।" : "Reliable maintenance: always show the maintenance page inside the window, auto-live after."}>
          <div className="space-y-4">
            <Toggle
              label={bn ? "শিডিউল চালু" : "Enable schedule"}
              checked={s.schedule.enabled}
              onChange={(v) => setS((p) => ({ ...p, schedule: { ...p.schedule, enabled: v } }))}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={bn ? "শুরু" : "Start"} hint={bn ? "স্থানীয়" : "local"}>
                <TextInput
                  type="datetime-local"
                  value={toLocalInput(s.schedule.start)}
                  onChange={(v) => v && setS((p) => ({ ...p, schedule: { ...p.schedule, start: fromLocalInput(v) } }))}
                />
              </Field>
              <Field label={bn ? "শেষ" : "End"} hint={bn ? "স্থানীয়" : "local"}>
                <TextInput
                  type="datetime-local"
                  value={toLocalInput(s.schedule.end)}
                  onChange={(v) => v && setS((p) => ({ ...p, schedule: { ...p.schedule, end: fromLocalInput(v) } }))}
                />
              </Field>
            </div>
            <Toggle
              label={bn ? "উইন্ডো শেষে স্বয়ংক্রিয় লাইভ" : "Auto-live after window"}
              hint={bn ? "মোড যাই হোক, শেষ সময় পার হলে ফ্রন্ট পেজ" : "Show the front page after end time regardless of mode"}
              checked={s.schedule.autoLive}
              onChange={(v) => setS((p) => ({ ...p, schedule: { ...p.schedule, autoLive: v } }))}
            />
          </div>
        </Card>
      </div>

      <Card title={bn ? "ব্রেকিং টিকার" : "Breaking ticker"} desc={bn ? "প্রতি লাইনে একটি আইটেম — মার্কি ব্যান্ডে ঘুরবে।" : "One item per line — rotates in the marquee band."}>
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label={bn ? "টিকার (বাংলা)" : "Ticker (BN)"}>
            <TextArea rows={5} value={s.hoichoi.tickerBn.join("\n")} onChange={(v) => setH("tickerBn", v.split("\n").map((x) => x.trim()).filter(Boolean))} />
          </Field>
          <Field label="Ticker (EN)">
            <TextArea rows={5} value={s.hoichoi.ticker.join("\n")} onChange={(v) => setH("ticker", v.split("\n").map((x) => x.trim()).filter(Boolean))} />
          </Field>
        </div>
      </Card>
    </div>
  );
}
