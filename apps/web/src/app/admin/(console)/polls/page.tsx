import { listPolls, getPollResults } from "@hoichoi/db";
import {
  createStandalonePoll,
  deleteStandalonePoll,
  toggleStandalonePoll,
  featureStandalonePoll,
  changeStandalonePollTemplate,
} from "./actions";

export const dynamic = "force-dynamic";

const TEMPLATES = ["bar", "battle", "donut", "card", "rank", "meter"];

export default async function AdminPollsPage() {
  const polls = await listPolls();
  const results = await Promise.all(polls.map((poll) => getPollResults(poll.id)));
  const resultMap = new Map(polls.map((poll, index) => [poll.id, results[index]]));

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">▚ LIVE POLLS · পাঠকের মতামত</p>
          <h1 className="mt-2 font-serif-bn text-[32px] font-black text-ink md:text-[40px]">লাইভ পোল</h1>
          <p className="mt-1 text-[13px] text-ink-soft">বিষয়ভিত্তিক পোল তৈরি, ডিজাইন বদল, ফলাফল ও অংশগ্রহণ।</p>
        </div>
      </header>

      <section className="mt-8 border border-line bg-paper p-5 md:p-7">
        <p className="eyebrow">▚ NEW POLL</p>
        <h2 className="mt-1 mb-5 font-serif-bn text-[22px] font-black text-ink">নতুন লাইভ পোল তৈরি করুন</h2>
        <form action={createStandalonePoll} className="grid gap-3 md:grid-cols-2">
          <label>
            <span className="field-label">বিষয়</span>
            <input name="topic" required minLength={2} maxLength={120} className="field" placeholder="ক্রিকেট, নির্বাচন..." />
          </label>
          <label>
            <span className="field-label">রং</span>
            <input type="color" name="topicColor" defaultValue="#d2202c" className="field !h-[42px] !p-1" />
          </label>
          <label className="md:col-span-2">
            <span className="field-label">প্রশ্ন</span>
            <input name="question" required minLength={3} maxLength={300} className="field" placeholder="আপনার প্রশ্ন?" />
          </label>
          <label className="md:col-span-2">
            <span className="field-label">অপশন (প্রতি লাইনে একটি, ২–১২টি)</span>
            <textarea name="options" required rows={4} className="field" />
          </label>
          <label className="md:col-span-2">
            <span className="field-label">ডিজাইন</span>
            <select name="template" className="field">
              {TEMPLATES.map((template) => (
                <option key={template} value={template}>{template}</option>
              ))}
            </select>
          </label>
          <div className="md:col-span-2">
            <button className="bg-alizarin px-4 py-2.5 text-[12px] font-bold text-white">পোল তৈরি করুন</button>
          </div>
        </form>
      </section>

      <section className="mt-10 space-y-4">
        {polls.length ? (
          polls.map((poll) => {
            const res = resultMap.get(poll.id) ?? [];
            const total = res.reduce((sum, item) => sum + item.votes, 0);
            return (
              <article key={poll.id} className="border border-line bg-paper p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono-x text-[9px] tracking-[0.16em] text-alizarin uppercase">{poll.topic} · {poll.template}</p>
                    <p className="mt-1 font-serif-bn text-[16px] font-bold text-ink">{poll.question}</p>
                    <p className="mt-1 font-mono-x text-[9px] text-ink-soft uppercase">{poll.status} · মোট ভোট: {total}</p>
                    <ul className="mt-2 space-y-1 text-[12px] text-ink-soft">
                      {poll.options.map((option) => {
                        const votes = res.find((item) => item.optionId === option.id)?.votes ?? 0;
                        const percent = total > 0 ? Math.round((votes / total) * 100) : 0;
                        return (
                          <li key={option.id}>
                            • {option.label} — {votes} ({percent}%)
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={toggleStandalonePoll.bind(null, poll.id, poll.status === "open" ? "closed" : "open")}>
                      <button className="border border-ink/25 px-3 py-2 text-[11px] font-bold text-ink">{poll.status === "open" ? "বন্ধ করুন" : "খুলুন"}</button>
                    </form>
                    <form action={featureStandalonePoll.bind(null, poll.id)}>
                      <button className="border border-ink/25 px-3 py-2 text-[11px] font-bold text-ink">প্রধান</button>
                    </form>
                    <form action={deleteStandalonePoll.bind(null, poll.id)}>
                      <button className="border border-alizarin/30 px-3 py-2 text-[11px] font-bold text-alizarin">মুছুন</button>
                    </form>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <p className="text-[12.5px] text-ink-soft">এখনো কোনো পোল তৈরি করা হয়নি।</p>
        )}
      </section>
    </div>
  );
}