import Link from "next/link";
import { ArrowUpRight, Eye, Plus, Radio, Star } from "lucide-react";
import { getLiveEventCards, listLiveEvents } from "@hoichoi/db";
import { LiveEventForm } from "@/components/admin/live/LiveEventForm";
import { bn, bnCompact, bnDateTime, clsx } from "@/lib/live-format";
import { liveThemeName } from "@/lib/live-themes";
import { changeLiveEventStatus, featureLiveEvent } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminLiveEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; status?: string }>;
}) {
  const { deleted, status } = await searchParams;
  const [events, cards] = await Promise.all([listLiveEvents(), getLiveEventCards()]);
  const activeStatus = status === "live" || status === "scheduled" || status === "ended" ? status : "all";
  const filteredEvents = activeStatus === "all" ? events : events.filter((event) => event.status === activeStatus);
  const cardMap = new Map(cards.map((card) => [card.id, card]));
  const counts = {
    all: events.length,
    live: events.filter((event) => event.status === "live").length,
    scheduled: events.filter((event) => event.status === "scheduled").length,
    ended: events.filter((event) => event.status === "ended").length,
  };

  return (
    <div>
      {deleted && <p role="status" className="mb-5 border border-lime/40 bg-lime/10 px-4 py-3 text-[13px] font-bold text-ink">ইভেন্টটি মুছে ফেলা হয়েছে।</p>}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">▚ LIVE EVENTS · কন্ট্রোল রুম</p>
          <h1 className="mt-2 font-serif-bn text-[32px] font-black text-ink md:text-[40px]">লাইভ ইভেন্ট</h1>
          <p className="mt-1 text-[13px] text-ink-soft">শুধু এখানে তৈরি ও সংরক্ষিত আসল ইভেন্ট দেখানো হয়; কোনো নমুনা বা সিমুলেটেড ডেটা নেই।</p>
        </div>
        <Link href="#new-live-event" className="flex items-center gap-2 bg-alizarin px-4 py-2.5 text-[13px] font-bold text-paper hover:bg-alizarin-deep">
          <Plus size={15} /> নতুন লাইভ ইভেন্ট
        </Link>
      </header>

              <div className="mt-6 flex flex-wrap items-center gap-2">
          {([
            ["all", "সব", counts.all],
            ["live", "চলমান", counts.live],
            ["scheduled", "আসন্ন", counts.scheduled],
            ["ended", "শেষ", counts.ended],
          ] as const).map(([key, label, count]) => (
            <Link
              key={key}
              href={key === "all" ? "/admin/live" : `/admin/live?status=${key}`}
              className={`inline-flex items-center gap-2 border px-3 py-1.5 text-[11.5px] font-bold ${activeStatus === key ? "border-ink bg-ink text-paper" : "border-ink/20 text-ink hover:border-ink"}`}
            >
              {label} <span className="font-mono-x text-[10px] opacity-75">{count}</span>
            </Link>
          ))}
        </div>
        {filteredEvents.length > 0 ? (
        <div className="mt-8 space-y-4">
          {filteredEvents.map((event) => {
            const card = cardMap.get(event.id);
            return (
              <article key={event.id} className={clsx("grid gap-4 border bg-card p-4 md:grid-cols-[180px_1fr_auto]", event.featured ? "border-ink shadow-[5px_5px_0_0_var(--color-ink)]" : "border-line")}>
                <div className="relative aspect-video overflow-hidden bg-[#0a0c10]">
                  {event.coverImage && <img src={event.coverImage} alt="" className="h-full w-full object-cover opacity-90" />}
                  <span className={clsx("absolute top-2 left-2 px-2 py-0.5 font-mono-x text-[9px] font-bold tracking-[0.16em] uppercase", event.status === "live" ? "bg-live text-white" : event.status === "scheduled" ? "bg-[#ffb454] text-[#1a140d]" : "bg-[#1a140d] text-white")}>
                    {event.status === "live" ? "LIVE" : event.status === "scheduled" ? "আসন্ন" : "শেষ"}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="px-2 py-0.5 font-bold text-white" style={{ background: event.categoryColor }}>{event.category}</span>
                    <span className="font-mono-x text-ink-soft">/{event.slug}</span>
                    <span className="font-mono-x text-ink-soft">· {liveThemeName(event.template)}</span>
                    {event.featured && <span className="inline-flex items-center gap-1 bg-lime px-2 py-0.5 font-bold text-paper"><Star size={10} /> হোমে ফিচার্ড</span>}
                  </div>
                  <Link href={`/admin/live/${event.id}`} className="mt-1.5 block font-serif-bn text-[18px] leading-snug font-bold text-ink hover:text-alizarin">{event.title}</Link>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono-x text-[10px] text-ink-soft">
                    {event.status === "live" && <span className="inline-flex items-center gap-1 text-live"><Eye size={11} /> {bnCompact(card?.viewers ?? 0)} এখন দেখছেন</span>}
                    <span>{bn(card?.updates ?? 0)} আপডেট</span>
                    <span>শুরু {bnDateTime(event.startsAt)}</span>
                    <span>{event.streamType.toUpperCase()}</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-start gap-2 md:max-w-[300px] md:justify-end">
                  <Link href={`/admin/live/${event.id}`} className="flex items-center gap-1.5 bg-ink px-3 py-1.5 text-[12px] font-bold text-paper hover:bg-alizarin">
                    <Radio size={13} /> কন্ট্রোল রুম
                  </Link>
                  {event.status !== "live" ? (
                    <form action={changeLiveEventStatus.bind(null, event.id, "live")}>
                      <button type="submit" className="border border-live px-3 py-1.5 text-[11.5px] font-bold text-live hover:bg-live hover:text-white">● লাইভ শুরু</button>
                    </form>
                  ) : (
                    <form action={changeLiveEventStatus.bind(null, event.id, "ended")}>
                      <button type="submit" className="border border-ink/25 px-3 py-1.5 text-[11.5px] font-bold text-ink-soft hover:border-ink">■ শেষ করুন</button>
                    </form>
                  )}
                  {!event.featured && (
                    <form action={featureLiveEvent.bind(null, event.id)}>
                      <button type="submit" className="inline-flex items-center gap-1 border border-ink/20 px-2.5 py-1.5 text-[11px] font-semibold text-ink hover:border-ink"><Star size={11} /> হোমে দিন</button>
                    </form>
                  )}
                  <Link href={`/live/${event.slug}`} target="_blank" className="inline-flex items-center gap-1 border border-ink/15 px-2.5 py-1.5 text-[11px] font-semibold text-ink hover:border-ink">দেখুন <ArrowUpRight size={11} /></Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-8 border border-dashed border-ink/25 bg-paper-deep/40 px-5 py-10 text-center">
          <Radio size={23} className="mx-auto text-ink-soft" />
          <h2 className="mt-3 font-serif-bn text-[20px] font-bold text-ink">এখনো কোনো লাইভ ইভেন্ট নেই</h2>
          <p className="mx-auto mt-1 max-w-lg text-[12.5px] leading-relaxed text-ink-soft">নিচে সত্যিকারের সম্প্রচার, শিরোনাম ও ইভেন্টের তথ্য যোগ করলে সেটি এখানে এবং পাবলিক লাইভ কেন্দ্রে দেখাবে।</p>
        </div>
      )}

      <section id="new-live-event" className="mt-14 scroll-mt-14 border-t-2 border-ink pt-8">
        <p className="eyebrow">▚ NEW LIVE EVENT</p>
        <h2 className="mt-2 font-serif-bn text-[28px] font-black text-ink">নতুন লাইভ ইভেন্ট তৈরি করুন</h2>
        <p className="mt-1 mb-6 text-[13px] text-ink-soft">YouTube, HLS, MP4 বা অনুমোদিত এমবেড লিংক ও সম্পাদকের যাচাইকৃত ইভেন্ট তথ্য দিন।</p>
        <div className="border border-line bg-paper p-5 md:p-7">
          <LiveEventForm />
        </div>
      </section>
    </div>
  );
}
