"use client";

import { useState } from "react";
import type { LLMProviderRow } from "@hoichoi/shared-types";

const KEYS = [
  { v: "google", label: "Google" },
  { v: "groq", label: "Groq" },
  { v: "openrouter", label: "OpenRouter" },
  { v: "ollama", label: "Ollama" },
  { v: "anthropic", label: "Anthropic" },
  { v: "openai", label: "OpenAI" },
  { v: "mistral", label: "Mistral" },
  { v: "custom", label: "Custom" },
];

export function ProviderForm() {
  const [form, setForm] = useState({
    providerKey: "google",
    displayName: "",
    baseUrl: "",
    modelName: "",
    priority: 100,
    free: true,
  });
  const [status, setStatus] = useState<null | "ok" | "err" | "denied">(null);

  const field = "mt-1 w-full border border-ink/30 bg-paper px-3 py-2 text-[13px] focus:outline-none";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          providerKey: form.providerKey,
          displayName: form.displayName || undefined,
          baseUrl: form.baseUrl || undefined,
          modelName: form.modelName,
          priority: Number(form.priority),
          isFreeTier: form.free,
        }),
      });
      if (res.status === 401 || res.status === 403) return setStatus("denied");
      if (!res.ok) return setStatus("err");
      setStatus("ok");
      setForm({ providerKey: "google", displayName: "", baseUrl: "", modelName: "", priority: 100, free: true });
    } catch {
      setStatus("err");
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3.5">
      <label className="block">
        <span className="text-[11px] font-bold uppercase text-ink-soft">প্রোভাইডার</span>
        <select className={field} value={form.providerKey} onChange={(e) => setForm({ ...form, providerKey: e.target.value })}>
          {KEYS.map((k) => (
            <option key={k.v} value={k.v}>
              {k.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-[11px] font-bold uppercase text-ink-soft">মডেল নাম</span>
        <input required className={field} placeholder="gemini-1.5-flash" value={form.modelName} onChange={(e) => setForm({ ...form, modelName: e.target.value })} />
      </label>
      <label className="block">
        <span className="text-[11px] font-bold uppercase text-ink-soft">ডিসপ্লে নাম</span>
        <input className={field} placeholder="ঐচ্ছিক" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
      </label>
      <label className="block">
        <span className="text-[11px] font-bold uppercase text-ink-soft">Base URL</span>
        <input className={field} placeholder="ঐচ্ছিক" value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} />
      </label>
      <label className="block">
        <span className="text-[11px] font-bold uppercase text-ink-soft">Priority</span>
        <input type="number" className={field} value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
      </label>
      <label className="flex items-center gap-2 text-[12.5px] font-medium text-ink">
        <input type="checkbox" checked={form.free} onChange={(e) => setForm({ ...form, free: e.target.checked })} />
        Free-tier (সবার আগে চেষ্টা)
      </label>
      {status === "ok" && <p className="border border-cat-teal bg-cat-teal/10 px-3 py-2 text-[12px] font-bold text-ink">✓ যোগ হয়েছে।</p>}
      {status === "err" && <p className="border border-alizarin bg-alizarin/10 px-3 py-2 text-[12px] font-bold text-ink">✗ ব্যর্থ।</p>}
      {status === "denied" && <p className="border border-alizarin bg-alizarin/10 px-3 py-2 text-[12px] font-bold text-ink">অনুমতি নেই — admin প্রয়োজন।</p>}
      <button className="w-fit border-2 border-ink bg-ink px-5 py-2 text-[12.5px] font-bold text-paper transition hover:bg-alizarin">
        প্রোভাইডার যোগ করুন →
      </button>
    </form>
  );
}