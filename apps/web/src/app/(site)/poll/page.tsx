import { getFeaturedPoll, getPollResults, listPolls, pollResultsVisible } from "@hoichoi/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { parseAppConfig } from "@hoichoi/db";
import { PollWidget } from "@/components/polls/PollWidget";
import { bnNum } from "@/lib/bn";

export const dynamic = "force-dynamic";

export default async function PollPage() {
  const [settings, polls] = await Promise.all([getSettings(), listPolls()]);
  if (!parseAppConfig(settings.app_config_json).show_live_polls) notFound();

  const featured = await getFeaturedPoll();
  const summaries = await Promise.all(polls.map(async (poll) => ({
    poll,
    results: pollResultsVisible(poll, false) ? await getPollResults(poll.id) : [],
  })));
  const openPolls = summaries.filter(({ poll }) => poll.status === "open" && poll.id !== featured?.id);
  const scheduledPolls = summaries.filter(({ poll }) => poll.status === "scheduled");
  const closedPolls = summaries.filter(({ poll }) => poll.status === "closed");
  const totalVotes = summaries.reduce((sum, { results }) => sum + results.reduce((count, result) => count + result.votes, 0), 0);

  return (
    <main>
      <section className="relative overflow-hidden border-b border-ink/10 bg-night-grid">
        <div className="pointer-events-none absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full bg-alizarin/15 blur-[110px]" />
        <div className="pointer-events-none absolute -right-20 bottom-[-140px] h-[380px] w-[380px] rounded-full bg-lime/10 blur-[120px]" />
        <div className="relative mx-auto max-w-site px-4 py-12 md:px-8 md:py-16">
          <p className="font-mono-x text-[10px] tracking-[0.24em] text-lime uppercase">▚ পাঠকের মতামত · LIVE POLLS</p>
          <h1 className="mt-4 font-serif-bn text-[clamp(2.5rem,7vw,5.25rem)] leading-[1.02] font-black text-ink">
            আপনার মতামত <span className="text-alizarin">গুরুত্বপূর্ণ</span>
          </h1>
          <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-ink-soft">
            চলমান বিষয় নিয়ে সরাসরি ভোট দিন, ফলাফল দেখুন, আর অন্য পাঠকদের মতের সঙ্গে তুলনা করুন।
          </p>
          <div className="mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [bnNum(polls.filter((poll) => poll.status === "open").length), "চলমান পোল"],
              [bnNum(totalVotes), "দেখানো ভোট"],
              [bnNum(new Set(polls.map((poll) => poll.topic)).size), "বিষয়"],
              ["৬", "ভোটের ডিজাইন"],
            ].map(([value, label]) => (
              <div key={label} className="border-l border-ink/15 pl-3">
                <p className="font-serif-bn text-[25px] leading-none font-black text-ink">{value}</p>
                <p className="mt-1.5 font-mono-x text-[9px] tracking-[0.14em] text-ink-soft uppercase">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-site px-4 py-10 md:px-8 md:py-14">
        {featured && (
          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow">▚ FEATURED POLL · এখন ভোট দিন</p>
                <h2 className="mt-1 font-serif-bn text-[25px] font-black text-ink md:text-[32px]">প্রধান পোল</h2>
              </div>
              <Link href={`/poll/${featured.slug}`} className="text-[12px] font-bold text-alizarin hover:underline">পোলের বিস্তারিত →</Link>
            </div>
            <PollWidget
              poll={featured}
              initialResults={summaries.find(({ poll }) => poll.id === featured.id)?.results ?? []}
            />
          </section>
        )}

        {openPolls.length > 0 && (
          <section className="mt-12">
            <p className="eyebrow">▚ OPEN NOW</p>
            <h2 className="mt-1 font-serif-bn text-[24px] font-black text-ink md:text-[30px]">আরও চলমান পোল</h2>
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {openPolls.map(({ poll, results }) => <PollWidget key={poll.id} poll={poll} initialResults={results} />)}
            </div>
          </section>
        )}

        {scheduledPolls.length > 0 && (
          <section className="mt-12 border-t-2 border-ink pt-8">
            <p className="eyebrow">▚ COMING UP</p>
            <h2 className="mt-1 font-serif-bn text-[24px] font-black text-ink md:text-[30px]">ভোট শীঘ্রই খুলবে</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {scheduledPolls.map(({ poll }) => (
                <Link key={poll.id} href={`/poll/${poll.slug}`} className="group border border-ink/15 bg-card p-4 transition-colors hover:border-ink">
                  <span className="font-mono-x text-[9px] font-bold tracking-[0.16em] uppercase" style={{ color: poll.topicColor }}>{poll.topic}</span>
                  <span className="mt-2 block font-serif-bn text-[16px] font-bold text-ink group-hover:text-alizarin">{poll.question}</span>
                  <span className="mt-3 block text-[11px] text-ink-soft">নির্ধারিত · বিস্তারিত দেখুন →</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {closedPolls.length > 0 && (
          <section className="mt-12 border-t-2 border-ink pt-8">
            <p className="eyebrow">▚ RESULTS · ফলাফল</p>
            <h2 className="mt-1 font-serif-bn text-[24px] font-black text-ink md:text-[30px]">শেষ হওয়া পোল</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {closedPolls.map(({ poll, results }) => {
                const votes = results.reduce((sum, result) => sum + result.votes, 0);
                return (
                  <Link key={poll.id} href={`/poll/${poll.slug}`} className="group border border-ink/15 bg-card p-4 transition-colors hover:border-ink">
                    <span className="font-mono-x text-[9px] font-bold tracking-[0.16em] uppercase" style={{ color: poll.topicColor }}>{poll.topic} · ফল প্রকাশিত</span>
                    <span className="mt-2 block font-serif-bn text-[16px] font-bold text-ink group-hover:text-alizarin">{poll.question}</span>
                    <span className="mt-3 block font-mono-x text-[9px] text-ink-soft">{bnNum(votes)} ভোট · ফলাফল দেখুন →</span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {polls.length === 0 && <p className="mt-8 border border-dashed border-ink/20 px-4 py-10 text-center text-[12px] text-ink-soft">এখনো কোনো পোল প্রকাশিত হয়নি।</p>}
        <Link href="/" className="mt-8 inline-flex text-[12px] font-bold text-alizarin hover:underline">← হোমপেজে ফিরুন</Link>
      </div>
    </main>
  );
}
