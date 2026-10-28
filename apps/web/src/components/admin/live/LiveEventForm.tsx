import type { LiveEventRecord } from "@hoichoi/db";
import { saveLiveEvent } from "@/app/admin/(console)/live/actions";
import { LIVE_THEMES } from "@/lib/live-themes";

function dhakaDateInput(value?: string): string {
  const date = value ? new Date(value) : new Date(Date.now() + 60 * 60_000);
  if (!Number.isFinite(date.getTime())) return "";
  return new Date(date.getTime() + 6 * 60 * 60_000).toISOString().slice(0, 16);
}

function Check({ name, label, checked }: { name: string; label: string; checked: boolean }) {
  return (
    <label className="flex items-center gap-2 border border-ink/15 bg-paper px-3 py-2.5 text-[12px] font-semibold text-ink">
      <input type="checkbox" name={name} defaultChecked={checked} className="h-4 w-4 accent-alizarin" />
      {label}
    </label>
  );
}

export function LiveEventForm({ event }: { event?: LiveEventRecord }) {
  const input = "field";
  return (
    <form action={saveLiveEvent} className="space-y-7">
      {event && <input type="hidden" name="id" value={event.id} />}
      <fieldset>
        <legend className="eyebrow mb-3">০১ · ইভেন্ট পরিচিতি</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="field-label">শিরোনাম *</span>
            <input name="title" required minLength={2} maxLength={200} defaultValue={event?.title} className={`${input} font-serif-bn !text-[15px] font-bold`} />
          </label>
          <label>
            <span className="field-label">স্লাগ *</span>
            <input name="slug" required pattern="[a-z0-9][a-z0-9-]{1,88}" defaultValue={event?.slug} className={`${input} font-mono-x !text-[12px]`} placeholder="event-name" />
          </label>
          <label>
            <span className="field-label">কিকার</span>
            <input name="kicker" defaultValue={event?.kicker ?? "লাইভ"} className={input} />
          </label>
          <label>
            <span className="field-label">বিভাগ</span>
            <input name="category" defaultValue={event?.category ?? "জাতীয়"} className={input} />
          </label>
          <label>
            <span className="field-label">বিভাগের রং</span>
            <input type="color" name="categoryColor" defaultValue={event?.categoryColor ?? "#d2202c"} className={`${input} !h-[42px] !p-1`} />
          </label>
          <label>
            <span className="field-label">স্থান</span>
            <input name="location" defaultValue={event?.location} className={input} />
          </label>
          <label>
            <span className="field-label">কভার ছবির URL</span>
            <input name="coverImage" defaultValue={event?.coverImage} className={`${input} font-mono-x !text-[12px]`} placeholder="/media/event-cover.jpg" />
          </label>
          <label className="md:col-span-2">
            <span className="field-label">সারসংক্ষেপ</span>
            <textarea name="summary" rows={3} maxLength={1200} defaultValue={event?.summary} className={input} />
          </label>
          <label>
            <span className="field-label">অবস্থা</span>
            <select name="status" defaultValue={event?.status ?? "scheduled"} className={input}>
              <option value="scheduled">আসন্ন</option>
              <option value="live">লাইভ চলছে</option>
              <option value="ended">শেষ / রিপ্লে</option>
            </select>
          </label>
          <label>
            <span className="field-label">শুরুর সময় (ঢাকা)</span>
            <input type="datetime-local" name="startsAt" defaultValue={dhakaDateInput(event?.startsAt)} className={input} />
          </label>
          <label className="md:col-span-2">
            <span className="field-label">এই ইভেন্টের থিম</span>
            <select name="template" defaultValue={event?.template ?? "auto"} className={input}>
              <option value="auto">সাইটের গ্লোবাল ডিফল্ট থিম</option>
              {LIVE_THEMES.map((theme) => <option key={theme.key} value={theme.key}>{theme.bn} — {theme.en}</option>)}
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-3">০২ · বাস্তব সম্প্রচার লিংক</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="field-label">প্রধান স্ট্রিমের ধরন</span>
            <select name="streamType" defaultValue={event?.streamType ?? "youtube"} className={input}>
              <option value="youtube">YouTube</option>
              <option value="hls">HLS / TV</option>
              <option value="iframe">Embed / iframe</option>
              <option value="mp4">MP4</option>
            </select>
          </label>
          <label>
            <span className="field-label">প্রধান স্ট্রিম URL</span>
            <input name="streamUrl" type="url" defaultValue={event?.streamUrl} className={`${input} font-mono-x !text-[12px]`} placeholder="https://…" />
          </label>
          <label className="md:col-span-2">
            <span className="field-label">বিকল্প চ্যানেল (প্রতি লাইনে: নাম | ধরন | URL)</span>
            <textarea
              name="streams"
              rows={3}
              defaultValue={(event?.streams ?? []).map((stream) => `${stream.label} | ${stream.type} | ${stream.url}`).join("\n")}
              className={`${input} font-mono-x !text-[11px]`}
              placeholder={"ক্যামেরা ২ | youtube | https://…\nটিভি চ্যানেল | hls | https://…"}
            />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-3">০৩ · এক নজরে গুরুত্বপূর্ণ তথ্য</legend>
        <textarea name="keyPoints" rows={4} defaultValue={(event?.keyPoints ?? []).join("\n")} className={input} placeholder="প্রতি লাইনে একটি যাচাইকৃত তথ্য" />
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-3">০৪ · পাঠকের অংশগ্রহণ ও মডারেশন</legend>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <Check name="featured" label="হোমপেজে ফিচার্ড" checked={event?.featured ?? false} />
          <Check name="commentsEnabled" label="লাইভ মন্তব্য" checked={event?.commentsEnabled ?? true} />
          <Check name="reactionsEnabled" label="রিঅ্যাকশন" checked={event?.reactionsEnabled ?? true} />
          <Check name="pollsEnabled" label="পোল" checked={event?.pollsEnabled ?? true} />
          <Check name="qaEnabled" label="প্রশ্নোত্তর" checked={event?.qaEnabled ?? true} />
          <Check name="showViewerCount" label="বাস্তব দর্শক সংখ্যা" checked={event?.showViewerCount ?? true} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label>
            <span className="field-label">মন্তব্য প্রকাশ</span>
            <select name="moderation" defaultValue={event?.moderation ?? "post"} className={input}>
              <option value="post">প্রকাশের পর মডারেশন</option>
              <option value="pre">প্রকাশের আগে অনুমোদন</option>
            </select>
          </label>
          <label>
            <span className="field-label">Slow mode (সেকেন্ড, ০–৩০০)</span>
            <input type="number" name="slowMode" min={0} max={300} defaultValue={event?.slowMode ?? 0} className={input} />
          </label>
        </div>
      </fieldset>

      <div className="border-t border-ink/15 pt-5">
        <button type="submit" className="bg-ink px-5 py-2.5 text-[13px] font-bold text-paper transition hover:bg-alizarin">
          {event ? "ইভেন্ট আপডেট করুন" : "আসল লাইভ ইভেন্ট তৈরি করুন"} →
        </button>
      </div>
    </form>
  );
}
