"use client";

import { useEffect, useState } from "react";
import { useToast } from "./ui/toast";

/**
 * Per-poll integrity panel.
 *
 * Shows the signals that suggest a ballot was stuffed and lets an admin
 * invalidate a whole network's votes with a reason. Nothing here deletes: the
 * votes stay, flagged, so the decision is reviewable later.
 */

type Signal = { label: string; value: number; unit: string; bad: boolean; note: string };
type Report = {
  totalValidVotes: number;
  totalVotes: number;
  invalidated: number;
  signals: Signal[];
  score: number;
  verdict: "clean" | "flagged" | "suspicious";
};
type Group = { ipHash: string; votes: number; sessions: number };

function toBn(v: number | string): string {
  return String(v).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)] ?? d);
}

const VERDICT_STYLE: Record<Report["verdict"], string> = {
  clean: "border-cat-teal/50 text-cat-teal",
  flagged: "border-amberx/60 text-amberx",
  suspicious: "border-alizarin/60 text-alizarin",
};

export function PollIntegrityPanel({ pollId }: { pollId: number }) {
  const [report, setReport] = useState<Report | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  async function load(): Promise<void> {
    try {
      const res = await fetch(`/api/admin/polls/${pollId}/integrity`, { cache: "no-store" });
      const data = (await res.json()) as { ok?: boolean; report?: Report; groups?: Group[]; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? `ব্যর্থ (${res.status})`);
        return;
      }
      setReport(data.report ?? null);
      setGroups(data.groups ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "সংযোগ ব্যর্থ");
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollId]);

  async function invalidate(ipHash: string): Promise<void> {
    if (reason.trim().length < 3) {
      setError("বাতিল করার কারণ লিখুন (কমপক্ষে ৩ অক্ষর)।");
      return;
    }
    setBusy(true);
    setError(null);
    const id = toast.busy("ভোট বাতিল হচ্ছে…");
    try {
      const res = await fetch(`/api/admin/polls/${pollId}/integrity`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ipHash, reason: reason.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; invalidated?: number; report?: Report; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? `ব্যর্থ (${res.status})`);
        toast.settle(id, "error", "বাতিল ব্যর্থ", data.error);
        return;
      }
      setReport(data.report ?? report);
      setReason("");
      toast.settle(id, "success", `${toBn(data.invalidated ?? 0)}টি ভোট বাতিল হয়েছে।`);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "অনুরোধ ব্যর্থ");
      toast.settle(id, "error", "বাতিল ব্যর্থ", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!report) {
    return (
      <div className="mt-2 rounded-lg border border-ink/15 p-3 text-[11.5px] text-ink-soft">
        {error ?? "সততা যাচাই লোড হচ্ছে…"}
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-ink/15 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2 py-0.5 font-mono-x text-[9.5px] font-bold uppercase ${VERDICT_STYLE[report.verdict]}`}>
          {report.verdict === "clean" ? "পরিষ্কার" : report.verdict === "flagged" ? "সন্দেহজনক" : "অসততা সনাক্ত"}
        </span>
        <span className="font-mono-x text-[9.5px] text-ink-soft">
          রিস্ক স্কোর {toBn(report.score)}/১০০ · বৈধ ভোট {toBn(report.totalValidVotes)} · বাতিল {toBn(report.invalidated)}
        </span>
      </div>

      <ul className="mt-2 grid gap-1 text-[11.5px] sm:grid-cols-3">
        {report.signals.map((signal) => (
          <li key={signal.label} className={signal.bad ? "text-alizarin" : "text-ink-soft"}>
            <span className="font-semibold text-ink">{signal.label}:</span> {toBn(signal.value)}
            <span className="ml-1 opacity-70">{signal.unit}</span>
            <span className="block text-[10.5px] opacity-80">{signal.note}</span>
          </li>
        ))}
      </ul>

      {groups.length > 0 && (
        <div className="mt-3 border-t border-ink/10 pt-2">
          <p className="font-mono-x text-[9.5px] tracking-[0.14em] text-ink-soft uppercase">
            নেটওয়ার্কভিত্তিক ভোট (শীর্ষ {toBn(groups.length)})
          </p>
          <ul className="mt-1 space-y-1">
            {groups.map((group) => (
              <li key={group.ipHash} className="flex flex-wrap items-center justify-between gap-2 text-[11.5px]">
                <span className="font-mono-x text-[10.5px] text-ink-soft">
                  {group.ipHash.slice(0, 12)}… · {toBn(group.votes)} ভোট · {toBn(group.sessions)} সেশন
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => invalidate(group.ipHash)}
                  className="rounded border border-alizarin/60 px-2 py-0.5 text-[10.5px] font-bold text-alizarin disabled:opacity-40"
                >
                  এই নেটওয়ার্কের ভোট বাতিল
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <label className="mt-3 block text-[11px] font-semibold text-ink" htmlFor={`reason-${pollId}`}>
        বাতিলের কারণ (অডিটে লেখা থাকবে)
      </label>
      <input
        id={`reason-${pollId}`}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="যেমন: একই নেটওয়ার্ক থেকে ৩০০+ সেশন"
        className="mt-1 w-full rounded border border-ink/20 bg-paper px-2 py-1.5 text-[11.5px] text-ink"
      />

      {error && (
        <p role="alert" className="mt-2 text-[11px] text-alizarin">
          {error}
        </p>
      )}
    </div>
  );
}
