import { listPolls, getPollResults } from "@hoichoi/db";
import {
  deleteStandalonePoll,
  toggleStandalonePoll,
  featureStandalonePoll,
  updateStandalonePoll,
} from "./actions";
import { StandalonePollForm } from "@/components/admin/polls/StandalonePollForm";

export const dynamic = "force-dynamic";

const TEMPLATES = ["bar", "battle", "donut", "card", "rank", "meter"];

function dhakaDateInput(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Date(date.getTime() + 6 * 60 * 60_000).toISOString().slice(0, 16);
}

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
        <StandalonePollForm />
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
                    <p className="mt-1 font-mono-x text-[9px] text-ink-soft uppercase">{poll.status} · মোট ভোট: {total} · ইম্প্রেশন: {poll.impressions} · শেয়ার: {poll.shares}</p>
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
                    <a href={`/poll/${poll.slug}`} target="_blank" rel="noreferrer" className="border border-ink/25 px-3 py-2 text-[11px] font-bold text-ink">পাবলিক পোল</a>
                  </div>
                </div>
                <details className="mt-4 border-t border-ink/10 pt-3">
                  <summary className="cursor-pointer text-[11px] font-bold text-ink">পোল সম্পাদনা ও ফলাফল সেটিং</summary>
                  <form action={updateStandalonePoll.bind(null, poll.id)} className="mt-4 grid gap-3 md:grid-cols-2">
                    <label><span className="field-label">বিষয়</span><input name="topic" required minLength={2} maxLength={120} defaultValue={poll.topic} className="field" /></label>
                    <label><span className="field-label">রং</span><input name="topicColor" type="color" defaultValue={poll.topicColor} className="field !h-[42px] !p-1" /></label>
                    <label className="md:col-span-2"><span className="field-label">প্রশ্ন</span><input name="question" required minLength={3} maxLength={300} defaultValue={poll.question} className="field" /></label>
                    <label className="md:col-span-2"><span className="field-label">বিবরণ</span><textarea name="description" rows={2} maxLength={1200} defaultValue={poll.description} className="field" /></label>
                    <label className="md:col-span-2"><span className="field-label">অপশন · প্রতি লাইনে একটি</span><textarea name="options" required rows={3} defaultValue={poll.options.map((option) => option.label).join("\n")} className="field" /></label>
                    <label><span className="field-label">ডিজাইন</span><select name="template" defaultValue={poll.template} className="field">{TEMPLATES.map((template) => <option key={template} value={template}>{template}</option>)}</select></label>
                    <label><span className="field-label">অবস্থা</span><select name="status" defaultValue={poll.status} className="field"><option value="open">চলমান</option><option value="scheduled">আসন্ন</option><option value="closed">বন্ধ</option></select></label>
                    <label><span className="field-label">শুরুর সময় · ঢাকা</span><input type="datetime-local" name="startsAt" defaultValue={dhakaDateInput(poll.startsAt)} className="field" /></label>
                    <label><span className="field-label">শেষের সময় · ঐচ্ছিক</span><input type="datetime-local" name="endsAt" defaultValue={poll.endsAt ? dhakaDateInput(poll.endsAt) : ""} className="field" /></label>
                    <label><span className="field-label">ফলাফল দেখানোর নিয়ম</span><select name="resultsMode" defaultValue={poll.resultsMode} className="field"><option value="after-vote">ভোট দেওয়ার পর</option><option value="always">সব সময়</option><option value="after-close">ভোট বন্ধ হলে</option></select></label>
                    <label className="flex items-center gap-2 border border-ink/15 bg-card px-3 py-2.5 text-[11px] font-semibold text-ink"><input type="checkbox" name="allowMultiple" defaultChecked={poll.allowMultiple} className="accent-alizarin" />একাধিক অপশনে ভোট</label>
                    <p className="md:col-span-2 text-[10px] text-ink-soft">অপশনের ক্রম অপরিবর্তিত থাকলে আগের ভোটগুলো সংরক্ষিত থাকবে।</p>
                    <div className="md:col-span-2"><button className="bg-ink px-4 py-2.5 text-[11px] font-bold text-paper">পরিবর্তন সংরক্ষণ</button></div>
                  </form>
                </details>
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