"use client";

import { useState } from "react";

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

interface ModelPick {
  id: string;
  label: string;
}

export function ProviderForm() {
  const [form, setForm] = useState({
    providerKey: "google",
    displayName: "",
    baseUrl: "",
    modelName: "",
    apiKey: "",
    priority: 100,
    free: true,
  });
  const [status, setStatus] = useState<null | "ok" | "err" | "denied">(null);
  const [fetching, setFetching] = useState(false);
  const [models, setModels] = useState<ModelPick[] | null>(null);
  const [fetchError, setFetchError] = useState("");

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
          api_key: form.apiKey || undefined,
          priority: Number(form.priority),
          isFreeTier: form.free,
        }),
      });
      if (res.status === 401 || res.status === 403) return setStatus("denied");
      if (!res.ok) return setStatus("err");
      setStatus("ok");
      setModels(null);
      setFetchError("");
      setForm({ providerKey: "google", displayName: "", baseUrl: "", modelName: "", apiKey: "", priority: 100, free: true });
    } catch {
      setStatus("err");
    }
  }

  async function fetchModels() {
    setFetching(true);
    setFetchError("");
    setModels(null);
    try {
      const res = await fetch("/api/providers/models", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          providerKey: form.providerKey,
          baseUrl: form.baseUrl || undefined,
          apiKey: form.apiKey || undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setFetchError(data?.error || "ফেচ ব্যর্থ");
        return;
      }
      const data = (await res.json()) as { models: ModelPick[] };
      setModels(data.models);
    } catch {
      setFetchError("নেটওয়ার্ক সমস্যা");
    } finally {
      setFetching(false);
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
      <div className="flex items-end gap-2">
        <label className="block flex-1">
          <span className="text-[11px] font-bold uppercase text-ink-soft">চালু নাম</span>
          <input className={field} placeholder="ঐচ্ছিক" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
        </label>
      </div>
      <label className="block">
        <span className="text-[11px] font-bold uppercase text-ink-soft">Base URL</span>
        <input className={field} placeholder="খালি রাখলে ডিফল্ট" value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} />
      </label>
      <label className="block">
        <span className="text-[11px] font-bold uppercase text-ink-soft">
          API Key <span className="normal-case text-ink-soft/70">(optional override — রো-লে সংরক্ষিত হয়, এখানে সেট করলে vault/env-কে অগ্রাহ্য করে)</span>
        </span>
        <input type="password" autoComplete="new-password" className={field} placeholder="খালি রাখলে Stronghold/vault/env ব্যবহার হয়" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} />
      </label>
      <label className="block">
        <span className="text-[11px] font-bold uppercase text-ink-soft">Priority</span>
        <input type="number" className={field} value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
      </label>
      <label className="flex items-center gap-2 text-[12.5px] font-medium text-ink">
        <input type="checkbox" checked={form.free} onChange={(e) => setForm({ ...form, free: e.target.checked })} />
        Free-tier (সবার আগে চেষ্টা)
      </label>

      <div className="border-t border-ink/15 pt-3">
        <button
          type="button"
          onClick={fetchModels}
          disabled={fetching}
          className="border-2 border-ink px-3.5 py-1.5 text-[12px] font-bold text-ink transition hover:bg-ink hover:text-paper disabled:opacity-50"
        >
          {fetching ? "··· ফেচ হচ্ছে" : "⚡ মডেল তালিকা অটো-ফেচ করুন"}
        </button>
        {fetching && <p className="mt-2 text-[11.5px] text-ink-soft">প্রোভাইডার প্রোব হচ্ছে — OpenRouter-এ শুধু ফ্রিরা আসবে।</p>}
        {fetchError && <p className="mt-2 text-[11.5px] font-bold text-alizarin">✗ {fetchError}</p>}
        {models && (
          <div className="mt-3 grid max-h-52 gap-1 overflow-y-auto border border-ink/20 bg-paper p-2">
            {models.length === 0 && <p className="p-2 text-[12px] text-ink-soft">কোনো ফ্রি মডেল পাওয়া যায়নি।</p>}
            {models.map((m) => (
              <button
                type="button"
                key={m.id}
                onClick={() => setForm((f) => ({ ...f, modelName: m.id }))}
                className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-[12px] text-ink transition hover:bg-ink hover:text-paper"
              >
                <span className="font-mono-x">{m.id}</span>
                <span className="max-w-[40%] truncate text-[10.5px] text-ink-soft">{m.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {status === "ok" && <p className="border border-cat-teal bg-cat-teal/10 px-3 py-2 text-[12px] font-bold text-ink">✓ যোগ হয়েছে।</p>}
      {status === "err" && <p className="border border-alizarin bg-alizarin/10 px-3 py-2 text-[12px] font-bold text-ink">✗ ব্যর্থ।</p>}
      {status === "denied" && <p className="border border-alizarin bg-alizarin/10 px-3 py-2 text-[12px] font-bold text-ink">অনুমতি নেই — admin প্রয়োজন।</p>}
      <button className="w-fit border-2 border-ink bg-ink px-5 py-2 text-[12.5px] font-bold text-paper transition hover:bg-alizarin">
        প্রোভাইডার যোগ করুন →
      </button>
    </form>
  );
}