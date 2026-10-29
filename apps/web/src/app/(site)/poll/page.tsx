import { getFeaturedPoll, getPollResults } from "@hoichoi/db";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PollPage() {
  const poll = await getFeaturedPoll();
  if (!poll) notFound();
  const results = await getPollResults(poll.id);
  const total = results.reduce((sum, item) => sum + item.votes, 0);

  return (
    <main className="mx-auto max-w-site px-4 py-12 md:px-8 md:py-16">
      <p className="eyebrow">▚ LIVE POLLS · পাঠকের মতামত</p>
      <h1 className="mt-2 font-serif-bn text-[32px] font-black text-ink md:text-[40px]">{poll.topic}</h1>
      <div className="mt-8 border border-line bg-paper p-5 md:p-7">
        <p className="font-serif-bn text-[20px] font-bold text-ink">{poll.question}</p>
        <ul className="mt-4 space-y-3">
          {poll.options.map((option) => {
            const votes = results.find((item) => item.optionId === option.id)?.votes ?? 0;
            const percent = total > 0 ? Math.round((votes / total) * 100) : 0;
            return (
              <li key={option.id}>
                <div className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="text-ink">{option.label}</span>
                  <span className="font-mono-x text-[11px] text-ink-soft">{votes} · {percent}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden bg-ink/10">
                  <div className="h-full bg-alizarin" style={{ width: `${percent}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 font-mono-x text-[10px] text-ink-soft uppercase">মোট ভোট: {total}</p>
      </div>
    </main>
  );
}