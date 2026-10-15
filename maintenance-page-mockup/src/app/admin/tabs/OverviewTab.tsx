"use client";

import type { Dispatch, SetStateAction } from "react";
import { Activity, Eye, Mail, MessageSquare, MousePointerClick, Users } from "lucide-react";
import type { SiteSettings } from "@/lib/types";
import { bnNum, loc } from "@/lib/types";
import type { Stats } from "@/lib/store";
import { THEMES, MODES, themeName } from "@/lib/themes";
import { Card, Field, Segmented, Slider, StatCard, TextInput, toLocalInput } from "@/app/admin/ui";

export function OverviewTab({
  s,
  setS,
  stats,
}: {
  s: SiteSettings;
  setS: Dispatch<SetStateAction<SiteSettings>>;
  stats: Stats;
}) {
  const L = loc(s);
  const bn = L === "bn";
  const peak = Math.max(1, ...stats.series.map((d) => d.views));
  const themeTotal = Math.max(1, stats.byTheme.reduce((a, b) => a + b.views, 0));
  const deviceTotal = Math.max(1, stats.byDevice.reduce((a, b) => a + b.views, 0));

  return (
    <div className="space-y-5">
      {/* desk metric strip */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label={bn ? "আজকের ভিউ" : "Views today"} value={bnNum(stats.todayViews, L)} sub={`${bnNum(stats.weekViews, L)} ${bn ? "গত ৭ দিনে" : "in the last 7 days"}`} tone="slate" />
        <StatCard label={bn ? "মোট ভিউ" : "Total views"} value={bnNum(stats.totalViews, L)} sub={bn ? "সব সময়, ভিজিটর পেজ" : "all time, visitor page only"} tone="violet" />
        <StatCard label={bn ? "সাবস্ক্রাইবার" : "Subscribers"} value={bnNum(stats.subscribers, L)} sub={`${bnNum(stats.conversion, L)}% conversion`} tone="emerald" />
        <StatCard label={bn ? "বার্তা" : "Messages"} value={bnNum(stats.messages, L)} sub={`${bnNum(stats.unreadMessages, L)} ${bn ? "অপঠিত" : "unread"}`} tone="amber" />
        <StatCard
          label={bn ? "বর্তমান ডিজাইন" : "Current design"}
          value={themeName(THEMES.find((t) => t.id === s.activeTheme) ?? THEMES[0], L)}
          sub={`${s.mode} · ${s.intensity}`}
        />
      </div>

      {/* hoichoi newsroom strip */}
      <Card title={bn ? "নিউজরুম সংখ্যা" : "Newsroom numbers"} desc={bn ? "প্রথম পাতার লাইভ গ্রাফে যা দেখা যায় — ডেস্ক থেকে সম্পাদনাযোগ্য।" : "What the front-page live graph shows — editable from the Newsroom tab."}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { v: s.hoichoi.stats.collected, l: bn ? "সংগৃহীত রেকর্ড" : "Collected", c: "#5f8f0e" },
            { v: s.hoichoi.stats.published, l: bn ? "প্রকাশিত প্রতিবেদন" : "Published", c: "#2563eb" },
            { v: s.hoichoi.stats.duplicates, l: bn ? "ডুপ্লিকেট চিহ্নিত" : "Duplicates", c: "#b45309" },
            { v: s.hoichoi.stats.comments, l: bn ? "অনুমোদিত মন্তব্য" : "Comments", c: "#be123c" },
          ].map((m) => (
            <div key={m.l} className="rounded-xl border-2 border-[#1a140d]/10 bg-[#f3eee1]/60 p-3 text-center">
              <p className="font-serif-bn hoi-tnum text-2xl font-extrabold" style={{ color: m.c }}>{bnNum(m.v, L)}</p>
              <p className="mt-1 text-[11px] font-bold text-[#6b6250]">{m.l}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(
            [
              ["turso", "TURSO"],
              ["api", "API"],
              ["collector", bn ? "কালেক্টর" : "Collector"],
            ] as const
          ).map(([key, label]) => {
            const st = s.hoichoi[key];
            return (
              <span key={key} className="font-mono-x inline-flex items-center gap-1.5 rounded-full border border-[#1a140d]/15 bg-white px-2.5 py-1 text-[10px] font-bold text-[#1a140d]/70">
                <span className={`h-1.5 w-1.5 rounded-full ${st === "live" ? "bg-[#5f8f0e]" : st === "checking" ? "bg-[#ffb454] animate-pulse" : "bg-[#d2202c]"}`} />
                {label}: {st}
              </span>
            );
          })}
          <span className="font-mono-x ml-auto text-[10px] text-[#6b6250]">
            {bn ? "সর্বশেষ রান" : "last run"}: {s.hoichoi.lastRun}
          </span>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title={bn ? "ভিজিটর ট্রাফিক — গত ১৪ দিন" : "Visitor traffic — last 14 days"}
          desc={bn ? "রক্ষণাবেক্ষণ পেজের প্রতিটি ভিউ লগ হয় — তখন কোন ডিজাইন লাইভ ছিলসহ।" : "Every view of the maintenance page is logged with the design that was live at the time."}
          actions={
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1a140d] px-2.5 py-1 text-[11px] font-bold text-[#c8f65d]">
              <Activity size={12} /> live
            </span>
          }
        >
          <div className="flex h-44 items-end gap-1.5">
            {stats.series.map((d) => (
              <div key={d.day} className="group relative flex flex-1 flex-col items-center justify-end gap-2">
                <span className="font-mono-x pointer-events-none absolute -top-1 rounded-md bg-[#1a140d] px-2 py-1 text-[10px] text-[#f3eee1] opacity-0 transition group-hover:opacity-100">
                  {d.views} views · {d.subs} subs
                </span>
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-[#1a140d] to-[#6b6250] transition-all group-hover:from-[#d2202c] group-hover:to-[#ff6b6b]"
                  style={{ height: `${Math.max(3, (d.views / peak) * 100)}%` }}
                />
                {d.subs > 0 && (
                  <div
                    className="absolute bottom-0 w-full rounded-t-md bg-[#5f8f0e]"
                    style={{ height: `${Math.max(2, (d.subs / peak) * 100)}%` }}
                  />
                )}
                <span className="font-mono-x text-[9px] text-[#6b6250]">{d.day.slice(8)}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-5">
          <Card title={bn ? "ডিজাইন অনুযায়ী ট্রাফিক" : "Traffic by design"} desc={bn ? "ভিজিটররা আসলে কোন মকআপ দেখেছে।" : "Which mockup visitors actually saw."}>
            <div className="space-y-3">
              {stats.byTheme.length === 0 && <p className="text-xs text-[#6b6250]">{bn ? "এখনও ট্রাফিক রেকর্ড হয়নি।" : "No traffic recorded yet."}</p>}
              {stats.byTheme.map((row) => {
                const meta = THEMES.find((t) => t.id === row.theme);
                return (
                  <div key={row.theme}>
                    <div className="mb-1 flex items-center justify-between text-[11px]">
                      <span className="font-bold text-[#1a140d]">{meta ? themeName(meta, L) : row.theme}</span>
                      <span className="font-mono-x text-[#6b6250]">{bnNum(row.views, L)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#1a140d]/8">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(row.views / themeTotal) * 100}%`,
                          background: `linear-gradient(90deg, ${meta?.swatch[1] ?? "#1a140d"}, ${meta?.swatch[2] ?? "#6b6250"})`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title={bn ? "ডিভাইস" : "Devices"} desc={bn ? "ভিজিটর বিকন থেকে আনুমানিক বিভাজন।" : "Rough split from the visitor beacon."}>
            <div className="flex gap-2">
              {stats.byDevice.map((d) => (
                <div key={d.device} className="flex-1 rounded-xl border-2 border-[#1a140d]/10 bg-[#f3eee1]/60 px-3 py-2.5 text-center">
                  <p className="font-mono-x text-[10px] tracking-[0.18em] text-[#6b6250] uppercase">{d.device}</p>
                  <p className="font-serif-bn mt-1 text-sm font-extrabold text-[#1a140d]">{bnNum(d.views, L)}</p>
                  <p className="font-mono-x text-[10px] text-[#6b6250]">{Math.round((d.views / deviceTotal) * 100)}%</p>
                </div>
              ))}
              {stats.byDevice.length === 0 && <p className="text-xs text-[#6b6250]">{bn ? "এখনও তথ্য নেই।" : "No data yet."}</p>}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title={bn ? "লঞ্চ নিয়ন্ত্রণ" : "Launch controls"} desc={bn ? "সবচেয়ে সাধারণ রক্ষণাবেক্ষণ সিদ্ধান্তের দ্রুত সুইচ।" : "Fast switches for the most common maintenance decisions."}>
          <div className="space-y-4">
            <Field label={bn ? "পেজ মোড" : "Page mode"}>
              <Segmented
                value={s.mode}
                onChange={(v) => setS((p) => ({ ...p, mode: v }))}
                options={MODES.map((m) => ({ id: m.id, label: bn ? m.nameBn : m.name, hint: bn ? m.hintBn : m.hint }))}
                size="sm"
              />
            </Field>
            <Field label={bn ? "সক্রিয় ডিজাইন" : "Active design"}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {THEMES.map((tm) => (
                  <button
                    key={tm.id}
                    onClick={() => setS((p) => ({ ...p, activeTheme: tm.id }))}
                    className={`overflow-hidden rounded-xl border-2 text-left transition ${
                      s.activeTheme === tm.id ? "border-[#d2202c] ring-2 ring-[#d2202c]/20" : "border-[#1a140d]/12 hover:border-[#1a140d]/40"
                    }`}
                  >
                    <span
                      className="block h-7 w-full"
                      style={{ background: `linear-gradient(135deg, ${tm.swatch[0]}, ${tm.swatch[1]} 55%, ${tm.swatch[2]})` }}
                    />
                    <span className="block px-2 py-1.5 text-[10px] font-bold text-[#1a140d]">{themeName(tm, L)}</span>
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={bn ? "ফিরছি" : "Back online at"} hint={bn ? "স্থানীয় সময়" : "local time"}>
                <TextInput
                  type="datetime-local"
                  value={toLocalInput(s.countdown.target)}
                  onChange={(v) => v && setS((p) => ({ ...p, countdown: { ...p.countdown, target: new Date(v).toISOString() } }))}
                />
              </Field>
              <Field label={bn ? "ভাষা" : "Language"}>
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
            {s.progress.enabled && (
              <Slider
                label={bn ? s.progress.labelBn : s.progress.label}
                value={s.progress.value}
                onChange={(v) => setS((p) => ({ ...p, progress: { ...p.progress, value: v } }))}
              />
            )}
          </div>
        </Card>

        <Card title={bn ? "সর্বশেষ ভিজিট" : "Latest visits"} desc={bn ? "ভিজিটর পেজের নতুন বিকন ইভেন্ট।" : "Newest beacon events from the visitor page."}>
          {stats.recent.length === 0 ? (
            <p className="text-xs text-[#6b6250]">
              {bn ? "এখনও কিছু লগ হয়নি — ভিজিটর পেজ খুললেই এখানে দেখা যাবে।" : "Nothing logged yet — open the visitor page and it will appear here instantly."}
            </p>
          ) : (
            <ul className="divide-y divide-[#1a140d]/8">
              {stats.recent.map((v) => (
                <li key={v.id} className="flex items-center gap-3 py-2.5 text-xs">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#1a140d] text-[#c8f65d]">
                    {v.device === "mobile" ? <MousePointerClick size={13} /> : <Eye size={13} />}
                  </span>
                  <span className="font-bold text-[#1a140d]">{THEMES.find((x) => x.id === v.theme) ? themeName(THEMES.find((x) => x.id === v.theme)!, L) : v.theme}</span>
                  <span className="font-mono-x text-[#6b6250]">{v.path}</span>
                  <span className="font-mono-x ml-auto text-[#6b6250]">
                    {new Date(v.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3 border-t-2 border-[#1a140d]/8 pt-4">
            <div className="flex items-center gap-2.5 rounded-xl bg-[#f3eee1]/70 px-3 py-2.5">
              <Users size={15} className="text-[#6b6250]" />
              <div>
                <p className="font-mono-x text-[10px] tracking-[0.18em] text-[#6b6250] uppercase">{bn ? "পাঠক" : "Audience"}</p>
                <p className="text-xs font-bold text-[#1a140d]">{bnNum(stats.subscribers, L)} {bn ? "সাবস্ক্রাইবড" : "subscribed"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl bg-[#f3eee1]/70 px-3 py-2.5">
              <MessageSquare size={15} className="text-[#6b6250]" />
              <div>
                <p className="font-mono-x text-[10px] tracking-[0.18em] text-[#6b6250] uppercase">{bn ? "ইনবক্স" : "Inbox"}</p>
                <p className="text-xs font-bold text-[#1a140d]">{bnNum(stats.unreadMessages, L)} {bn ? "অপঠিত" : "unread"}</p>
              </div>
            </div>
            <div className="col-span-2 flex items-center gap-2.5 rounded-xl bg-[#f3eee1]/70 px-3 py-2.5">
              <Mail size={15} className="text-[#6b6250]" />
              <p className="text-xs text-[#6b6250]">
                {bn ? "নিউজলেটার" : "Newsletter"} <span className="font-bold text-[#1a140d]">{s.newsletter.enabled ? (bn ? "চালু" : "on") : (bn ? "বন্ধ" : "off")}</span>{" · "}
                {bn ? "যোগাযোগ ফর্ম" : "contact form"} <span className="font-bold text-[#1a140d]">{s.contact.formEnabled ? (bn ? "চালু" : "on") : (bn ? "বন্ধ" : "off")}</span>
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
