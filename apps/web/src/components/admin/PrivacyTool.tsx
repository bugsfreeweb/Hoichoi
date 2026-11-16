"use client";

import { useState } from "react";
import { useToast } from "./ui/toast";

/**
 * Data-subject tooling on /admin/security.
 *
 * Two buttons, because that is what the obligation actually is: export a person's
 * rows, or erase them. The tool is deliberately not a browser — you have to know
 * a guest id or an email already. Erasure asks for the word ERASE so a stray
 * Enter cannot delete a real reader's history.
 */

type Result =
  | { kind: "export"; total: number; json: string }
  | { kind: "erase"; total: number; erased: Record<string, number> }
  | null;

export function PrivacyTool() {
  const [identifier, setIdentifier] = useState("");
  const [phase, setPhase] = useState<"idle" | "export" | "erase" | "confirm">("idle");
  const [confirmation, setConfirmation] = useState("");
  const [result, setResult] = useState<Result>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const trimmed = identifier.trim();
  const looksLikeId = /^[A-Za-z0-9_-]{16,80}$/.test(trimmed);

  async function send(action: "export" | "erase"): Promise<void> {
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/privacy/subject", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, guestId: trimmed }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok || data.ok !== true) {
        setError(String(data.error ?? `ব্যর্থ (${res.status})`));
        return;
      }
      if (action === "export") {
        setResult({ kind: "export", total: Number(data.total ?? 0), json: JSON.stringify(data.data, null, 2) });
      } else {
        setResult({
          kind: "erase",
          total: Number(data.total ?? 0),
          erased: (data.erased ?? {}) as Record<string, number>,
        });
      }
      setPhase("idle");
      setConfirmation("");
      const id = toast.busy(action === "export" ? "এক্সপোর্ট হচ্ছে…" : "মুছে ফেলা হচ্ছে…");
      toast.settle(id, "success", action === "export" ? "এক্সপোর্ট সম্পন্ন।" : "ডেটা মুছে ফেলা হয়েছে।");
    } catch (e) {
      setError(e instanceof Error ? e.message : "অনুরোধ ব্যর্থ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-ink/20 bg-paper p-4">
      <h2 className="font-mono-x text-[11px] tracking-[0.16em] text-ink-soft uppercase">
        ডেটা-সাবজেক্ট · এক্সপোর্ট / মুছে ফেলা
      </h2>
      <p className="mt-1 text-[12.5px] text-ink-soft">
        পাঠকের গেস্ট আইডি দিন (অথবা নতুন ইনস্টল হলে ইমেইল লুকআপ ব্যবহার করুন)। শুধু ওই পাঠকের মন্তব্য,
        রিপোর্ট, সাবমিশন ও সরানোর অনুরোধ প্রযোজ্য — সম্পাদকীয় কনটেন্ট বা অডিট লগ অপরিবর্তিত থাকে।
      </p>

      <label className="mt-3 block text-[12px] font-semibold text-ink" htmlFor="privacy-id">
        গেস্ট আইডি
      </label>
      <div className="mt-1 flex flex-wrap gap-2">
        <input
          id="privacy-id"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="A1b2C3d4E5f6G7h8…"
          className="min-w-0 flex-1 rounded-lg border border-ink/20 bg-paper px-3 py-2 font-mono-x text-[12px] text-ink"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          disabled={!looksLikeId || busy}
          onClick={() => send("export")}
          className="rounded-lg border border-ink/25 px-3 py-2 text-[12px] font-semibold text-ink disabled:opacity-40"
        >
          এক্সপোর্ট (JSON)
        </button>
        <button
          type="button"
          disabled={!looksLikeId || busy}
          onClick={() => setPhase("confirm")}
          className="rounded-lg border border-alizarin px-3 py-2 text-[12px] font-semibold text-alizarin disabled:opacity-40"
        >
          মুছে ফেলুন
        </button>
      </div>

      {phase === "confirm" && (
        <div className="mt-3 rounded-lg border border-alizarin/40 bg-alizarin/5 p-3">
          <p className="text-[12.5px] text-ink">
            এটা ফেরানো যাবে না। নিশ্চিত করতে <span className="font-mono-x font-bold">ERASE</span> লিখুন।
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className="w-28 rounded-lg border border-ink/20 bg-paper px-2 py-1.5 font-mono-x text-[12px]"
              aria-label="নিশ্চিতকরণ"
            />
            <button
              type="button"
              disabled={confirmation !== "ERASE" || busy}
              onClick={() => send("erase")}
              className="rounded-lg bg-alizarin px-3 py-1.5 text-[12px] font-bold text-paper disabled:opacity-40"
            >
              হ্যাঁ, মুছে ফেলুন
            </button>
            <button
              type="button"
              onClick={() => {
                setPhase("idle");
                setConfirmation("");
              }}
              className="text-[12px] text-ink-soft underline"
            >
              বাতিল
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-lg border border-alizarin/40 px-3 py-2 text-[12.5px] text-alizarin">
          {error}
        </p>
      )}

      {result?.kind === "erase" && (
        <p className="mt-3 rounded-lg border border-ink/20 px-3 py-2 text-[12.5px] text-ink">
          {result.total === 0 ? "কোনো সারি পাওয়া যায়নি।" : `${result.total}টি সারি মুছে ফেলা হয়েছে।`}
        </p>
      )}

      {result?.kind === "export" && (
        <div className="mt-3">
          <p className="text-[12.5px] text-ink">{result.total}টি সারি পাওয়া গেছে।</p>
          <pre className="mt-2 max-h-72 overflow-auto rounded-lg border border-ink/20 bg-paper-deep p-3 font-mono-x text-[11px] text-ink">
            {result.json}
          </pre>
        </div>
      )}
    </section>
  );
}
