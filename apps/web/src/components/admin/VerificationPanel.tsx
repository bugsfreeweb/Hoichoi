"use client";

import { useCallback, useEffect, useState } from "react";
import { ListChecks, Plus, RefreshCw, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import type { ClaimCandidate } from "@hoichoi/shared-types";

/**
 * যাচাই প্যানেল — গ্রেড, দাবি ও সংশোধনের রেকর্ড।
 *
 * গ্রেড সার্ভারেই হিসাব হয় (gradeFromEvidence): এক সূত্র থাকলে "একাধিক সূত্র"
 * কখনও বসবে না, আর নাম না থাকলে "সম্পাদক যাচাইকৃত" হবে না। তাই বোতাম টিপে
 * "verified" লেখা যায় না — রেকর্ড না থাকলে ব্যাজও থাকে না।
 */

interface Claim {
  id: string;
  claim_bn: string;
  status: "unchecked" | "supported" | "disputed" | "false";
  evidence_url: string | null;
  evidence_note: string | null;
  checked_by: string | null;
  checked_at: string | null;
}

interface Correction {
  id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  reason: string | null;
  corrected_by: string | null;
  created_at: string;
}

interface Payload {
  post: { verification_status: string; verification_note: string | null; verified_by: string | null; verified_at: string | null };
  claims: Claim[];
  corrections: Correction[];
  grades: string[];
}

const GRADE_BN: Record<string, string> = {
  unverified: "অযাচাইকৃত",
  single_source: "একক সূত্র",
  multi_source: "একাধিক সূত্র",
  human_verified: "সম্পাদক যাচাইকৃত",
  corrected: "সংশোধিত",
};

const CLAIM_BN: Record<string, string> = {
  unchecked: "যাচাই হয়নি",
  supported: "সমর্থিত",
  disputed: "বিতর্কিত",
  false: "মিথ্যা",
};

export default function VerificationPanel({ postId, canEdit }: { postId: string; canEdit: boolean }) {
  const [data, setData] = useState<Payload | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [note, setNote] = useState("");
  const [claim, setClaim] = useState({ claim_bn: "", status: "unchecked", evidence_url: "", evidence_note: "" });
  const [proposals, setProposals] = useState<ClaimCandidate[] | null>(null);

  const flash = (type: "ok" | "err", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 5000);
  };

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/verification/${encodeURIComponent(postId)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("লোড ব্যর্থ");
      const payload = (await res.json()) as Payload;
      setData(payload);
      setNote(payload.post.verification_note ?? "");
    } catch (e) {
      flash("err", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [postId]);

  useEffect(() => {
    void load();
  }, [load]);

  const post = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/verification/${encodeURIComponent(postId)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; status?: string; clamped?: boolean; derived?: string };
      if (!res.ok) throw new Error(json.error ?? "ব্যর্থ");
      await load();
      flash("ok", json.clamped ? `রেকর্ড অনুযায়ী গ্রেড ${json.status} (দাবি করা হয়েছিল ${json.derived} এর উপরে)` : "সংরক্ষণ হয়েছে");
    } catch (e) {
      flash("err", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /**
   * Ask the server which sentences in this post are checkable. It reads the
   * stored body only and writes nothing — a proposal is not a record, so the
   * grade cannot move because a suggestion appeared.
   */
  const propose = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/verification/${encodeURIComponent(postId)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "claim_propose" }),
      });
      const json = (await res.json().catch(() => ({}))) as { candidates?: ClaimCandidate[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "ব্যর্থ");
      setProposals(json.candidates ?? []);
      flash("ok", `লেখা থেকে ${json.candidates?.length ?? 0}টি যাচাইযোগ্য বাক্য পাওয়া গেছে।`);
    } catch (e) {
      flash("err", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const removeClaim = async (id: string) => {
    if (!window.confirm("এই দাবিটি মুছে ফেলবেন?")) return;
    await post({ action: "claim_delete", id });
  };

  const status = data?.post.verification_status ?? "unverified";
  const inputCls = "mt-1 block w-full border border-ink/25 bg-paper px-2 py-1 font-mono-x text-[11px] text-ink outline-none focus:border-alizarin";
  const labelCls = "font-mono-x text-[10.5px] text-ink-soft";

  return (
    <section className="mt-10 border-t border-ink/15 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-mono-x text-[11px] font-bold uppercase tracking-[0.18em] text-ink-soft">যাচাই ও সংশোধন</h2>
          <p className="mt-1 font-mono-x text-[10.5px] text-ink-soft">
            গ্রেড রেকর্ড থেকেই আসে — দাবি যোগ করুন, তারপরই শক্ত গ্রেড সম্ভব।
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono-x text-[10px] font-bold uppercase tracking-wide ${
            status === "human_verified" ? "bg-ink text-paper" : status === "corrected" ? "bg-amberx text-paper" : status === "multi_source" ? "bg-cat-teal text-paper" : "border border-ink/30 text-ink-soft"
          }`}
        >
          {status === "unverified" ? <ShieldAlert className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
          {GRADE_BN[status] ?? status}
        </span>
      </div>

      {msg && <p className="mt-2 font-mono-x text-[11.5px] font-bold text-alizarin">{msg.text}</p>}

      {canEdit && (
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <label className={labelCls}>
            নোট (ব্যাজের টুলটিপে দেখাবে)
            <input className={`${inputCls} w-72`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="দুই সূত্র মিলে গেছে" />
          </label>
          <button
            type="button"
            onClick={() => void post({ action: "grade", note })}
            disabled={busy}
            className="inline-flex items-center gap-1.5 border border-ink/25 bg-ink px-3 py-1.5 font-mono-x text-[10.5px] font-bold text-paper disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} /> গ্রেড পুনঃহিসাব
          </button>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {(data?.claims ?? []).map((c) => (
          <div key={c.id} className="flex flex-wrap items-start justify-between gap-3 border border-ink/20 bg-paper-deep px-3 py-2">
            <div className="min-w-0">
              <p className="font-sans-bn text-[12.5px] text-ink">{c.claim_bn}</p>
              <p className="mt-0.5 font-mono-x text-[10px] text-ink-soft">
                {CLAIM_BN[c.status] ?? c.status}
                {c.evidence_url ? ` · ${c.evidence_url.slice(0, 60)}` : ""}
                {c.checked_by ? ` · ${c.checked_by}` : ""}
              </p>
            </div>
            {canEdit && (
              <button type="button" onClick={() => void removeClaim(c.id)} disabled={busy} className="text-ink-soft disabled:opacity-50" aria-label="দাবি মুছুন">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
        {data && data.claims.length === 0 && (
          <p className="font-mono-x text-[11px] text-ink-soft">কোনো দাবি এখনও যোগ করা হয়নি — তাই গ্রেড “একাধিক সূত্র” এর বেশি হতে পারবে না।</p>
        )}
      </div>

      {canEdit && proposals && proposals.length > 0 && (
        <div className="mt-3 border border-ink/20 bg-paper-deep p-3">
          <p className="font-mono-x text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-soft">
            প্রস্তাব — লেখা থেকে, অনুমান নয়
          </p>
          <p className="mt-1 font-mono-x text-[10px] text-ink-soft">
            বাক্যগুলো পোস্টের নিজের লেখা থেকেই বাছা হয়েছে (সংখ্যা, তারিখ, নামকরা পক্ষ, উদ্ধৃতি)। কোনো
            প্রস্তাব নিজে থেকে রেকর্ড হয় না — যেটি রাখবেন, সেটিই দাবি হবে।
          </p>
          <div className="mt-2 space-y-1">
            {proposals.map((p) => (
              <div key={p.text} className="flex flex-wrap items-start justify-between gap-2 border border-ink/15 bg-paper px-2 py-1.5">
                <span className="min-w-0 font-sans-bn text-[12px] text-ink">{p.text}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="font-mono-x text-[9.5px] tracking-[0.08em] text-ink-soft uppercase">{p.reason}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setClaim({ claim_bn: p.text, status: "unchecked", evidence_url: "", evidence_note: "" });
                      flash("ok", "ফর্মে বসানো হয়েছে — প্রমাণের লিংক দিয়ে যোগ করুন।");
                    }}
                    className="border border-ink/25 px-1.5 py-0.5 font-mono-x text-[9.5px] tracking-[0.1em] text-ink uppercase"
                  >
                    ফর্মে নিন
                  </button>
                </span>
              </div>
            ))}
          </div>
          {proposals.length === 0 && (
            <p className="mt-1 font-mono-x text-[10.5px] text-ink-soft">লেখায় যাচাইযোগ্য বাক্য পাওয়া যায়নি।</p>
          )}
        </div>
      )}

      {canEdit && (
        <div className="mt-3 grid gap-2 border border-ink/20 bg-paper-deep p-3 md:grid-cols-4">
          <label className={labelCls}>
            যাচাইযোগ্য দাবি
            <input className={inputCls} value={claim.claim_bn} onChange={(e) => setClaim({ ...claim, claim_bn: e.target.value })} placeholder="ঘটনাটি ঘটেছে X তারিখে" />
          </label>
          <label className={labelCls}>
            ফল
            <select className={inputCls} value={claim.status} onChange={(e) => setClaim({ ...claim, status: e.target.value })}>
              {Object.entries(CLAIM_BN).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          <label className={labelCls}>
            প্রমাণের লিংক
            <input className={inputCls} value={claim.evidence_url} onChange={(e) => setClaim({ ...claim, evidence_url: e.target.value })} placeholder="https://…" />
          </label>
          <div className="flex items-end gap-1.5">
            <button
              type="button"
              onClick={() => void propose()}
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-1.5 border border-ink/25 px-2 py-1.5 font-mono-x text-[10.5px] font-bold text-ink disabled:opacity-50"
              title="পোস্টের লেখা থেকে যাচাইযোগ্য বাক্য বের করুন"
            >
              <ListChecks className="h-3.5 w-3.5" /> প্রস্তাব
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!claim.claim_bn.trim()) return flash("err", "দাবির লেখা দরকার।");
                await post({ action: "claim", ...claim });
                setClaim({ claim_bn: "", status: "unchecked", evidence_url: "", evidence_note: "" });
              }}
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-1.5 border border-ink/25 bg-ink px-3 py-1.5 font-mono-x text-[10.5px] font-bold text-paper disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" /> দাবি যোগ
            </button>
          </div>
        </div>
      )}

      {(data?.corrections.length ?? 0) > 0 && (
        <div className="mt-4">
          <p className="font-mono-x text-[10.5px] font-bold uppercase tracking-[0.18em] text-ink-soft">সংশোধনের ইতিহাস</p>
          <div className="mt-2 space-y-1.5">
            {data!.corrections.map((h) => (
              <p key={h.id} className="font-mono-x text-[10.5px] text-ink-soft">
                {new Date(h.created_at).toLocaleString("bn-BD")} · {h.field} · {h.corrected_by ?? "—"}
                {h.reason ? ` · ${h.reason}` : ""}
              </p>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
