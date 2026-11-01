"use client";

import { useActionState } from "react";
import type { AdCreative, AdSlot } from "@hoichoi/db";
import { createClientCreative, requestAdBooking } from "@/app/portal/actions";

function ActionMessage({ error }: { error?: string }) {
  return error ? <p role="alert" className="border border-alizarin/30 bg-alizarin/10 px-3 py-2 text-[11px] font-semibold text-alizarin">{error}</p> : null;
}

export function PortalManagementForms({
  creatives,
  slots,
  mode = "all",
}: {
  creatives: AdCreative[];
  slots: AdSlot[];
  mode?: "all" | "creative" | "booking";
}) {
  const [creativeState, createCreativeForm, creating] = useActionState(createClientCreative, null);
  const [bookingState, requestBookingForm, booking] = useActionState(requestAdBooking, null);
  const field = "mt-1 w-full border border-ink/25 bg-paper px-3 py-2 text-[12px] text-ink outline-none focus:border-alizarin";
  const availableSlots = slots.filter((slot) => slot.enabled);
  const showCreativeForm = mode !== "booking";
  const showBookingForm = mode !== "creative";

  return (
    <div className={`grid gap-5 ${mode === "all" ? "xl:grid-cols-2" : ""}`}>
      {showCreativeForm && <form action={createCreativeForm} className="space-y-3 border border-ink/15 bg-card p-4">
        <div>
          <h3 className="font-serif-bn text-[16px] font-bold text-ink">নতুন ক্রিয়েটিভ</h3>
          <p className="mt-1 text-[11px] text-ink-soft">শিরোনাম, বার্তা ও গন্তব্য লিংক যোগ করুন।</p>
        </div>
        <label className="block"><span className="field-label">ক্রিয়েটিভের নাম</span><input name="creativeName" required maxLength={120} className={field} /></label>
        <label className="block"><span className="field-label">বিজ্ঞাপনের শিরোনাম</span><input name="headline" required maxLength={100} className={field} /></label>
        <label className="block"><span className="field-label">বার্তা</span><textarea name="body" maxLength={240} rows={2} className={field} /></label>
        <label className="block"><span className="field-label">বাটনের লেখা</span><input name="cta" maxLength={40} className={field} /></label>
        <label className="block"><span className="field-label">গন্তব্য URL</span><input name="url" type="url" required maxLength={1000} placeholder="https://" className={field} /></label>
        <ActionMessage error={creativeState?.error} />
        <button type="submit" disabled={creating} className="bg-ink px-3 py-2 text-[11px] font-bold text-paper hover:bg-alizarin disabled:opacity-50">
          {creating ? "সংরক্ষণ হচ্ছে…" : "ক্রিয়েটিভ সংরক্ষণ"}
        </button>
      </form>}

      {showBookingForm && <form action={requestBookingForm} className="space-y-3 border border-ink/15 bg-card p-4">
        <div>
          <h3 className="font-serif-bn text-[16px] font-bold text-ink">স্লট বুকিং অনুরোধ</h3>
          <p className="mt-1 text-[11px] text-ink-soft">অনুমোদনের পরেই বিজ্ঞাপনটি প্রকাশিত হবে।</p>
        </div>
        <label className="block">
          <span className="field-label">বিজ্ঞাপন স্লট</span>
          <select name="slotKey" required className={field} defaultValue="">
            <option value="" disabled>স্লট নির্বাচন করুন</option>
            {availableSlots.map((slot) => <option key={slot.slotKey} value={slot.slotKey}>{slot.name} · ৳{slot.dayRateBdt}/দিন</option>)}
          </select>
        </label>
        <label className="block">
          <span className="field-label">ক্রিয়েটিভ</span>
          <select name="creativeId" required disabled={creatives.length === 0} className={field} defaultValue="">
            <option value="" disabled>ক্রিয়েটিভ নির্বাচন করুন</option>
            {creatives.map((creative) => <option key={creative.id} value={creative.id}>{creative.name}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="field-label">শুরুর তারিখ</span><input type="date" name="startDate" required className={field} /></label>
          <label className="block"><span className="field-label">দিন (সর্বোচ্চ ৯০)</span><input type="number" name="days" min={1} max={90} required defaultValue={1} className={field} /></label>
        </div>
        {creatives.length === 0 && <p className="text-[10.5px] text-ink-soft">বুকিংয়ের আগে একটি ক্রিয়েটিভ তৈরি করুন।</p>}
        {availableSlots.length === 0 && <p className="text-[10.5px] text-ink-soft">এখন কোনো বুকিংযোগ্য স্লট নেই।</p>}
        <ActionMessage error={bookingState?.error} />
        <button type="submit" disabled={booking || creatives.length === 0 || availableSlots.length === 0} className="bg-alizarin px-3 py-2 text-[11px] font-bold text-white disabled:opacity-50">
          {booking ? "অনুরোধ পাঠানো হচ্ছে…" : "বুকিং অনুরোধ পাঠান"}
        </button>
      </form>}
    </div>
  );
}
