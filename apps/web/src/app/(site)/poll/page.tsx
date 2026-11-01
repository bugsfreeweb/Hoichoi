import { getFeaturedPoll, getPollVoteCount, listPolls, pollResultsVisible } from "@hoichoi/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PollPage() {
  const [featured, polls] = await Promise.all([getFeaturedPoll(), listPolls()]);
  const summaries = await Promise.all(polls.map(async (poll) => ({
    poll,
    votes: pollResultsVisible(poll, false) ? await getPollVoteCount(poll.id) : null,
  })));

  return (
    <main className="mx-auto max-w-site px-4 py-12 md:px-8 md:py-16">
      <p className="eyebrow">▚ LIVE POLLS · পাঠকের মতামত</p>
      <h1 className="mt-2 font-serif-bn text-[32px] font-black text-ink md:text-[40px]">পাঠকের মতামত</h1>
      <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-soft">খেলা, সমাজ ও চলতি বিষয় নিয়ে পাঠকের সরাসরি মতামত। প্রতিটি পোলে ভোটের নিয়ম আলাদা হতে পারে।</p>
      {featured && (
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-serif-bn text-[20px] font-black text-ink">প্রধান পোল</h2>
            <span className="font-mono-x text-[9px] font-bold tracking-[0.14em] text-alizarin uppercase">Featured</span>
          </div>
          <Link href={`/poll/${featured.slug}`} className="block border border-ink/15 bg-paper p-4 transition-colors hover:border-ink md:p-6">
            <span className="font-mono-x text-[9px] font-bold tracking-[0.15em] uppercase" style={{ color: featured.topicColor }}>{featured.topic} · {featured.template}</span>
            <span className="mt-2 block font-serif-bn text-[19px] font-bold text-ink">{featured.question}</span>
            <span className="mt-2 block text-[11px] text-ink-soft">{featured.status === "open" ? "ভোট চলছে" : featured.status === "scheduled" ? "শিগগিরই শুরু" : "ফলাফল দেখুন"} · বিস্তারিত ও ভোট দিন →</span>
          </Link>
        </section>
      )}
      <section className="mt-10">
        <h2 className="font-serif-bn text-[20px] font-black text-ink">সব পোল</h2>
        {summaries.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {summaries.map(({ poll, votes }) => (
              <Link key={poll.id} href={`/poll/${poll.slug}`} className="group border border-ink/15 bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-[3px_3px_0_0_var(--color-ink)]">
                <span className="flex items-center justify-between gap-3">
                  <span className="font-mono-x text-[9px] font-bold tracking-[0.14em] uppercase" style={{ color: poll.topicColor }}>{poll.topic}</span>
                  <span className="font-mono-x text-[9px] text-ink-soft">{poll.status === "open" ? "● ভোট চলছে" : poll.status === "scheduled" ? "আসন্ন" : "বন্ধ"}</span>
                </span>
                <span className="mt-2 block font-serif-bn text-[15px] leading-snug font-bold text-ink group-hover:text-alizarin">{poll.question}</span>
                <span className="mt-3 flex items-center justify-between border-t border-ink/10 pt-2 font-mono-x text-[9px] text-ink-soft">
                  <span>{poll.options.length}টি অপশন{votes === null ? "" : ` · ${new Intl.NumberFormat("bn-BD").format(votes)}টি ${poll.allowMultiple ? "নির্বাচন" : "ভোট"}`}</span>
                  <span className="font-bold text-ink">দেখুন →</span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-4 border border-dashed border-ink/20 px-4 py-8 text-center text-[12px] text-ink-soft">এখনো কোনো পোল প্রকাশিত হয়নি।</p>
        )}
      </section>
      <Link href="/" className="mt-5 inline-flex text-[12px] font-bold text-alizarin hover:underline">← হোমপেজে ফিরুন</Link>
    </main>
  );
}