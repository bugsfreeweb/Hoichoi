import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Eye, MapPin, Radio } from "lucide-react";
import { getLiveEventCards, getSettings, parseAppConfig } from "@hoichoi/db";
import { notFound } from "next/navigation";
import { bn, bnCompact, bnDateTime, bnTime, clsx } from "@/lib/live-format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "লাইভ কেন্দ্র" };

function StatusPill({ status }: { status: "live" | "scheduled" | "ended" }) {
  const styles = status === "live"
    ? "bg-live text-white"
    : status === "scheduled"
      ? "bg-[#ffb454] text-[#1a140d]"
      : "bg-[#1a140d] text-white";
  const label = status === "live" ? "LIVE" : status === "scheduled" ? "আসন্ন" : "রিপ্লে";
  return <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 font-mono-x text-[9px] font-bold tracking-[0.16em] uppercase", styles)}>{label}</span>;
}

function EventCard({ event, featured = false }: { event: Awaited<ReturnType<typeof getLiveEventCards>>[number]; featured?: boolean }) {
  return (
    <Link href={`/live/${event.slug}`} className="group block">
      <div className={clsx("frame-press relative overflow-hidden bg-[#0a0c10]", featured ? "shadow-[8px_8px_0_0_var(--color-ink)]" : "")}>
        <div className={featured ? "aspect-[16/8.5]" : "aspect-[16/9.5]"}>
          {event.coverImage ? (
            <img src={event.coverImage} alt="" className="h-full w-full object-cover opacity-90 transition duration-700 group-hover:scale-[1.03]" />
          ) : (
            <div className="surface-night h-full w-full" aria-label="ইভেন্টের কভার ছবি যোগ করা হয়নি" />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <span className="absolute top-3 left-3"><StatusPill status={event.status} /></span>
        <span className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 font-mono-x text-[9px] tracking-[0.12em] text-white uppercase backdrop-blur-sm">
          {event.status === "live" ? <><Eye size={11} /> {bnCompact(event.viewers)} দেখছেন</> : bnDateTime(event.startsAt)}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="px-3 py-1 text-[11px] font-bold text-white" style={{ background: event.categoryColor }}>{event.category}</span>
        {event.location && <span className="flex items-center gap-1 text-[11.5px] text-ink-soft"><MapPin size={11} /> {event.location}</span>}
      </div>
      <h3 className={clsx("link-sweep mt-3 inline font-serif-bn leading-[1.35] font-extrabold text-ink", featured ? "text-[26px] md:text-[30px]" : "text-[20px]")}>{event.title}</h3>
      {event.summary && <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-ink-soft">{event.summary}</p>}
      <p className="mt-3 flex items-center gap-3 font-mono-x text-[10px] text-ink-soft">
        <span>{bn(event.updates)} আপডেট</span>
        {event.lastUpdate && <span>· সর্বশেষ {bnTime(event.lastUpdate)}</span>}
        <span className="ml-auto flex items-center gap-1 font-sans text-[12px] font-bold text-ink group-hover:text-alizarin">
          {event.status === "live" ? "লাইভ দেখুন" : event.status === "scheduled" ? "বিস্তারিত" : "রিপ্লে"} <ArrowRight size={13} />
        </span>
      </p>
    </Link>
  );
}

export default async function LiveHubPage() {
  const settings = await getSettings();
  if (!parseAppConfig(settings.app_config_json).show_live_events) notFound();
  const cards = await getLiveEventCards();
  const live = cards.filter((event) => event.status === "live");
  const upcoming = cards.filter((event) => event.status === "scheduled");
  const ended = cards.filter((event) => event.status === "ended");
  const totalViewers = live.reduce((sum, event) => sum + event.viewers, 0);

  return (
    <>
      <section className="bg-night-grid relative overflow-hidden border-b border-ink/10">
        <div className="pointer-events-none absolute inset-0"><div className="drift absolute -bottom-40 -left-40 h-[420px] w-[420px] rounded-full bg-alizarin/15 blur-[110px]" /></div>
        <div className="relative mx-auto max-w-site px-4 py-14 md:px-8">
          <span className="flex w-fit items-center gap-2 rounded-full border border-lime/40 bg-lime/10 px-3 py-1 font-mono-x text-[10px] tracking-[0.2em] text-lime uppercase"><Radio size={11} /> হৈচৈ লাইভ ডেস্ক</span>
          <h1 className="headline-grad mt-5 font-serif-bn text-[56px] leading-[0.95] font-black tracking-tight md:text-[88px]">লাইভ<span className="text-alizarin">!</span></h1>
          <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-ink/60">সরাসরি সম্প্রচার, সম্পাদকের যাচাইকৃত আপডেট, লাইভ ডেটা ও পাঠকের অংশগ্রহণ — চলমান, আসন্ন ও সংরক্ষিত কভারেজ।</p>
          <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
            {[[bn(live.length), "লাইভ চলছে"], [bnCompact(totalViewers), "এখন দেখছেন"], [bn(upcoming.length), "আসন্ন"]].map(([value, label]) => (
              <div key={label} className="border-l border-ink/12 pl-3"><span className="font-serif-bn text-[28px] leading-none font-black text-ink">{value}</span><p className="mt-1.5 font-mono-x text-[9px] tracking-[0.16em] text-ink/40 uppercase">{label}</p></div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-site px-4 py-14 md:px-8">
        {cards.length === 0 ? (
          <div className="border border-dashed border-ink/25 px-5 py-12 text-center">
            <Radio size={22} className="mx-auto text-ink-soft" />
            <h2 className="mt-3 font-serif-bn text-[21px] font-bold text-ink">এখন কোনো লাইভ কভারেজ নেই</h2>
            <p className="mt-1 text-[12.5px] text-ink-soft">সম্পাদকীয় দল নতুন ইভেন্ট প্রকাশ করলে এখানে দেখা যাবে।</p>
          </div>
        ) : (
          <>
            {live.length > 0 && <section><p className="eyebrow">▚ NOW LIVE · এই মুহূর্তে</p><h2 className="mt-2 font-serif-bn text-[32px] font-black md:text-[40px]">লাইভ চলছে</h2><div className="mt-8 grid gap-x-8 gap-y-14 lg:grid-cols-2">{live.map((event, index) => <EventCard key={event.id} event={event} featured={index === 0} />)}</div></section>}
            {upcoming.length > 0 && <section className="mt-20 border-t-2 border-ink pt-10"><p className="eyebrow">▚ COMING UP</p><h2 className="mt-2 font-serif-bn text-[32px] font-black">আসন্ন লাইভ</h2><div className="mt-8 grid gap-x-8 gap-y-14 sm:grid-cols-2 xl:grid-cols-3">{upcoming.map((event) => <EventCard key={event.id} event={event} />)}</div></section>}
            {ended.length > 0 && <section className="mt-20 border-t-2 border-ink pt-10"><p className="eyebrow">▚ ARCHIVE · REPLAY</p><h2 className="mt-2 font-serif-bn text-[32px] font-black">শেষ হওয়া লাইভ</h2><div className="mt-8 grid gap-x-8 gap-y-14 sm:grid-cols-2 xl:grid-cols-3">{ended.map((event) => <EventCard key={event.id} event={event} />)}</div></section>}
          </>
        )}
      </div>
    </>
  );
}
