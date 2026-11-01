import Link from "next/link";
import {
  getAdAnalytics,
  listAdBookings,
  listAdClients,
  listAdCreatives,
  listAdEvents,
  listAdSlots,
} from "@hoichoi/db";
import { notFound } from "next/navigation";
import { requirePageUser, requiresRole } from "@/lib/auth";
import { AdsAdminNavigation } from "@/components/admin/ads/AdsAdminNavigation";
import { saveAdSlotSettings, updateAdBookingStatus, updateAdClientStatus } from "../actions";

export const dynamic = "force-dynamic";

const SECTION_TITLES: Record<string, string> = {
  analytics: "বিজ্ঞাপন অ্যানালিটিক্স",
  slots: "বিজ্ঞাপন স্লট",
  bookings: "বুকিং পরিচালনা",
  clients: "ক্লায়েন্ট অ্যাকাউন্ট",
  templates: "ক্রিয়েটিভ টেমপ্লেট",
  studio: "ক্রিয়েটিভ স্টুডিও",
  builder: "লেআউট বিল্ডার",
  payments: "পেমেন্ট ও ইনভয়েস",
  activity: "ডেলিভারি অ্যাক্টিভিটি",
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 border border-line bg-paper p-4 md:p-6">
      <h2 className="mb-4 font-serif-bn text-[20px] font-black text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="border border-dashed border-ink/20 px-4 py-6 text-center text-[12px] text-ink-soft">{children}</p>;
}

export default async function AdminAdsSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const title = SECTION_TITLES[section];
  if (!title) notFound();

  const user = await requirePageUser();
  const canManage = requiresRole(user, "admin");
  const [slots, creatives, bookings, clients, analytics, events] = await Promise.all([
    listAdSlots(),
    listAdCreatives(),
    listAdBookings(),
    listAdClients(),
    getAdAnalytics(),
    listAdEvents(),
  ]);
  const card = "border border-ink/15 bg-card p-4";
  const field = "border border-ink/25 bg-paper px-2 py-1.5 text-[11px] text-ink";

  return (
    <div>
      <header>
        <p className="eyebrow">▚ AD MANAGEMENT · বিজ্ঞাপন ব্যবস্থাপনা</p>
        <h1 className="mt-2 font-serif-bn text-[30px] font-black text-ink md:text-[36px]">{title}</h1>
        <p className="mt-1 text-[12px] text-ink-soft">প্ল্যাটফর্ম বিজ্ঞাপনের বুকিং, ক্লায়েন্ট, স্লট ও ডেলিভারি পরিচালনা করুন।</p>
      </header>
      <AdsAdminNavigation active={section} />

      {section === "analytics" && (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ["১৪ দিনের ইম্প্রেশন", analytics.reduce((sum, day) => sum + day.impressions, 0)],
              ["১৪ দিনের ক্লিক", analytics.reduce((sum, day) => sum + day.clicks, 0)],
              ["CTR", `${analytics.reduce((sum, day) => sum + day.impressions, 0) ? (analytics.reduce((sum, day) => sum + day.clicks, 0) / analytics.reduce((sum, day) => sum + day.impressions, 0) * 100).toFixed(2) : "0.00"}%`],
            ].map(([label, value]) => (
              <div key={label} className={card}>
                <p className="font-mono-x text-[9px] tracking-wider text-ink-soft uppercase">{label}</p>
                <p className="mt-2 font-display text-[24px] font-bold text-ink">{value}</p>
              </div>
            ))}
          </div>
          <Panel title="দৈনিক ডেলিভারি · গত ১৪ দিন">
            <div className="space-y-2">
              {analytics.map((day) => {
                const max = Math.max(1, ...analytics.map((item) => item.impressions));
                return (
                  <div key={day.date} className="grid grid-cols-[90px_1fr_80px] items-center gap-3 text-[10px]">
                    <span className="font-mono-x text-ink-soft">{day.date}</span>
                    <div className="h-2 bg-ink/10">
                      <div className="h-full bg-alizarin" style={{ width: `${(day.impressions / max) * 100}%` }} />
                    </div>
                    <span className="text-right font-mono-x text-ink">{day.impressions.toLocaleString()} imp</span>
                  </div>
                );
              })}
            </div>
          </Panel>
        </>
      )}

      {section === "slots" && (
        <Panel title="স্লটের অবস্থা ও দৈনিক মূল্য">
          {!slots.length ? <Empty>কোনো platform ad slot পাওয়া যায়নি।</Empty> : (
            <div className="space-y-3">
              {slots.map((slot) => (
                <form key={slot.slotKey} action={saveAdSlotSettings} className={`${card} flex flex-wrap items-end justify-between gap-4`}>
                  <input type="hidden" name="slotKey" value={slot.slotKey} />
                  <div className="min-w-[180px] flex-1">
                    <p className="font-mono-x text-[10px] font-bold uppercase text-alizarin">{slot.slotKey}</p>
                    <p className="mt-1 font-serif-bn text-[14px] font-bold text-ink">{slot.name}</p>
                    {slot.description && <p className="mt-1 text-[10px] text-ink-soft">{slot.description}</p>}
                  </div>
                  <label className="grid gap-1 text-[10px] text-ink-soft">
                    বুকিং
                    <select name="enabled" defaultValue={String(slot.enabled)} disabled={!canManage} className={field}>
                      <option value="true">সক্রিয়</option><option value="false">বন্ধ</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-[10px] text-ink-soft">
                    দৈনিক মূল্য (৳)
                    <input name="dayRateBdt" type="number" min={0} max={100000000} step={1} required defaultValue={slot.dayRateBdt} disabled={!canManage} className={`${field} w-32`} />
                  </label>
                  {canManage && <button className="bg-ink px-3 py-2 text-[10px] font-bold text-paper hover:bg-alizarin">সেটিং সংরক্ষণ</button>}
                </form>
              ))}
            </div>
          )}
          <p className="mt-4 text-[10px] leading-relaxed text-ink-soft">এই স্লট সেটিংগুলো platform ad booking-এর জন্য। বিদ্যমান HTML/Google ad slot configuration আলাদা এবং অপরিবর্তিত থাকে।</p>
        </Panel>
      )}

      {section === "bookings" && (
        <Panel title={`সব বুকিং · ${bookings.length}`}>
          {!bookings.length ? <Empty>এখনো কোনো বুকিং অনুরোধ নেই।</Empty> : (
            <div className="space-y-3">
              {bookings.map((booking) => {
                const client = clients.find((item) => item.id === booking.clientId);
                const creative = creatives.find((item) => item.id === booking.creativeId);
                return (
                  <article key={booking.id} className={`${card} flex flex-wrap items-center justify-between gap-4`}>
                    <div>
                      <p className="font-mono-x text-[10px] font-bold uppercase text-alizarin">{booking.slotKey} · {booking.status}</p>
                      <p className="mt-1 text-[12px] font-semibold text-ink">{client?.company || client?.name || "Client"} · {creative?.name || "Creative"}</p>
                      <p className="mt-1 text-[10px] text-ink-soft">{booking.startsAt.slice(0, 10)} — {booking.endsAt.slice(0, 10)} · {booking.days} দিন · ৳{booking.totalBdt.toLocaleString()}</p>
                    </div>
                    {canManage && booking.status !== "active" && booking.status !== "rejected" && (
                      <div className="flex gap-2">
                        {(["active", "rejected"] as const).map((status) => (
                          <form key={status} action={updateAdBookingStatus}>
                            <input type="hidden" name="bookingId" value={booking.id} />
                            <input type="hidden" name="status" value={status} />
                            <button className={`border px-3 py-2 text-[10px] font-bold ${status === "active" ? "border-lime/40 text-lime" : "border-alizarin/30 text-alizarin"}`}>
                              {status === "active" ? "অনুমোদন ও চালু" : "প্রত্যাখ্যান"}
                            </button>
                          </form>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </Panel>
      )}

      {section === "clients" && (
        <Panel title={`ক্লায়েন্ট অ্যাকাউন্ট · ${clients.length}`}>
          {!clients.length ? <Empty>এখনো কোনো ক্লায়েন্ট নিবন্ধন করেনি।</Empty> : (
            <div className="space-y-3">
              {clients.map((client) => (
                <article key={client.id} className={`${card} flex flex-wrap items-center justify-between gap-3`}>
                  <div>
                    <p className="font-serif-bn text-[14px] font-bold text-ink">{client.name}{client.company ? ` · ${client.company}` : ""}</p>
                    <p className="mt-1 text-[10px] text-ink-soft">{client.email} · {client.status} · যোগদান {client.createdAt.slice(0, 10)}</p>
                  </div>
                  {canManage && client.role === "client" && (
                    <form action={updateAdClientStatus} className="flex gap-2">
                      <input type="hidden" name="clientId" value={client.id} />
                      {client.status === "approved" ? (
                        <><input type="hidden" name="status" value="suspended" /><button className="border border-alizarin/30 px-3 py-2 text-[10px] font-bold text-alizarin">স্থগিত করুন</button></>
                      ) : (
                        <><input type="hidden" name="status" value="approved" /><button className="border border-lime/40 px-3 py-2 text-[10px] font-bold text-lime">অনুমোদন দিন</button></>
                      )}
                    </form>
                  )}
                </article>
              ))}
            </div>
          )}
        </Panel>
      )}

      {section === "templates" && (
        <Panel title={`সংরক্ষিত creative template · ${new Set(creatives.map((item) => item.templateId)).size}`}>
          {creatives.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...new Set(creatives.map((item) => item.templateId))].map((template) => (
                <div key={template} className={card}>
                  <p className="font-mono-x text-[11px] font-bold uppercase text-alizarin">{template}</p>
                  <p className="mt-2 text-[11px] text-ink-soft">{creatives.filter((item) => item.templateId === template).length} টি creative এই template ব্যবহার করছে।</p>
                </div>
              ))}
            </div>
          ) : <Empty>কোনো creative template এখনও ব্যবহৃত হয়নি।</Empty>}
        </Panel>
      )}

      {(section === "studio" || section === "builder") && (
        <Panel title={section === "studio" ? "ক্রিয়েটিভ পরিচালনা" : "লেআউট ও creative কাঠামো"}>
          <p className="max-w-3xl text-[12px] leading-relaxed text-ink-soft">
            ক্লায়েন্টের creative-গুলো তাদের নিজস্ব account-এ সংরক্ষিত থাকে। নিরাপদ client-scoped builder/studio থেকে client-দের creative তৈরি করতে বলুন; admin হিসেবে এখান থেকে preview ও template ব্যবহার পর্যালোচনা করুন।
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/admin/ads/templates" className="border border-ink/20 px-3 py-2 text-[10px] font-bold text-ink">টেমপ্লেট দেখুন</Link>
            <Link href="/admin/ads/clients" className="border border-ink/20 px-3 py-2 text-[10px] font-bold text-ink">ক্লায়েন্ট পরিচালনা</Link>
            <Link href="/portal/login" className="bg-ink px-3 py-2 text-[10px] font-bold text-paper">ক্লায়েন্ট পোর্টাল</Link>
          </div>
          {creatives.length > 0 && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {creatives.slice(0, 8).map((creative) => (
                <div key={creative.id} className={card}>
                  <p className="text-[12px] font-bold text-ink">{creative.name}</p>
                  <p className="mt-1 font-mono-x text-[9px] uppercase text-ink-soft">{creative.templateId} · {creative.palette} · {creative.baseLang}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {section === "payments" && (
        <Panel title="পেমেন্ট ইন্টিগ্রেশন অবস্থা">
          <p className="text-[12px] leading-relaxed text-ink-soft">
            এই deployment-এ কোনো payment gateway configured নেই। বুকিংয়ের মূল্য একটি request estimate; পেমেন্ট যাচাই না করে booking active করবেন না। HTML/Google ad configuration এবং platform billing আলাদা।
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className={card}><p className="text-[10px] text-ink-soft">বুকিং estimate</p><p className="mt-1 font-display text-[20px] font-bold text-ink">৳{bookings.reduce((sum, item) => sum + item.totalBdt, 0).toLocaleString()}</p></div>
            <div className={card}><p className="text-[10px] text-ink-soft">অনুমোদন/পেমেন্ট অপেক্ষায়</p><p className="mt-1 font-display text-[20px] font-bold text-ink">{bookings.filter((item) => item.status === "draft").length}</p></div>
          </div>
        </Panel>
      )}

      {section === "activity" && (
        <Panel title={`সাম্প্রতিক delivery events · ${events.length}`}>
          {!events.length ? <Empty>এখনো কোনো delivery event রেকর্ড হয়নি।</Empty> : (
            <div className="divide-y divide-ink/10">
              {events.map((event) => (
                <div key={event.id} className="grid gap-1 py-3 text-[10px] sm:grid-cols-[1fr_120px_120px_160px] sm:items-center">
                  <span className="font-mono-x text-ink">{event.slotKey} · {event.bookingId || "booking unavailable"}</span>
                  <span className="font-bold uppercase text-alizarin">{event.kind}</span>
                  <span className="text-ink-soft">{event.device || "device unknown"}</span>
                  <time className="text-ink-soft">{event.createdAt.replace("T", " ").slice(0, 16)}</time>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
