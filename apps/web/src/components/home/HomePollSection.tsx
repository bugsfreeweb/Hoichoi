import Link from "next/link";
import type { Poll } from "@hoichoi/db";
import { PollWidget } from "@/components/polls/PollWidget";

export function HomePollSection({
  poll,
  results,
}: {
  poll: Poll | null;
  results: { optionId: string; votes: number }[];
}) {
  if (!poll) return null;
  return (
    <section className="mx-auto max-w-[1400px] px-4 py-10 md:px-8 md:py-14">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">▚ পাঠকের মতামত · LIVE POLL</p>
          <h2 className="mt-2 font-serif-bn text-[25px] font-black text-ink md:text-[32px]">আপনার ভোট দিন</h2>
        </div>
        <Link href="/poll" className="border border-ink/20 px-3 py-2 text-[11px] font-bold text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper">
          সব পোল দেখুন →
        </Link>
      </div>
      <PollWidget poll={poll} initialResults={results} />
    </section>
  );
}
