import { listPolls, getPollResults } from "@hoichoi/db";
import {
  deleteStandalonePoll,
  toggleStandalonePoll,
  featureStandalonePoll,
  updateStandalonePoll,
} from "./actions";
import { StandalonePollForm } from "@/components/admin/polls/StandalonePollForm";
import { PollTemplatePicker } from "@/components/admin/polls/PollTemplatePicker";
import { PollIntegrityPanel } from "@/components/admin/PollIntegrityPanel";
import { PageHeading } from "@/components/admin/ui/PageHeader";
import { SectionTabs, type SectionTab } from "@/components/admin/ui/SectionTabs";
import { PROGRAM_SECTION } from "@/components/admin/ui/sections";
import { Card, CardHead, StatTile } from "@/components/admin/ui/Card";

export const dynamic = "force-dynamic";

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
      <SectionTabs
        tabs={PROGRAM_SECTION.tabs as unknown as SectionTab[]}
        current="/admin/polls"
        label={PROGRAM_SECTION.label}
      />
      <PageHeading
        emoji="🗳️"
        kicker="LIVE POLLS · পাঠকের মতামত"
        title="লাইভ পোল"
        description="বিষয়ভিত্তিক পোল তৈরি, ডিজাইন বদল, ফলাফল ও অংশগ্রহণ — সব এক পাতায়।"
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="মোট পোল" value={polls.length} />
        <StatTile label="চলমান" value={polls.filter((poll) => poll.status === "open").length} tone="teal" />
        <StatTile
          label="মোট ভোট"
          value={polls.reduce(
            (sum, poll) => sum + (resultMap.get(poll.id) ?? []).reduce((n, item) => n + item.votes, 0),
            0,
          )}
        />
        <StatTile
          label="ইম্প্রেশন"
          value={polls.reduce((sum, poll) => sum + poll.impressions, 0)}
          hint="পোল দেখা হয়েছে"
        />
      </div>

      <Card className="mb-5">
        <CardHead emoji="➕" title="নতুন লাইভ পোল তৈরি করুন" kicker="NEW POLL" />
        <div className="p-5 md:p-6">
          <StandalonePollForm />
        </div>
      </Card>

      <Card>
        <CardHead
          emoji="📊"
          title="সব পোল"
          kicker={`${polls.length} POLLS`}
          note="প্রতিটি পোলের ফল, অংশগ্রহণ ও অখণ্ডতা এখানেই দেখা যায়।"
        />
      <section className="space-y-4 p-4">
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
                    <PollIntegrityPanel pollId={poll.id} />
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
                    <div className="md:col-span-2"><PollTemplatePicker defaultValue={poll.template} /></div>
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
      </Card>
    </div>
  );
}