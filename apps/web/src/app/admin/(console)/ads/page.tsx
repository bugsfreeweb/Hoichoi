import { getAdAnalytics, listAdSlots, listAdCreatives, listAdBookings, listAdClients } from "@hoichoi/db";
import Link from "next/link";
import { requirePageUser, requiresRole } from "@/lib/auth";
import { updateAdBookingStatus, updateAdClientStatus } from "./actions";
import { AdsAdminNavigation } from "@/components/admin/ads/AdsAdminNavigation";
import { AdsOverviewBoard } from "@/components/admin/ads/AdsOverviewBoard";
import { PageHeading } from "@/components/admin/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function AdminAdsPage() {
  const user = await requirePageUser();
  const canManageClients = requiresRole(user, "admin");
  const [slots, creatives, bookings, clients, analytics] = await Promise.all([
    listAdSlots(),
    listAdCreatives(),
    listAdBookings(),
    listAdClients(),
    getAdAnalytics().catch(() => []),
  ]);

  return (
    <div>
      <PageHeading
        emoji="▚"
        kicker="AD MANAGEMENT · বিজ্ঞাপন ব্যবস্থাপনা"
        title="বিজ্ঞাপন"
        description="স্লট দখল, বুকিং আয় ও ডেলিভারি এক নজরে — তারপর ক্রিয়েটিভ ও ক্লায়েন্ট পরিচালনা করুন।"
        actions={
          <Link href="/portal/login" className="border border-ink/20 px-3 py-2 text-[11px] font-bold text-ink hover:border-ink">ক্লায়েন্ট পোর্টাল</Link>
        }
      />

      <AdsAdminNavigation active="" />

      <div className="mt-6">
        <AdsOverviewBoard slots={slots} bookings={bookings} analytics={analytics} />
      </div>
      <section className="mt-10 border border-line bg-paper p-5 md:p-7">
        <p className="eyebrow">▚ AD SLOTS</p>
        <h2 className="mt-1 mb-5 font-serif-bn text-[22px] font-black text-ink">বিজ্ঞাপন স্লটসমূহ</h2>
        {slots.length ? (
          <div className="space-y-3">
            {slots.map((slot) => (
              <div key={slot.slotKey} className="flex items-center justify-between border border-ink/15 bg-card p-4">
                <div>
                  <p className="font-mono-x text-[10px] tracking-[0.12em] text-alizarin uppercase">{slot.slotKey}</p>
                  <p className="mt-1 font-serif-bn text-[15px] font-bold text-ink">{slot.name}</p>
                  {slot.description && <p className="mt-0.5 text-[11.5px] text-ink-soft">{slot.description}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 text-[10px] font-bold ${slot.enabled ? "bg-lime text-paper" : "bg-ink/10 text-ink-soft"}`}>
                    {slot.enabled ? "সক্রিয়" : "নিষ্ক্রিয়"}
                  </span>
                  <span className="font-mono-x text-[11px] text-ink-soft">৳{slot.dayRateBdt}/দিন</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12.5px] text-ink-soft">কোনো স্লট পাওয়া যায়নি। মাইগ্রেশন চালান।</p>
        )}
      </section>

      <section className="mt-10 border border-line bg-paper p-5 md:p-7">
        <p className="eyebrow">▚ CREATIVES</p>
        <h2 className="mt-1 mb-5 font-serif-bn text-[22px] font-black text-ink">ক্রিয়েটিভস</h2>
        {creatives.length ? (
          <div className="space-y-3">
            {creatives.map((creative) => (
              <div key={creative.id} className="flex items-center justify-between border border-ink/15 bg-card p-4">
                <div>
                  <p className="font-serif-bn text-[15px] font-bold text-ink">{creative.name}</p>
                  <p className="mt-0.5 font-mono-x text-[10px] text-ink-soft uppercase">{creative.templateId} · {creative.palette}</p>
                </div>
                <span className="font-mono-x text-[10px] text-ink-soft">{creative.baseLang}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12.5px] text-ink-soft">কোনো ক্রিয়েটিভ পাওয়া যায়নি।</p>
        )}
      </section>

      <section className="mt-10 border border-line bg-paper p-5 md:p-7">
        <p className="eyebrow">▚ BOOKINGS</p>
        <h2 className="mt-1 mb-5 font-serif-bn text-[22px] font-black text-ink">বুকিংস</h2>
        {bookings.length ? (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between border border-ink/15 bg-card p-4">
                <div>
                  <p className="font-mono-x text-[10px] tracking-[0.12em] text-alizarin uppercase">{booking.slotKey}</p>
                  <p className="mt-1 font-mono-x text-[9px] text-ink-soft uppercase">{clients.find((client) => client.id === booking.clientId)?.email ?? "ক্লায়েন্ট"} · {booking.status} · {booking.days} দিন</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-[16px] font-bold text-ink">৳{booking.totalBdt}</p>
                  <p className="font-mono-x text-[9px] text-ink-soft">{booking.impressions} imp · {booking.clicks} clk</p>
                  {canManageClients && booking.status !== "active" && booking.status !== "rejected" && (
                    <div className="mt-2 flex justify-end gap-2">
                      <form action={updateAdBookingStatus}>
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <input type="hidden" name="status" value="active" />
                        <button type="submit" className="border border-lime/40 px-2 py-1 text-[9px] font-bold text-lime hover:bg-lime/10">অনুমোদন ও চালু</button>
                      </form>
                      <form action={updateAdBookingStatus}>
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <input type="hidden" name="status" value="rejected" />
                        <button type="submit" className="border border-alizarin/30 px-2 py-1 text-[9px] font-bold text-alizarin hover:bg-alizarin/10">প্রত্যাখ্যান</button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12.5px] text-ink-soft">কোনো বুকিং পাওয়া যায়নি।</p>
        )}
      </section>

      <section className="mt-10 border border-line bg-paper p-5 md:p-7">
        <p className="eyebrow">▚ CLIENTS</p>
        <h2 className="mt-1 mb-5 font-serif-bn text-[22px] font-black text-ink">ক্লায়েন্টস</h2>
        {clients.length ? (
          <div className="space-y-3">
            {clients.map((client) => (
              <div key={client.id} className="flex items-center justify-between border border-ink/15 bg-card p-4">
                <div>
                  <p className="font-serif-bn text-[15px] font-bold text-ink">{client.name}</p>
                  <p className="mt-0.5 font-mono-x text-[10px] text-ink-soft">{client.email} · {client.role}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-[10px] font-bold ${client.status === "approved" ? "bg-lime text-paper" : "bg-ink/10 text-ink-soft"}`}>
                    {client.status}
                  </span>
                  {canManageClients && client.role === "client" && (
                    <form action={updateAdClientStatus}>
                      <input type="hidden" name="clientId" value={client.id} />
                      <input type="hidden" name="status" value={client.status === "approved" ? "suspended" : "approved"} />
                      <button type="submit" className="border border-ink/20 px-2 py-1 text-[9px] font-bold text-ink hover:border-ink">
                        {client.status === "approved" ? "স্থগিত" : "অনুমোদন"}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12.5px] text-ink-soft">কোনো ক্লায়েন্ট পাওয়া যায়নি।</p>
        )}
      </section>
    </div>
  );
}