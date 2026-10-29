"use client";

import { useActionState, useState } from "react";
import { CalendarClock, Clapperboard, Link2, LoaderCircle, Plus, Radio, Sparkles, Trash2 } from "lucide-react";
import type { LiveEventRecord, LiveStream, LiveStreamType } from "@hoichoi/db";
import type { LiveThemeKey } from "@hoichoi/shared-types";
import { saveLiveEvent } from "@/app/admin/(console)/live/actions";
import { LIVE_THEMES } from "@/lib/live-themes";

type StreamDraft = LiveStream & { autoLabel: boolean; autoType: boolean };

function dhakaDateInput(value?: string): string {
  const date = value ? new Date(value) : new Date(Date.now() + 60 * 60_000);
  if (!Number.isFinite(date.getTime())) return "";
  return new Date(date.getTime() + 6 * 60 * 60_000).toISOString().slice(0, 16);
}

function slugFromTitle(title: string, fallback: string): string {
  const slug = title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 89)
    .replace(/-+$/g, "");
  return slug.length >= 2 ? slug : `live-event-${fallback}`;
}

function streamTypeFromUrl(value: string): LiveStreamType {
  const url = value.trim().toLowerCase();
  if (/\.m3u8(?:[?#]|$)/.test(url)) return "hls";
  if (/\.mp4(?:[?#]|$)/.test(url)) return "mp4";
  if (/(?:youtube\.com|youtu\.be)/.test(url)) return "youtube";
  return "iframe";
}

function streamLabelFromUrl(value: string, index: number): string {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "").split(".")[0] ?? "";
    return host
      ? host.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
      : `চ্যানেল ${index + 1}`;
  } catch {
    return `চ্যানেল ${index + 1}`;
  }
}

function Check({
  name,
  label,
  hint,
  checked,
}: {
  name: string;
  label: string;
  hint?: string;
  checked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 border border-ink/15 bg-paper p-3 transition-colors hover:border-ink/40">
      <span>
        <span className="block text-[12.5px] font-semibold text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-soft">{hint}</span>}
      </span>
      <input type="checkbox" name={name} defaultChecked={checked} className="mt-0.5 h-4 w-4 accent-alizarin" />
    </label>
  );
}

function SectionHeading({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="mb-5 flex items-start gap-3 border-b border-ink/10 pb-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-ink font-mono-x text-[11px] font-bold text-paper">{number}</span>
      <div>
        <h3 className="font-serif-bn text-[17px] font-extrabold text-ink">{title}</h3>
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-soft">{description}</p>
      </div>
    </div>
  );
}

export function LiveEventForm({ event }: { event?: LiveEventRecord }) {
  const [formState, formAction, pending] = useActionState(saveLiveEvent, null);
  const [title, setTitle] = useState(event?.title ?? "");
  const [slug, setSlug] = useState(event?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(event));
  const [fallbackSlug] = useState(() => Date.now().toString(36));
  const [streamUrl, setStreamUrl] = useState(event?.streamUrl ?? "");
  const [streamType, setStreamType] = useState<LiveStreamType>(event?.streamType ?? "youtube");
  const [streamTypeEdited, setStreamTypeEdited] = useState(Boolean(event));
  const [sources, setSources] = useState<StreamDraft[]>(
    () => event?.streams.map((source) => ({ ...source, autoLabel: false, autoType: false })) ?? [],
  );
  const [summary, setSummary] = useState(event?.summary ?? "");
  const [template, setTemplate] = useState<LiveThemeKey | "auto">(event?.template ?? "auto");
  const input = "field";
  const hiddenSources = sources
    .filter((source) => source.label.trim() || source.url.trim())
    .map((source) => `${source.label.trim()} | ${source.type} | ${source.url.trim()}`)
    .join("\n");
  const hasSignedUrl = [streamUrl, ...sources.map((source) => source.url)]
    .some((url) => /[?&](?:token|signature|sig)=/i.test(url));
  const selectedTheme = template === "auto" ? null : LIVE_THEMES.find((theme) => theme.key === template) ?? null;

  function updateSource(index: number, patch: Partial<StreamDraft>) {
    setSources((current) => current.map((source, sourceIndex) => {
      if (sourceIndex !== index) return source;
      const next = { ...source, ...patch };
      if (patch.url !== undefined) {
        if (next.autoType) next.type = streamTypeFromUrl(patch.url);
        if (next.autoLabel) next.label = streamLabelFromUrl(patch.url, index + 1);
      }
      return next;
    }));
  }

  return (
    <form action={formAction} className="space-y-6">
      {event && <input type="hidden" name="id" value={event.id} />}
      <input type="hidden" name="streams" value={hiddenSources} />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-5">
          <fieldset className="border border-ink/15 bg-card p-4 md:p-6">
            <SectionHeading number="01" title="ইভেন্ট পরিচিতি" description="শিরোনাম লিখুন—ইউআরএল স্লাগ স্বয়ংক্রিয়ভাবে তৈরি হবে, চাইলে পরে সম্পাদনা করুন।" />
            <div className="grid gap-4 md:grid-cols-2">
              <label className="md:col-span-2">
                <span className="field-label">ইভেন্টের শিরোনাম *</span>
                <input
                  name="title"
                  required
                  minLength={2}
                  maxLength={200}
                  value={title}
                  onChange={(inputEvent) => {
                    const value = inputEvent.target.value;
                    setTitle(value);
                    if (!slugEdited) setSlug(slugFromTitle(value, fallbackSlug));
                  }}
                  className={`${input} font-serif-bn !text-[16px] font-bold`}
                  placeholder="যেমন: বাংলাদেশ বনাম ভারত — ফাইনাল"
                />
              </label>
              <label>
                <span className="field-label">ইভেন্ট URL / স্লাগ *</span>
                <div className="relative">
                  <span className="absolute top-1/2 left-3 -translate-y-1/2 font-mono-x text-[12px] text-ink-soft">/live/</span>
                  <input
                    name="slug"
                    required
                    pattern="[a-z0-9][a-z0-9-]{1,88}"
                    maxLength={89}
                    value={slug}
                    onChange={(inputEvent) => {
                      setSlugEdited(true);
                      setSlug(inputEvent.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                    }}
                    className={`${input} pl-[58px] font-mono-x !text-[12px]`}
                    placeholder="event-name"
                  />
                </div>
                <span className="mt-1 block text-[10.5px] text-ink-soft">শিরোনাম থেকে অটো-তৈরি · ইংরেজি অক্ষর ও হাইফেন</span>
              </label>
              <label>
                <span className="field-label">কিকার / লাইভ লেবেল</span>
                <input name="kicker" maxLength={80} defaultValue={event?.kicker ?? "লাইভ"} className={input} placeholder="LIVE DESK" />
              </label>
              <label>
                <span className="field-label">বিভাগ</span>
                <input name="category" maxLength={80} defaultValue={event?.category ?? "জাতীয়"} className={input} placeholder="খেলা, জাতীয়, বিনোদন..." />
              </label>
              <label>
                <span className="field-label">বিভাগের রং</span>
                <input type="color" name="categoryColor" defaultValue={event?.categoryColor ?? "#d2202c"} className={`${input} !h-[42px] !p-1`} />
              </label>
              <label>
                <span className="field-label">স্থান (ঐচ্ছিক)</span>
                <input name="location" maxLength={120} defaultValue={event?.location} className={input} placeholder="শহর, ভেন্যু বা অঞ্চল" />
              </label>
              <label className="md:col-span-2">
                <span className="flex items-center justify-between gap-3">
                  <span className="field-label">ইভেন্টের বিবরণ</span>
                  <span className="font-mono-x text-[10px] text-ink-soft">{summary.length}/১২০০</span>
                </span>
                <textarea
                  name="summary"
                  rows={3}
                  maxLength={1200}
                  value={summary}
                  onChange={(inputEvent) => setSummary(inputEvent.target.value)}
                  className={`${input} resize-y leading-relaxed`}
                  placeholder="কী ঘটছে, কোথায় এবং কেন এটি গুরুত্বপূর্ণ—সংক্ষেপে লিখুন।"
                />
              </label>
              <label>
                <span className="field-label">প্রকাশের অবস্থা</span>
                <select name="status" defaultValue={event?.status ?? "scheduled"} className={input}>
                  <option value="scheduled">আসন্ন · কাউন্টডাউন</option>
                  <option value="live">লাইভ চলছে</option>
                  <option value="ended">শেষ · রিপ্লে</option>
                </select>
              </label>
              <label>
                <span className="field-label">শুরুর সময় · ঢাকা</span>
                <input type="datetime-local" name="startsAt" defaultValue={dhakaDateInput(event?.startsAt)} className={input} />
              </label>
              <label className="md:col-span-2">
                <span className="field-label">পাবলিক পেজের ডিজাইন</span>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <label className={`flex cursor-pointer flex-col border p-3 transition-colors ${template === "auto" ? "border-ink bg-paper shadow-[3px_3px_0_0_var(--color-ink)]" : "border-ink/15 bg-paper-deep hover:border-ink/45"}`}>
                    <input type="radio" name="template" value="auto" checked={template === "auto"} onChange={() => setTemplate("auto")} className="sr-only" />
                    <span className="font-mono-x text-[9px] text-ink-soft">AUTO</span>
                    <span className="mt-1 font-serif-bn text-[15px] font-black text-ink">সাইটের ডিফল্ট</span>
                    <span className="mt-1 text-[10.5px] leading-snug text-ink-soft">গ্লোবাল থিম ব্যবহার হবে</span>
                  </label>
                  {LIVE_THEMES.map((theme) => (
                    <label key={theme.key} className={`flex cursor-pointer flex-col border p-3 transition-colors ${template === theme.key ? "border-ink bg-paper shadow-[3px_3px_0_0_var(--color-ink)]" : "border-ink/15 bg-paper-deep hover:border-ink/45"}`}>
                      <input type="radio" name="template" value={theme.key} checked={template === theme.key} onChange={() => setTemplate(theme.key)} className="sr-only" />
                      <span className="font-mono-x text-[9px] tracking-[0.16em] text-alizarin">{theme.no} · {theme.en}</span>
                      <span className="mt-1 font-serif-bn text-[15px] font-black text-ink">{theme.bn}</span>
                      <span className="mt-1 text-[10.5px] leading-snug text-ink-soft">{theme.hint}</span>
                    </label>
                  ))}
                </div>
              </label>
            </div>
          </fieldset>

          <fieldset className="border border-ink/15 bg-card p-4 md:p-6">
            <SectionHeading number="02" title="লাইভ সম্প্রচার" description="স্ট্রিম URL দিলে ধরনটি অটো শনাক্ত হবে; প্রয়োজনে ম্যানুয়ালি বদলান।" />
            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="field-label">প্রধান স্ট্রিমের ধরন</span>
                <select
                  name="streamType"
                  value={streamType}
                  onChange={(inputEvent) => {
                    setStreamType(inputEvent.target.value as LiveStreamType);
                    setStreamTypeEdited(true);
                  }}
                  className={input}
                >
                  <option value="youtube">YouTube</option>
                  <option value="hls">HLS / TV (.m3u8)</option>
                  <option value="iframe">Embed / iframe</option>
                  <option value="mp4">MP4</option>
                </select>
              </label>
              <label>
                <span className="field-label">প্রধান স্ট্রিম URL</span>
                <input
                  name="streamUrl"
                  type="url"
                  maxLength={1000}
                  value={streamUrl}
                  onChange={(inputEvent) => {
                    const value = inputEvent.target.value;
                    setStreamUrl(value);
                    if (!streamTypeEdited && value) setStreamType(streamTypeFromUrl(value));
                  }}
                  className={`${input} font-mono-x !text-[11px]`}
                  placeholder="https://.../playlist.m3u8"
                />
              </label>
            </div>

            <div className="mt-6 border-t border-ink/10 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-[12.5px] font-bold text-ink">বিকল্প চ্যানেল</h4>
                  <p className="mt-0.5 text-[11px] text-ink-soft">স্টুডিও থিমে দর্শক চ্যানেল বদলাতে পারবেন · সর্বোচ্চ ৫টি</p>
                </div>
                <button
                  type="button"
                  disabled={sources.length >= 5}
                  onClick={() => setSources((current) => [...current, {
                    label: "",
                    type: "youtube",
                    url: "",
                    autoLabel: true,
                    autoType: true,
                  }])}
                  className="inline-flex items-center gap-1.5 border border-ink/20 px-3 py-2 text-[11.5px] font-bold text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus size={13} /> চ্যানেল যোগ
                </button>
              </div>
              {sources.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {sources.map((source, index) => (
                    <div key={index} className="grid gap-3 border border-ink/12 bg-paper p-3 md:grid-cols-[1fr_170px_auto]">
                      <label>
                        <span className="field-label">চ্যানেলের নাম</span>
                        <input
                          value={source.label}
                          onChange={(inputEvent) => updateSource(index, { label: inputEvent.target.value, autoLabel: false })}
                          className={input}
                          placeholder="URL থেকে নাম নিন"
                        />
                      </label>
                      <label>
                        <span className="field-label">ধরন</span>
                        <select
                          value={source.type}
                          onChange={(inputEvent) => updateSource(index, { type: inputEvent.target.value as LiveStreamType, autoType: false })}
                          className={input}
                        >
                          <option value="youtube">YouTube</option>
                          <option value="hls">HLS / TV</option>
                          <option value="iframe">Embed / iframe</option>
                          <option value="mp4">MP4</option>
                        </select>
                      </label>
                      <button
                        type="button"
                        aria-label={`${source.label || `চ্যানেল ${index + 1}`} মুছুন`}
                        onClick={() => setSources((current) => current.filter((_, sourceIndex) => sourceIndex !== index))}
                        className="mt-5 flex h-10 w-10 items-center justify-center border border-alizarin/30 text-alizarin hover:bg-alizarin hover:text-white md:mt-0 md:self-end"
                      >
                        <Trash2 size={14} />
                      </button>
                      <label className="md:col-span-3">
                        <span className="field-label">চ্যানেল স্ট্রিম URL</span>
                        <input
                          type="url"
                          maxLength={1000}
                          value={source.url}
                          onChange={(inputEvent) => updateSource(index, { url: inputEvent.target.value })}
                          className={`${input} font-mono-x !text-[11px]`}
                          placeholder="https://.../playlist.m3u8"
                        />
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 border border-dashed border-ink/20 px-4 py-5 text-center">
                  <Radio size={16} className="mx-auto text-ink-soft" />
                  <p className="mt-1 text-[11.5px] text-ink-soft">এখনো বিকল্প চ্যানেল যোগ করা হয়নি।</p>
                </div>
              )}
              {hasSignedUrl && (
                <p role="status" className="mt-3 border-l-2 border-amberx bg-amberx/10 px-3 py-2 text-[11px] leading-relaxed text-ink">
                  স্বাক্ষরযুক্ত URL-এ অ্যাক্সেস টোকেন থাকতে পারে। পাবলিক লাইভ পাতায় স্ট্রিম URL পাঠানো হয়—শুধু শেয়ার করার অনুমতি আছে এমন URL ব্যবহার করুন।
                </p>
              )}
            </div>
          </fieldset>

          <fieldset className="border border-ink/15 bg-card p-4 md:p-6">
            <SectionHeading number="03" title="গুরুত্বপূর্ণ তথ্য" description="যাচাইকৃত তথ্যগুলো আলাদা লাইনে লিখুন; ফাঁকা রাখলেও ইভেন্ট তৈরি হবে।" />
            <textarea name="keyPoints" rows={4} defaultValue={(event?.keyPoints ?? []).join("\n")} className={`${input} resize-y leading-relaxed`} placeholder={"প্রতি লাইনে একটি তথ্য\nযেমন: টস জিতে ব্যাটিংয়ে বাংলাদেশ"} />
          </fieldset>

          <fieldset className="border border-ink/15 bg-card p-4 md:p-6">
            <SectionHeading number="04" title="পাঠকের অংশগ্রহণ" description="মন্তব্য, রিঅ্যাকশন, পোল ও প্রশ্নোত্তরের নিয়ন্ত্রণ নির্ধারণ করুন।" />
            <div className="grid gap-2 sm:grid-cols-2">
              <Check name="featured" label="হোমপেজে ফিচার্ড" hint="লাইভ ইভেন্ট সেকশনে অগ্রাধিকার" checked={event?.featured ?? false} />
              <Check name="commentsEnabled" label="লাইভ মন্তব্য" checked={event?.commentsEnabled ?? true} />
              <Check name="reactionsEnabled" label="রিঅ্যাকশন" checked={event?.reactionsEnabled ?? true} />
              <Check name="pollsEnabled" label="পোল" checked={event?.pollsEnabled ?? true} />
              <Check name="qaEnabled" label="প্রশ্নোত্তর" checked={event?.qaEnabled ?? true} />
              <Check name="showViewerCount" label="বাস্তব দর্শক সংখ্যা" checked={event?.showViewerCount ?? true} />
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label>
                <span className="field-label">মন্তব্য মডারেশন</span>
                <select name="moderation" defaultValue={event?.moderation ?? "post"} className={input}>
                  <option value="post">প্রকাশের পর মডারেশন</option>
                  <option value="pre">অনুমোদনের পর প্রকাশ</option>
                </select>
              </label>
              <label>
                <span className="field-label">স্লো মোড · সেকেন্ড</span>
                <input type="number" name="slowMode" min={0} max={300} defaultValue={event?.slowMode ?? 0} className={input} />
                <span className="mt-1 block text-[10.5px] text-ink-soft">০ দিলে বন্ধ থাকবে · সর্বোচ্চ ৩০০</span>
              </label>
            </div>
          </fieldset>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20">
          <section className="overflow-hidden border border-ink/15 bg-[#111827] text-white">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
              <Sparkles size={14} className="text-[#c8f65d]" />
              <p className="font-mono-x text-[9px] tracking-[0.18em] text-white/65 uppercase">লাইভ প্রিভিউ</p>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 bg-live px-2 py-1 font-mono-x text-[9px] font-bold tracking-wider uppercase">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> {event?.status === "live" ? "LIVE" : "নতুন ইভেন্ট"}
                </span>
                <Clapperboard size={15} className="text-white/45" />
              </div>
              {selectedTheme && (
                <div className="mt-3 flex items-center gap-2 border border-white/10 bg-white/5 px-2.5 py-1.5">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: selectedTheme.accent }} />
                  <span className="font-mono-x text-[9px] tracking-[0.16em] text-white/75 uppercase">{selectedTheme.no} · {selectedTheme.bn} — {selectedTheme.en}</span>
                </div>
              )}
              <h3 className="mt-4 font-serif-bn text-[19px] leading-snug font-extrabold">{title || "আপনার ইভেন্টের শিরোনাম"}</h3>
              <p className="mt-2 line-clamp-3 text-[11.5px] leading-relaxed text-white/60">{summary || "ইভেন্টের সংক্ষিপ্ত বিবরণ এখানে দেখা যাবে।"}</p>
              <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3 font-mono-x text-[10px] text-white/60">
                <Link2 size={12} className="shrink-0" />
                <span className="truncate">/live/{slug || "event-url"}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 font-mono-x text-[9px] text-white/45">
                <span>{streamType.toUpperCase()}</span>
                <span>{sources.length + Number(Boolean(streamUrl))}টি উৎস</span>
              </div>
            </div>
          </section>
          <section className="border border-ink/15 bg-paper p-4">
            <div className="flex items-start gap-2.5">
              <CalendarClock size={15} className="mt-0.5 shrink-0 text-alizarin" />
              <div>
                <p className="text-[11.5px] font-bold text-ink">প্রকাশের আগে যাচাই</p>
                <p className="mt-1 text-[10.5px] leading-relaxed text-ink-soft">শিরোনাম, সম্প্রচারের অনুমতি, সঠিক সময় ও স্ট্রিম লিংক নিশ্চিত করে তারপর প্রকাশ করুন।</p>
              </div>
            </div>
          </section>
        </aside>
      </div>

      {formState?.error && (
        <p role="alert" className="border border-alizarin/30 bg-alizarin/10 px-4 py-3 text-[12.5px] font-semibold text-alizarin">
          {formState.error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-ink/15 pt-5">
        <p className="max-w-2xl text-[11px] leading-relaxed text-ink-soft">
          সংরক্ষণ করলে ইভেন্টটি পাবলিক লাইভ কেন্দ্রে দেখা যাবে। কোনো ডেমো দর্শক বা নমুনা আপডেট যোগ করা হবে না।
        </p>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 bg-alizarin px-5 py-3 text-[12.5px] font-bold text-white transition-colors hover:bg-alizarin-deep disabled:cursor-wait disabled:opacity-60"
        >
          {pending && <LoaderCircle size={15} className="animate-spin" />}
          {pending ? "সংরক্ষণ হচ্ছে…" : event ? "পরিবর্তন সংরক্ষণ করুন" : "লাইভ ইভেন্ট তৈরি করুন"}
          {!pending && <span aria-hidden="true">→</span>}
        </button>
      </div>
    </form>
  );
}
