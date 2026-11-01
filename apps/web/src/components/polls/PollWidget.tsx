"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Poll } from "@hoichoi/db";
import { getSid } from "@/lib/live-client";

type Result = { optionId: string; votes: number };

function BengaliNumber({ value }: { value: number }) {
  return <>{new Intl.NumberFormat("bn-BD").format(value)}</>;
}

export function PollWidget({
  poll,
  initialResults,
}: {
  poll: Poll;
  initialResults: Result[];
}) {
  const [results, setResults] = useState(initialResults);
  const [myVotes, setMyVotes] = useState<string[]>([]);
  const [draftVotes, setDraftVotes] = useState<string[]>([]);
  const [hasEditedChoices, setHasEditedChoices] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  const total = useMemo(() => results.reduce((sum, item) => sum + item.votes, 0), [results]);
  const showResults = poll.status === "closed"
    || poll.resultsMode === "always"
    || (poll.resultsMode === "after-vote" && myVotes.length > 0);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch(`/api/polls/${poll.id}?sid=${encodeURIComponent(getSid())}`, {
      cache: "no-store",
      signal,
    });
    if (!response.ok) throw new Error("ফলাফল হালনাগাদ করা যায়নি।");
    const data = await response.json() as { results: Result[]; myVotes: string[] };
    setResults(data.results);
    setMyVotes(data.myVotes);
    if (!hasEditedChoices) setDraftVotes(data.myVotes);
  }, [hasEditedChoices, poll.id]);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal).catch((error: unknown) => {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("[poll] unable to load current vote", error);
      }
    });
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    if (poll.status !== "open") return;
    const timer = window.setInterval(() => {
      void refresh().catch((error: unknown) => console.error("[poll] unable to refresh results", error));
    }, 12_000);
    return () => window.clearInterval(timer);
  }, [poll.status, refresh]);

  async function submitVotes(optionIds: string[]) {
    if (pending || poll.status !== "open") return;
    if (!optionIds.length) {
      setMessage("ভোট দেওয়ার আগে অন্তত একটি অপশন বেছে নিন।");
      return;
    }
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/polls/${poll.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionIds, sid: getSid() }),
      });
      const data = await response.json() as { error?: string; results?: Result[]; myVotes?: string[] };
      if (!response.ok) throw new Error(data.error || "ভোট সংরক্ষণ করা যায়নি।");
      setResults(data.results ?? []);
      setMyVotes(data.myVotes ?? []);
      setDraftVotes(data.myVotes ?? []);
      setHasEditedChoices(false);
      setMessage("আপনার ভোট গণনা হয়েছে।");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ভোট সংরক্ষণ করা যায়নি।");
    } finally {
      setPending(false);
    }
  }

  const templateClass = {
    bar: "border-l-4",
    battle: "border-t-4",
    donut: "rounded-2xl",
    card: "shadow-[0_12px_30px_rgba(26,20,13,0.08)]",
    rank: "border-dashed",
    meter: "rounded-none border-y-2",
  }[poll.template] ?? "border-l-4";
  const optionLayout = poll.template === "battle" ? "sm:grid-cols-2" : "";

  return (
    <section className={`overflow-hidden border border-ink/15 bg-card ${templateClass}`} style={{ borderColor: poll.topicColor }}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 px-4 py-3 md:px-6">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: poll.topicColor }} />
          <span className="font-mono-x text-[10px] font-bold tracking-[0.16em] text-ink-soft uppercase">{poll.topic}</span>
        </div>
        <span className={`px-2 py-1 font-mono-x text-[9px] font-bold uppercase ${poll.status === "open" ? "bg-live/10 text-live" : "bg-ink/10 text-ink-soft"}`}>
          {poll.status === "open" ? "● ভোট চলছে" : poll.status === "scheduled" ? "শিগগিরই" : "ভোট শেষ"}
        </span>
      </div>
      <div className="p-4 md:p-6">
        <h2 className="font-serif-bn text-[20px] leading-snug font-black text-ink md:text-[25px]">{poll.question}</h2>
        {poll.description && <p className="mt-2 max-w-3xl text-[12.5px] leading-relaxed text-ink-soft">{poll.description}</p>}
        {poll.allowMultiple && poll.status === "open" && (
          <p className="mt-2 text-[11px] font-semibold text-ink-soft">একাধিক অপশন বেছে নিয়ে ভোট জমা দিতে পারবেন।</p>
        )}

        <div className={`mt-5 grid gap-2.5 ${optionLayout}`}>
          {poll.options.map((option, index) => {
            const votes = results.find((result) => result.optionId === option.id)?.votes ?? 0;
            const percent = total ? Math.round((votes / total) * 100) : 0;
            const selected = (poll.allowMultiple ? draftVotes : myVotes).includes(option.id);
            const optionStyle = poll.template === "card"
              ? "rounded-xl bg-paper/70 p-4"
              : poll.template === "battle"
                ? "rounded-lg px-4 py-4"
                : poll.template === "meter"
                  ? "px-3 py-2"
                  : "px-3 py-3";
            return (
              <button
                key={option.id}
                type="button"
                disabled={pending || poll.status !== "open" || (!poll.allowMultiple && myVotes.length > 0)}
                onClick={() => {
                  if (poll.allowMultiple) {
                    setDraftVotes((current) => current.includes(option.id)
                      ? current.filter((value) => value !== option.id)
                      : [...current, option.id]);
                    setHasEditedChoices(true);
                  } else {
                    void submitVotes([option.id]);
                  }
                }}
                aria-pressed={selected}
                className={`group relative min-h-12 overflow-hidden border text-left transition-colors disabled:cursor-default ${optionStyle} ${selected ? "border-ink" : "border-ink/15 hover:border-ink/45"}`}
              >
                {showResults && (
                  <span
                    className={`absolute inset-y-0 left-0 transition-[width] duration-700 ${poll.template === "meter" ? "opacity-35" : "opacity-[0.12]"}`}
                    style={{ width: `${percent}%`, backgroundColor: poll.topicColor }}
                  />
                )}
                <span className="relative flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2.5">
                    {poll.template === "donut" ? (
                      <span
                        aria-hidden="true"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full p-[3px]"
                        style={{ background: `conic-gradient(${poll.topicColor} ${percent}%, color-mix(in srgb, ${poll.topicColor} 15%, transparent) ${percent}% 100%)` }}
                      >
                        <span className="flex h-full w-full items-center justify-center rounded-full bg-card font-mono-x text-[8px] text-ink">{showResults ? `${percent}%` : index + 1}</span>
                      </span>
                    ) : (
                      <span className={`font-mono-x text-[10px] ${poll.template === "rank" ? "flex h-7 w-7 items-center justify-center border border-ink/20 font-bold text-ink" : "text-ink-soft"}`}>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    )}
                    <span className="font-serif-bn text-[13px] font-bold text-ink md:text-[14px]">{option.label}</span>
                    {selected && <span className="bg-lime/20 px-1.5 py-0.5 font-mono-x text-[8px] font-bold text-ink">{poll.allowMultiple ? "নির্বাচিত" : "আপনার ভোট"}</span>}
                  </span>
                  {showResults && (
                    <span className="shrink-0 text-right font-mono-x text-[10px] text-ink-soft">
                      <BengaliNumber value={votes} /> · {new Intl.NumberFormat("bn-BD").format(percent)}%
                    </span>
                  )}
                  {!showResults && poll.status === "open" && (
                    <span className="shrink-0 font-mono-x text-[9px] font-bold text-alizarin">{pending ? "সংরক্ষণ…" : poll.allowMultiple ? selected ? "নির্বাচিত" : "বেছে নিন" : myVotes.length ? "ভোট দেওয়া হয়েছে" : "ভোট দিন →"}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-ink/10 pt-3">
          <p aria-live="polite" className="text-[11px] text-ink-soft">
            {message || (poll.status === "scheduled" ? `শুরু: ${new Date(poll.startsAt).toLocaleString("bn-BD")}` : `${new Intl.NumberFormat("bn-BD").format(total)}টি ${poll.allowMultiple ? "নির্বাচন" : "ভোট"}`)}
          </p>
          {poll.allowMultiple && poll.status === "open" && (
            <button type="button" disabled={pending || draftVotes.length === 0} onClick={() => void submitVotes(draftVotes)} className="bg-ink px-3 py-2 font-mono-x text-[9px] font-bold text-paper hover:bg-alizarin disabled:cursor-not-allowed disabled:opacity-50">
              {pending ? "সংরক্ষণ হচ্ছে…" : "ভোট জমা দিন"}
            </button>
          )}
          {poll.status === "open" && <span className="font-mono-x text-[9px] text-ink-soft">এক ডিভাইস থেকে একটি ভোট · ফল প্রতি ১২ সেকেন্ডে হালনাগাদ</span>}
        </div>
      </div>
    </section>
  );
}
