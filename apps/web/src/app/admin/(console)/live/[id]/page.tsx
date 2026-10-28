import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Eye, Pin, PinOff, Radio, Trash2 } from "lucide-react";
import {
  getLiveEventAdmin,
  getLiveEventFeed,
  getSettings,
  parseAppConfig,
} from "@hoichoi/db";
import { LiveEventForm } from "@/components/admin/live/LiveEventForm";
import { LiveDeleteButton } from "@/components/admin/live/LiveDeleteButton";
import { bn, bnCompact, bnTime, clsx } from "@/lib/live-format";
import {
  answerLiveQuestion,
  approveCleanComments,
  changeLiveEventStatus,
  changePollStatus,
  createPollAction,
  deleteLiveUpdate,
  moderateComment,
  moderateQuestion,
  pinComment,
  pinLiveUpdate,
  publishLiveUpdate,
  saveScoreboardAction,
} from "../actions";

export const dynamic = "force-dynamic";

const UPDATE_KINDS = [
  ["update", "সাধারণ আপডেট"],
  ["key", "গুরুত্বপূর্ণ"],
  ["breaking", "ব্রেকিং"],
  ["quote", "উদ্ধৃতি"],
  ["stat", "ডেটা / পরিসংখ্যান"],
];

export default async function LiveEventControlPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, settings] = await Promise.all([getLiveEventAdmin(id), getSettings()]);
  if (!data) notFound();
  const { event } = data;
  const config = parseAppConfig(settings.app_config_json);
  const feed = await getLiveEventFeed(event.slug, "", {
    refreshSeconds: config.live_events.refresh_seconds,
    floatingPlayer: config.live_events.floating_player,
  });
  const pendingComments = data.comments.filter((comment) => comment.status === "pending").length;
  const pendingQuestions = data.questions.filter((question) => question.status === "pending").length;

  return (
    <div>
      <Link href="/admin/live" className="inline-flex items-center gap-1.5 font-mono-x text-[10px] tracking-[0.18em] text-ink-soft uppercase hover:text-ink">
        <ArrowLeft size={12} /> ყველა ইভেন্ট
      </Link>
      <header className="mt-4 flex flex-wrap items-start justify-between gap-4 border-b-2 border-ink pb-5">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className={clsx("px-2.5 py-1 font-mono-x text-[10px] font-bold tracking-[0.18em] uppercase", event.status === "live" ? "bg-live text-white" : event.status === "scheduled" ? "bg-[#ffb454] text-[#1a140d]" : "bg-[#1a140d] text-white")}>
              {event.status === "live" ? "● LIVE" : event.status === "scheduled" ? "আসন্ন" : "শেষ"}
            </span>
            {event.status === "live" && <span className="inline-flex items-center gap-1 font-mono-x text-[11px] text-live"><Eye size={12} /> {bnCompact(feed?.viewers ?? 0)} এখন দেখছেন</span>}
            <span className="font-mono-x text-[10.5px] text-ink-soft">/{event.slug}</span>
          </div>
          <h1 className="mt-2 font-serif-bn text-[24px] leading-snug font-black text-ink md:text-[30px]">{event.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {event.status !== "live" ? (
            <form action={changeLiveEventStatus.bind(null, event.id, "live")}>
              <button type="submit" className="bg-live px-4 py-2.5 text-[12px] font-bold text-white">● লাইভ শুরু করুন</button>
            </form>
          ) : (
            <form action={changeLiveEventStatus.bind(null, event.id, "ended")}>
              <button type="submit" className="border border-ink/25 px-4 py-2.5 text-[12px] font-bold text-ink">■ লাইভ শেষ করুন</button>
            </form>
          )}
          <Link href={`/live/${event.slug}`} target="_blank" className="inline-flex items-center gap-1.5 border border-ink/20 px-4 py-2.5 text-[12px] font-bold text-ink hover:border-ink">
            পাবলিক পাতা <ArrowUpRight size={13} />
          </Link>
          <LiveDeleteButton id={event.id} />
        </div>
      </header>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["এখনকার দর্শক", bnCompact(feed?.viewers ?? 0)],
          ["লাইভ আপডেট", bn(feed?.totals.updates ?? 0)],
          ["অনুমোদিত মন্তব্য", bn(feed?.totals.comments ?? 0)],
          ["রিঅ্যাকশন", bn(feed?.totals.reactions ?? 0)],
          ["পোল ভোট", bn(feed?.totals.votes ?? 0)],
        ].map(([label, value]) => (
          <div key={label} className="border border-ink/15 bg-card px-4 py-3">
            <p className="font-mono-x text-[9px] tracking-[0.15em] text-ink-soft uppercase">{label}</p>
            <p className="mt-1 font-display text-[22px] font-bold text-ink">{value}</p>
          </div>
        ))}
      </div>

      <nav className="no-scrollbar mt-6 flex gap-2 overflow-x-auto border-b border-ink/15 pb-3 font-mono-x text-[10px] tracking-[0.12em] uppercase">
        <a href="#event-settings" className="shrink-0 text-ink-soft hover:text-ink">ইভেন্ট সেটিংস</a>
        <a href="#updates" className="shrink-0 text-ink-soft hover:text-ink">আপডেট</a>
        <a href="#scoreboard" className="shrink-0 text-ink-soft hover:text-ink">স্কোর ও তথ্য</a>
        <a href="#polls" className="shrink-0 text-ink-soft hover:text-ink">পোল</a>
        <a href="#moderation" className="shrink-0 text-ink-soft hover:text-ink">মডারেশন ({bn(pendingComments + pendingQuestions)})</a>
      </nav>

      <section id="event-settings" className="mt-8 scroll-mt-20 border border-line bg-paper p-5 md:p-7">
        <p className="eyebrow">▚ EVENT SETTINGS</p>
        <h2 className="mt-1 mb-5 font-serif-bn text-[22px] font-black text-ink">ইভেন্টের তথ্য ও থিম</h2>
        <LiveEventForm event={event} />
      </section>

      <section id="updates" className="mt-10 scroll-mt-20 border border-line bg-paper p-5 md:p-7">
        <p className="eyebrow">▚ VERIFIED LIVE DESK</p>
        <h2 className="mt-1 font-serif-bn text-[22px] font-black text-ink">লাইভ আপডেট</h2>
        <p className="mt-1 text-[12px] text-ink-soft">নতুন তথ্য প্রকাশের আগে যাচাই করুন; প্রকাশের পর আপডেট পাবলিক পাতায় সঙ্গে সঙ্গে দেখা যাবে।</p>
        <form action={publishLiveUpdate} className="mt-5 grid gap-3 border border-ink/15 bg-card p-4 md:grid-cols-2">
          <input type="hidden" name="eventId" value={event.id} />
          <label>
            <span className="field-label">আপডেটের ধরন</span>
            <select name="kind" className="field">{UPDATE_KINDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          </label>
          <label>
            <span className="field-label">সম্পাদকের নাম</span>
            <input name="author" defaultValue="হৈচৈ ডেস্ক" className="field" />
          </label>
          <label className="md:col-span-2">
            <span className="field-label">শিরোনাম</span>
            <input name="title" maxLength={200} className="field" />
          </label>
          <label className="md:col-span-2">
            <span className="field-label">যাচাইকৃত আপডেট *</span>
            <textarea name="body" required minLength={2} maxLength={3000} rows={4} className="field" />
          </label>
          <label className="md:col-span-2">
            <span className="field-label">ছবি / মিডিয়া URL (ঐচ্ছিক)</span>
            <input name="mediaUrl" type="url" className="field font-mono-x !text-[11px]" />
          </label>
          <div className="md:col-span-2"><button className="bg-alizarin px-4 py-2.5 text-[12px] font-bold text-white">আপডেট প্রকাশ করুন →</button></div>
        </form>
        <div className="mt-5 divide-y divide-ink/10">
          {data.updates.length ? data.updates.map((update) => (
            <article key={update.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-mono-x text-[9px] tracking-[0.12em] text-ink-soft uppercase">
                  <span className={clsx("px-1.5 py-0.5", update.kind === "breaking" ? "bg-live text-white" : update.kind === "key" ? "bg-lime text-paper" : "border border-ink/20")}>{update.kind}</span>
                  {bnTime(update.createdAt)} · {update.author}
                  {update.pinned && <span className="text-alizarin">পিন করা</span>}
                </p>
                {update.title && <h3 className="mt-1 font-serif-bn text-[16px] font-bold text-ink">{update.title}</h3>}
                <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-soft">{update.body}</p>
                {update.mediaUrl && <a href={update.mediaUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block break-all text-[11px] text-alizarin underline">মিডিয়া লিংক</a>}
              </div>
              <div className="flex shrink-0 gap-2">
                <form action={pinLiveUpdate.bind(null, update.id, event.id, !update.pinned)}>
                  <button title={update.pinned ? "পিন সরান" : "পিন করুন"} className="border border-ink/20 p-2 text-ink-soft hover:text-ink">{update.pinned ? <PinOff size={13} /> : <Pin size={13} />}</button>
                </form>
                <form action={deleteLiveUpdate.bind(null, update.id, event.id)}>
                  <button title="আপডেট মুছুন" className="border border-alizarin/30 p-2 text-alizarin hover:bg-alizarin hover:text-white"><Trash2 size={13} /></button>
                </form>
              </div>
            </article>
          )) : <p className="py-6 text-center text-[12.5px] text-ink-soft">এখনো কোনো লাইভ আপডেট প্রকাশিত হয়নি।</p>}
        </div>
      </section>

      <section id="scoreboard" className="mt-10 scroll-mt-20 border border-line bg-paper p-5 md:p-7">
        <p className="eyebrow">▚ REAL-TIME DATA</p>
        <h2 className="mt-1 font-serif-bn text-[22px] font-black text-ink">স্কোরবোর্ড ও গুরুত্বপূর্ণ তথ্য</h2>
        <p className="mt-1 text-[12px] text-ink-soft">শুধু যাচাইকৃত ফল/পরিসংখ্যান লিখুন। প্রতিটি আইটেমের লাইন: লেবেল | সংখ্যা | #রং | বর্ণনা | প্রদর্শিত মান।</p>
        <form action={saveScoreboardAction} className="mt-5 grid gap-4 md:grid-cols-2">
          <input type="hidden" name="eventId" value={event.id} />
          <label>
            <span className="field-label">স্কোরবোর্ডের ধরন</span>
            <select name="scoreKind" defaultValue={event.scoreboard?.kind ?? "metrics"} className="field">
              <option value="match">খেলা / মুখোমুখি</option>
              <option value="election">নির্বাচনী ফল</option>
              <option value="metrics">পরিসংখ্যান</option>
            </select>
          </label>
          <label>
            <span className="field-label">শিরোনাম</span>
            <input name="scoreTitle" defaultValue={event.scoreboard?.title ?? ""} className="field" />
          </label>
          <label>
            <span className="field-label">নোট</span>
            <input name="scoreNote" defaultValue={event.scoreboard?.note ?? ""} className="field" />
          </label>
          <label>
            <span className="field-label">অগ্রগতি (ঐচ্ছিক, ০–১০০)</span>
            <input name="progress" type="number" min={0} max={100} defaultValue={event.scoreboard?.progress ?? ""} className="field" />
          </label>
          <label className="md:col-span-2">
            <span className="field-label">ডেটা আইটেম</span>
            <textarea
              name="items"
              rows={4}
              defaultValue={(event.scoreboard?.items ?? []).map((item) => `${item.label} | ${item.value} | ${item.color ?? ""} | ${item.sub ?? ""} | ${item.display ?? ""}`).join("\n")}
              className="field font-mono-x !text-[11px]"
            />
          </label>
          <label className="md:col-span-2">
            <span className="field-label">এক নজরে গুরুত্বপূর্ণ তথ্য (প্রতি লাইনে একটি)</span>
            <textarea name="keyPoints" rows={4} defaultValue={event.keyPoints.join("\n")} className="field" />
          </label>
          <div className="md:col-span-2"><button className="bg-ink px-4 py-2.5 text-[12px] font-bold text-paper">স্কোর ও তথ্য সংরক্ষণ করুন</button></div>
        </form>
      </section>

      <section id="polls" className="mt-10 scroll-mt-20 border border-line bg-paper p-5 md:p-7">
        <p className="eyebrow">▚ READER POLL</p>
        <h2 className="mt-1 font-serif-bn text-[22px] font-black text-ink">লাইভ পোল</h2>
        {event.pollsEnabled ? (
          <>
            <form action={createPollAction} className="mt-5 grid gap-3 border border-ink/15 bg-card p-4">
              <input type="hidden" name="eventId" value={event.id} />
              <label>
                <span className="field-label">প্রশ্ন</span>
                <input name="question" required minLength={3} maxLength={300} className="field" />
              </label>
              <label>
                <span className="field-label">অপশন (প্রতি লাইনে একটি, ২–১২টি)</span>
                <textarea name="options" required rows={3} className="field" />
              </label>
              <button className="w-fit bg-ink px-4 py-2.5 text-[12px] font-bold text-paper">পোল তৈরি করুন</button>
            </form>
            <div className="mt-5 space-y-3">
              {data.polls.length ? data.polls.map((poll) => (
                <article key={poll.id} className="border border-ink/15 bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-serif-bn text-[15px] font-bold text-ink">{poll.question}</p>
                      <p className="mt-1 font-mono-x text-[9px] text-ink-soft uppercase">{poll.status} · {bnTime(poll.createdAt)}</p>
                      <ul className="mt-2 space-y-1 text-[12px] text-ink-soft">{poll.options.map((option) => <li key={option.id}>• {option.label}</li>)}</ul>
                    </div>
                    <form action={changePollStatus.bind(null, poll.id, event.id, poll.status === "open" ? "closed" : "open")}>
                      <button className="border border-ink/25 px-3 py-2 text-[11px] font-bold text-ink">{poll.status === "open" ? "পোল বন্ধ করুন" : "পোল আবার খুলুন"}</button>
                    </form>
                  </div>
                </article>
              )) : <p className="text-[12px] text-ink-soft">এখনো কোনো পোল তৈরি করা হয়নি।</p>}
            </div>
          </>
        ) : <p className="mt-3 text-[12px] text-ink-soft">এই ইভেন্টে পোল বন্ধ রাখা হয়েছে।</p>}
      </section>

      <section id="moderation" className="mt-10 scroll-mt-20 border border-line bg-paper p-5 md:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">▚ READER MODERATION</p>
            <h2 className="mt-1 font-serif-bn text-[22px] font-black text-ink">মন্তব্য ও প্রশ্নোত্তর</h2>
            <p className="mt-1 text-[11.5px] text-ink-soft">অপেক্ষমাণ মন্তব্য: {bn(pendingComments)} · প্রশ্ন: {bn(pendingQuestions)}</p>
          </div>
          {pendingComments > 0 && (
            <form action={approveCleanComments.bind(null, event.id)}>
              <button className="border border-lime/50 bg-lime/10 px-3 py-2 text-[11px] font-bold text-ink">পরিষ্কার মন্তব্যগুলো অনুমোদন</button>
            </form>
          )}
        </div>

        <div className="mt-5 grid gap-8 xl:grid-cols-2">
          <div>
            <h3 className="border-b border-ink/15 pb-2 font-serif-bn text-[16px] font-bold text-ink">মন্তব্য</h3>
            <div className="divide-y divide-ink/10">
              {data.comments.length ? data.comments.map((comment) => (
                <article key={comment.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2 font-mono-x text-[9px] text-ink-soft">
                    <b className="font-sans text-[12px] text-ink">{comment.name}</b>
                    <span>{bnTime(comment.createdAt)}</span>
                    <span className={clsx("px-1.5 py-0.5 uppercase", comment.status === "approved" ? "bg-lime/15 text-ink" : comment.status === "pending" ? "bg-amberx/15 text-amberx" : "bg-alizarin/10 text-alizarin")}>{comment.status}</span>
                    {comment.pinned && <Pin size={11} className="text-alizarin" />}
                  </div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{comment.body}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {comment.status !== "approved" && <form action={moderateComment.bind(null, comment.id, event.id, "approved")}><button className="border border-lime/40 px-2 py-1 text-[10px] font-bold text-ink">অনুমোদন</button></form>}
                    {comment.status !== "rejected" && <form action={moderateComment.bind(null, comment.id, event.id, "rejected")}><button className="border border-alizarin/30 px-2 py-1 text-[10px] font-bold text-alizarin">প্রত্যাখ্যান</button></form>}
                    {comment.status === "approved" && <form action={pinComment.bind(null, comment.id, event.id, !comment.pinned)}><button className="border border-ink/20 px-2 py-1 text-[10px] font-bold text-ink">{comment.pinned ? "পিন সরান" : "পিন করুন"}</button></form>}
                  </div>
                </article>
              )) : <p className="py-4 text-[12px] text-ink-soft">এখনো কোনো পাঠক মন্তব্য করেননি।</p>}
            </div>
          </div>
          <div>
            <h3 className="border-b border-ink/15 pb-2 font-serif-bn text-[16px] font-bold text-ink">পাঠকের প্রশ্ন</h3>
            <div className="divide-y divide-ink/10">
              {data.questions.length ? data.questions.map((question) => (
                <article key={question.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2 font-mono-x text-[9px] text-ink-soft">
                    <b className="font-sans text-[12px] text-ink">{question.name}</b>
                    <span>{bnTime(question.createdAt)}</span>
                    <span className="uppercase">{question.status}</span>
                    <span>↑ {bn(question.upvotes)}</span>
                  </div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink">{question.body}</p>
                  {question.answer && <p className="mt-1 border-l-2 border-lime pl-2 text-[12px] text-ink-soft">উত্তর: {question.answer}</p>}
                  {question.status === "pending" && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <form action={moderateQuestion.bind(null, question.id, event.id, "approved")}><button className="border border-lime/40 px-2 py-1 text-[10px] font-bold text-ink">অনুমোদন</button></form>
                      <form action={moderateQuestion.bind(null, question.id, event.id, "hidden")}><button className="border border-alizarin/30 px-2 py-1 text-[10px] font-bold text-alizarin">লুকান</button></form>
                    </div>
                  )}
                  {question.status === "approved" && (
                    <form action={answerLiveQuestion} className="mt-2 flex gap-2">
                      <input type="hidden" name="eventId" value={event.id} />
                      <input type="hidden" name="questionId" value={question.id} />
                      <input name="answer" required minLength={2} maxLength={1000} defaultValue={question.answer} className="field !py-1.5 !text-[11px]" placeholder="সম্পাদকের যাচাইকৃত উত্তর" />
                      <button className="shrink-0 bg-ink px-3 py-1.5 text-[10px] font-bold text-paper">উত্তর দিন</button>
                    </form>
                  )}
                </article>
              )) : <p className="py-4 text-[12px] text-ink-soft">এখনো কোনো পাঠক প্রশ্ন করেননি।</p>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
