"use client";

import { useState } from "react";
import { useToast } from "./ui/toast";

/**
 * AI assist, inside the editor.
 *
 * Three buttons and one text box. The box is the *material* — a tip, a pasted
 * post — not a prompt: the server owns the instruction and the model, which is
 * what keeps this an editorial tool rather than a chat endpoint billed to us.
 *
 * Nothing is written to the database. A result lands in the form fields so an
 * editor sees and approves it, exactly like a human edit.
 */

type Task = "draft" | "summarise" | "headline";

const TASK_LABEL: Record<Task, string> = {
  draft: "খসড়া তৈরি",
  summarise: "সারমর্ম",
  headline: "শিরোনাম",
};

export function AiAssistPanel({
  sourceText,
  sourceName,
  category,
  categoryNameBn,
  onTitle,
  onSummary,
  onBody,
  onAiAssisted,
}: {
  /** Default material: the post's own body, editable before sending. */
  sourceText: string;
  sourceName?: string;
  category?: string;
  categoryNameBn?: string;
  onTitle: (value: string) => void;
  onSummary: (value: string) => void;
  onBody: (value: string) => void;
  /**
   * Tells the editor which task wrote into a field, so the save can record it.
   * Provenance is a fact about this post, not a badge the panel prints itself.
   */
  onAiAssisted?: (task: Task) => void;
}) {
  const [open, setOpen] = useState(false);
  const [material, setMaterial] = useState(sourceText.slice(0, 6000));
  const [busy, setBusy] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [pii, setPii] = useState<{ email: number; phone: number; longDigits: number; cardLike: number } | null>(null);
  const toast = useToast();

  async function run(task: Task): Promise<void> {
    setBusy(task);
    setError(null);
    const id = toast.busy(`AI ${TASK_LABEL[task]} চলছে…`);
    try {
      const res = await fetch("/api/ai/task", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          task,
          text: material,
          ...(sourceName ? { sourceName } : {}),
          ...(category ? { category } : {}),
          ...(categoryNameBn ? { categoryNameBn } : {}),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        provider?: string;
        result?: { title_bn?: string; summary_bn?: string; body_bn?: string };
        pii?: { email: number; phone: number; longDigits: number; cardLike: number };
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? `ব্যর্থ (${res.status})`);
        toast.settle(id, "error", "AI ব্যর্থ", data.error);
        return;
      }
      const result = data.result ?? {};
      if (result.title_bn) onTitle(result.title_bn);
      if (result.summary_bn) onSummary(result.summary_bn);
      if (result.body_bn) onBody(result.body_bn);
      setProvider(data.provider ?? null);
      setPii(data.pii ?? null);
      onAiAssisted?.(task);
      toast.settle(id, "success", `${TASK_LABEL[task]} প্রস্তুত`, "নিচের ফিল্ডে বসানো হয়েছে — দেখে নিন।");
    } catch (e) {
      setError(e instanceof Error ? e.message : "সংযোগ ব্যর্থ");
      toast.settle(id, "error", "AI ব্যর্থ", (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-5 border border-ink/20 bg-paper-deep p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="font-mono-x text-[10.5px] tracking-[0.16em] text-ink-soft uppercase hover:text-ink"
      >
        {open ? "▾" : "▸"} AI সহকারী · খসড়া / সারমর্ম / শিরোনাম
      </button>

      {open && (
        <div className="mt-3">
          <p className="text-[12px] text-ink-soft">
            কাঁচা তথ্য বা পোস্টের লেখা দিন। সহকারী আপনার দেওয়া নির্দেশ নেয় না — টাস্ক বেছে নিলে ডেস্কের
            নিয়মেই খসড়া তৈরি হয়, আর কিছুই নিজে থেকে সেভ হয় না।
          </p>

          <textarea
            className="mt-2 w-full border border-ink/25 bg-paper px-3 py-2 font-mono-x text-[12px] text-ink"
            rows={7}
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            aria-label="কাঁচা তথ্য"
            spellCheck={false}
          />
          <p className="mt-1 font-mono-x text-[10px] text-ink-soft">
            {material.length} / ৬০০০ অক্ষর
          </p>

          <div className="mt-2 flex flex-wrap gap-2">
            {(["draft", "summarise", "headline"] as Task[]).map((task) => (
              <button
                key={task}
                type="button"
                disabled={busy !== null || material.trim().length < 40}
                onClick={() => void run(task)}
                className="border border-ink/30 px-3 py-2 text-[12px] font-bold text-ink transition hover:bg-lime disabled:opacity-40"
              >
                {busy === task ? "…" : TASK_LABEL[task]}
              </button>
            ))}
            {provider && (
              <span className="self-center font-mono-x text-[10px] text-ink-soft">প্রোভাইডার: {provider}</span>
            )}
          </div>

          {pii && pii.email + pii.phone + pii.longDigits + pii.cardLike > 0 && (
            <p className="mt-2 border border-ink/30 bg-paper px-3 py-2 text-[11.5px] text-ink-soft">
              ব্যক্তিগত তথ্য সরানো হয়েছে — মডেলে পাঠানোর আগে{" "}
              {[
                pii.email ? `${pii.email}টি ইমেইল` : null,
                pii.phone ? `${pii.phone}টি ফোন` : null,
                pii.longDigits ? `${pii.longDigits}টি দীর্ঘ সংখ্যা` : null,
                pii.cardLike ? `${pii.cardLike}টি কার্ড নম্বর` : null,
              ]
                .filter(Boolean)
                .join(", ")}{" "}
              বাদ দেওয়া হয়েছে।
            </p>
          )}

          {error && (
            <p role="alert" className="mt-2 border border-alizarin bg-alizarin/10 px-3 py-2 text-[12px] font-bold text-ink">
              ✕ {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
