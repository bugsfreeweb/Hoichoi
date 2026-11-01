"use client";

import { useActionState } from "react";
import { createStandalonePoll } from "@/app/admin/(console)/polls/actions";
import { PollTemplatePicker } from "./PollTemplatePicker";

export function StandalonePollForm() {
  const [state, action, pending] = useActionState(createStandalonePoll, null);
  const field = "field";
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <label>
        <span className="field-label">বিষয় *</span>
        <input name="topic" required minLength={2} maxLength={120} className={field} placeholder="ক্রিকেট, নির্বাচন..." />
      </label>
      <label>
        <span className="field-label">বিষয়ের রং</span>
        <input type="color" name="topicColor" defaultValue="#d2202c" className={`${field} !h-[42px] !p-1`} />
      </label>
      <label className="md:col-span-2">
        <span className="field-label">প্রশ্ন *</span>
        <input name="question" required minLength={3} maxLength={300} className={field} placeholder="আপনার প্রশ্ন?" />
      </label>
      <label className="md:col-span-2">
        <span className="field-label">সংক্ষিপ্ত বিবরণ</span>
        <textarea name="description" rows={2} maxLength={1200} className={`${field} resize-y`} placeholder="পোলের প্রেক্ষাপট পাঠককে বুঝিয়ে বলুন।" />
      </label>
      <label className="md:col-span-2">
        <span className="field-label">অপশন · প্রতি লাইনে একটি (২–১২টি)</span>
        <textarea name="options" required rows={4} maxLength={2000} className={`${field} resize-y`} placeholder={"বাংলাদেশ\nভারত"} />
      </label>
      <div className="md:col-span-2">
        <PollTemplatePicker />
      </div>
      <label>
        <span className="field-label">ভোটের অবস্থা</span>
        <select name="status" defaultValue="open" className={field}>
          <option value="open">এখনই চালু</option>
          <option value="scheduled">শুরুর সময় পর্যন্ত অপেক্ষা</option>
          <option value="closed">বন্ধ</option>
        </select>
      </label>
      <label>
        <span className="field-label">শুরুর সময় · ঢাকা</span>
        <input type="datetime-local" name="startsAt" className={field} />
        <span className="mt-1 block text-[10px] text-ink-soft">ফাঁকা রাখলে এখনই শুরু হবে।</span>
      </label>
      <label>
        <span className="field-label">শেষের সময় · ঐচ্ছিক</span>
        <input type="datetime-local" name="endsAt" className={field} />
      </label>
      <label>
        <span className="field-label">ফলাফল দেখানোর নিয়ম</span>
        <select name="resultsMode" defaultValue="after-vote" className={field}>
          <option value="after-vote">ভোট দেওয়ার পর</option>
          <option value="always">সব সময়</option>
          <option value="after-close">ভোট বন্ধ হলে</option>
        </select>
      </label>
      <div className="grid gap-2">
        <label className="flex items-center gap-2 border border-ink/15 bg-card px-3 py-2.5 text-[11px] font-semibold text-ink">
          <input type="checkbox" name="featured" className="accent-alizarin" />
          হোমপেজের প্রধান পোল
        </label>
        <label className="flex items-center gap-2 border border-ink/15 bg-card px-3 py-2.5 text-[11px] font-semibold text-ink">
          <input type="checkbox" name="allowMultiple" className="accent-alizarin" />
          একাধিক অপশনে ভোটের অনুমতি
        </label>
      </div>
      {state?.error && <p role="alert" className="md:col-span-2 border border-alizarin/30 bg-alizarin/10 px-3 py-2 text-[12px] font-semibold text-alizarin">{state.error}</p>}
      {state?.notice && <p role="status" className="md:col-span-2 border border-lime/30 bg-lime/10 px-3 py-2 text-[12px] font-semibold text-ink">{state.notice}</p>}
      <div className="md:col-span-2">
        <button disabled={pending} className="bg-ink px-5 py-3 text-[12px] font-bold text-paper transition-colors hover:bg-alizarin disabled:opacity-60">
          {pending ? "সংরক্ষণ হচ্ছে…" : "পোল সংরক্ষণ করুন"}
        </button>
      </div>
    </form>
  );
}
