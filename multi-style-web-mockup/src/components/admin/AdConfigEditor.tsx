"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Megaphone, Save } from "lucide-react";
import type { AdConfig } from "@/components/site/AdSlot";

const DEFAULTS: AdConfig = {
  advertiser: "হৈচৈ পাঠক-সহযোগী",
  title: "বিশ্বস্ত তথ্যের পাশে থাকুন",
  description: "পাঠকের জন্য নির্ভরযোগ্য সংবাদ ও যাচাই-সেবায় সহায়তা করুন।",
  cta: "আরও জানুন",
  href: "#newsletter",
  disclosure: "এটি একটি প্রদর্শনী বিজ্ঞাপন। বিজ্ঞাপনের অর্থ সম্পাদকীয় সিদ্ধান্তে প্রভাব ফেলে না।",
};

export default function AdConfigEditor({
  config,
  onSave,
}: {
  config: Record<string, unknown>;
  onSave: (next: Record<string, unknown>) => Promise<void>;
}) {
  const [values, setValues] = useState<AdConfig>({ ...DEFAULTS, ...(config as Partial<AdConfig>) });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setValues({ ...DEFAULTS, ...(config as Partial<AdConfig>) });
  }, [config]);

  const update = (key: keyof AdConfig, value: string) => {
    setValues((old) => ({ ...old, [key]: value }));
    setSaved(false);
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    await onSave(values as unknown as Record<string, unknown>);
    setSaving(false);
    setSaved(true);
  }

  return (
    <form onSubmit={submit} className="mt-4 rounded-xl border border-white/8 bg-ink-950/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Megaphone className="h-4 w-4" style={{ color: "var(--accent)" }} />
        <p className="text-[13.5px] font-semibold text-mist-100">বিজ্ঞাপনের লেখা ও লিংক</p>
        <span className="mono-label ml-auto text-mist-400">এই পৃষ্ঠা থেকে আলাদা</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {([
          ["advertiser", "বিজ্ঞাপনদাতার নাম"],
          ["title", "প্রধান শিরোনাম"],
          ["cta", "বোতামের লেখা"],
          ["href", "গন্তব্য লিংক"],
        ] as [keyof AdConfig, string][]).map(([key, label]) => (
          <label key={key} className="block">
            <span className="mb-1 block text-[11.5px] text-mist-400">{label}</span>
            <input value={values[key]} onChange={(e) => update(key, e.target.value)} maxLength={180} className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-[12.5px] text-mist-100 outline-none focus:border-[var(--accent)]" />
          </label>
        ))}
        {([
          ["description", "বিজ্ঞাপনের বিবরণ"],
          ["disclosure", "সম্পাদকীয় স্বচ্ছতার নোট"],
        ] as [keyof AdConfig, string][]).map(([key, label]) => (
          <label key={key} className="block sm:col-span-2">
            <span className="mb-1 block text-[11.5px] text-mist-400">{label}</span>
            <textarea value={values[key]} onChange={(e) => update(key, e.target.value)} maxLength={400} rows={2} className="w-full resize-y rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-[12.5px] leading-relaxed text-mist-100 outline-none focus:border-[var(--accent)]" />
          </label>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[11px] text-mist-400">শুধু https://, http://, / অথবা # দিয়ে শুরু হওয়া লিংক গ্রহণ করা হবে।</p>
        <button type="submit" disabled={saving} className="flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold text-ink-950 disabled:opacity-60" style={{ background: "var(--accent)" }}>
          <Save className="h-3.5 w-3.5" />{saving ? "সংরক্ষণ…" : saved ? "সংরক্ষিত" : "বিজ্ঞাপন সংরক্ষণ"}
        </button>
      </div>
    </form>
  );
}
