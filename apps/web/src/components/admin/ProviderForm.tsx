"use client";

import { useState } from "react";
import { PROVIDER_META, metaFor, type ProviderPurpose } from "@/lib/provider-catalog";

interface ModelPick {
  id: string;
  label: string;
}

const field = "mt-1 w-full border border-ink/30 bg-paper px-3 py-2 text-[13px] text-ink focus:outline-none focus:border-ink";

const PURPOSE_CARDS: { value: ProviderPurpose; emoji: string; title: string; body: string }[] = [
  {
    value: "text",
    emoji: "✍️",
    title: "লেখার কাজ (Text)",
    body: "সংবাদ লেখা, অনুবাদ, সারাংশ, ট্যাগ — পাইপলাইনের সব লেখা এখান দিয়ে যায়।",
  },
  {
    value: "image",
    emoji: "🎨",
    title: "ছবি তৈরি (Image)",
    body: "পোস্টের হিরো ছবি AI দিয়ে আঁকা। আলাদা ইমেজ-সক্ষম মডেল লাগবে।",
  },
];

export function ProviderForm() {
  const [purpose, setPurpose] = useState<ProviderPurpose>("text");
  const [providerKey, setProviderKey] = useState("google");
  const [displayName, setDisplayName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [modelName, setModelName] = useState("gemini-2.5-flash");
  const [apiKey, setApiKey] = useState("");
  const [priority, setPriority] = useState(100);
  const [free, setFree] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [status, setStatus] = useState<null | "ok" | "err" | "denied">(null);
  const [submitError, setSubmitError] = useState("");
  const [fetching, setFetching] = useState(false);
  const [models, setModels] = useState<ModelPick[] | null>(null);
  const [fetchError, setFetchError] = useState("");

  const meta = metaFor(providerKey);
  const canImage = meta.kinds.includes("image");
  const suggestions = meta.models[purpose];
  const needsBaseUrl = providerKey === "custom";

  /** Switching work type keeps the provider but retargets the model. */
  function pickPurpose(next: ProviderPurpose) {
    setPurpose(next);
    const m = metaFor(providerKey);
    if (!m.kinds.includes(next)) {
      // The current provider cannot do this job — move to one that can so the
      // operator is never left with "image purpose + chat-only provider".
      const fallback = PROVIDER_META.find((p) => p.kinds.includes(next));
      if (fallback) {
        setProviderKey(fallback.key);
        setModelName(fallback.models[next][0] ?? "");
        setBaseUrl(fallback.baseUrl);
        setFree(fallback.freeTier);
      }
      return;
    }
    setModelName(m.models[next][0] ?? "");
    setBaseUrl(m.baseUrl);
    setFree(m.freeTier);
  }

  function pickProvider(key: string) {
    const m = metaFor(key);
    setProviderKey(key);
    setBaseUrl(m.baseUrl);
    setFree(m.freeTier);
    const target = m.kinds.includes(purpose) ? purpose : (m.kinds[0] ?? "text");
    setPurpose(target);
    setModelName(m.models[target][0] ?? "");
    setModels(null);
    setFetchError("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setSubmitError("");
    try {
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          providerKey,
          displayName: displayName || undefined,
          baseUrl: baseUrl || undefined,
          modelName,
          api_key: apiKey || undefined,
          priority: Number(priority),
          isFreeTier: free,
          purpose,
        }),
      });
      if (res.status === 401 || res.status === 403) return setStatus("denied");
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setSubmitError(data?.error ?? `HTTP ${res.status}`);
        return setStatus("err");
      }
      setStatus("ok");
      setModels(null);
      setFetchError("");
      setDisplayName("");
      setApiKey("");
    } catch {
      setSubmitError("নেটওয়ার্ক সমস্যা — আবার চেষ্টা করুন।");
      setStatus("err");
    }
  }

  async function fetchModels() {
    setFetching(true);
    setFetchError("");
    setModels(null);
    if (providerKey === "custom" && purpose === "image" && /(?:cloudflare\.com|gen\.pollinations\.ai)/i.test(baseUrl)) {
      setFetchError("এই API-তে chat মডেলের তালিকা নেই; উপরের সাজেশন থেকে image মডেল বেছে নিন বা হাতে লিখুন।");
      setFetching(false);
      return;
    }
    try {
      const res = await fetch("/api/providers/models", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ providerKey, baseUrl: baseUrl || undefined, apiKey: apiKey || undefined }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setFetchError(data?.error || "মডেল তালিকা আনা যায়নি");
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
    <form onSubmit={onSubmit} className="grid gap-4">
      {/* 1 — what the provider is for */}
      <div>
        <p className="font-mono-x text-[10px] tracking-[0.18em] text-ink-soft uppercase">১ · কী কাজে ব্যবহার হবে?</p>
        <div className="mt-2 grid gap-2">
          {PURPOSE_CARDS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => pickPurpose(c.value)}
              aria-pressed={purpose === c.value}
              className={`border p-3 text-left transition ${
                purpose === c.value
                  ? "border-2 border-ink bg-lime/15"
                  : "border-ink/20 bg-paper hover:border-ink/50"
              }`}
            >
              <p className="flex items-center gap-2 text-[13px] font-bold text-ink">
                <span aria-hidden>{c.emoji}</span>
                {c.title}
                {purpose === c.value && <span className="ml-auto font-mono-x text-[9.5px] text-cat-teal">নির্বাচিত</span>}
              </p>
              <p className="mt-1 text-[11.5px] leading-snug text-ink-soft">{c.body}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 2 — provider */}
      <div>
        <p className="font-mono-x text-[10px] tracking-[0.18em] text-ink-soft uppercase">২ · প্রোভাইডার</p>
        <select className={field} value={providerKey} onChange={(e) => pickProvider(e.target.value)}>
          {PROVIDER_META.map((p) => (
            <option key={p.key} value={p.key} disabled={!p.kinds.includes(purpose)}>
              {p.label}
              {p.kinds.includes(purpose) ? "" : " — এই কাজের জন্য নয়"}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-[11px] leading-snug text-ink-soft">{meta.noteBn}</p>
      </div>

      {/* 3 — model */}
      <div>
        <p className="font-mono-x text-[10px] tracking-[0.18em] text-ink-soft uppercase">
          ৩ · মডেল {purpose === "image" ? "(ছবি আঁকা মডেল)" : "(লেখার মডেল)"}
        </p>
        {suggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {suggestions.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModelName(m)}
                className={`rounded-full border px-2.5 py-1 font-mono-x text-[10.5px] transition ${
                  modelName === m ? "border-ink bg-ink text-paper" : "border-ink/25 text-ink hover:border-ink"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        )}
        <input
          required
          className={field}
          placeholder={purpose === "image" ? "gemini-2.5-flash-image" : "gemini-2.5-flash"}
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchModels}
            disabled={fetching}
            className="border border-ink/40 px-3 py-1.5 text-[11.5px] font-bold text-ink transition hover:bg-ink hover:text-paper disabled:opacity-50"
          >
            {fetching ? "··· আনা হচ্ছে" : "⚡ প্রোভাইডার থেকে তালিকা আনুন"}
          </button>
          {purpose === "image" && (
            <span className="text-[10.5px] text-ink-soft">ছবির মডেলের তালিকা সব প্রোভাইডারে থাকে না — নাম হাতে লিখলেও চলবে।</span>
          )}
        </div>
        {fetchError && <p className="mt-2 text-[11.5px] font-bold text-alizarin">✗ {fetchError}</p>}
        {models && (
          <div className="mt-3 grid max-h-52 gap-1 overflow-y-auto border border-ink/20 bg-paper p-2">
            {models.length === 0 && <p className="p-2 text-[12px] text-ink-soft">কোনো মডেল পাওয়া যায়নি।</p>}
            {models.map((m) => (
              <button
                type="button"
                key={m.id}
                onClick={() => setModelName(m.id)}
                className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-[12px] text-ink transition hover:bg-ink hover:text-paper"
              >
                <span className="font-mono-x">{m.id}</span>
                <span className="max-w-[40%] truncate text-[10.5px] opacity-70">{m.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4 — key */}
      <div>
        <p className="font-mono-x text-[10px] tracking-[0.18em] text-ink-soft uppercase">৪ · API কী</p>
        <p className="mt-1.5 border border-cat-teal/40 bg-cat-teal/10 px-2.5 py-2 text-[11.5px] leading-snug text-ink">
          GitHub/Vercel-এ <span className="font-mono-x font-bold">{meta.envVar}</span> আগেই সেট থাকলে এখানে কিছু
          লিখতে হবে না — খালি রাখলেই সেই কী ব্যবহার হবে। শুধু আলাদা কী ব্যবহার করতে চাইলে লিখুন।
        </p>
        <input
          type="password"
          autoComplete="new-password"
          className={field}
          placeholder="খালি = এনভায়রনমেন্টের কী ব্যবহার হবে"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
      </div>

      {/* advanced */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="text-[11.5px] font-bold text-ink-soft underline decoration-dotted underline-offset-2 hover:text-ink"
        >
          {showAdvanced ? "− উন্নত সেটিংস লুকান" : "+ উন্নত সেটিংস (Base URL, অগ্রাধিকার, ফ্রি টিয়ার)"}
        </button>
        {showAdvanced && (
          <div className="mt-2 grid gap-2 border border-ink/15 bg-ink/[0.03] p-3">
            <label className="block">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Base URL</span>
              <input
                className={field}
                required={needsBaseUrl}
                placeholder={needsBaseUrl ? "https://api.example.com/v1" : "খালি রাখলে ডিফল্ট"}
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">চালু নাম (ঐচ্ছিক)</span>
              <input className={field} placeholder={meta.label} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">অগ্রাধিকার (ছোট সংখ্যা আগে)</span>
              <input type="number" className={field} value={priority} onChange={(e) => setPriority(Number(e.target.value))} />
            </label>
            <label className="flex items-center gap-2 text-[12px] font-medium text-ink">
              <input type="checkbox" checked={free} onChange={(e) => setFree(e.target.checked)} />
              ফ্রি টিয়ার — সবার আগে চেষ্টা হবে
            </label>
            {purpose === "image" && providerKey === "custom" && (
              <div className="text-[11px] leading-relaxed text-ink-soft">
                <p className="font-bold text-ink">কাস্টম ইমেজ API-এর উদাহরণ</p>
                <p className="mt-1">Pollinations (কী ছাড়া): <code>https://image.pollinations.ai</code> · মডেল `flux`</p>
                <p>Cloudflare Workers AI: <code>https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID/ai/run</code> · `@cf/black-forest-labs/flux-1-schnell`</p>
                <p>Together AI: <code>https://api.together.ai/v1</code> · `black-forest-labs/FLUX.1-schnell` (বিল হয়)</p>
              </div>
            )}
          </div>
        )}
      </div>

      {!canImage && purpose === "image" && (
        <p className="border border-amberx bg-amberx/10 px-3 py-2 text-[12px] font-bold text-ink">
          ⚠ এই প্রোভাইডার ছবি তৈরি করতে পারে না — Google, OpenAI বা কাস্টম বেছে নিন।
        </p>
      )}

      {status === "ok" && <p className="border border-cat-teal bg-cat-teal/10 px-3 py-2 text-[12px] font-bold text-ink">✓ প্রোভাইডার যোগ হয়েছে।</p>}
      {status === "err" && (
        <p className="border border-alizarin bg-alizarin/10 px-3 py-2 text-[12px] font-bold text-ink">✗ {submitError || "ব্যর্থ।"}</p>
      )}
      {status === "denied" && <p className="border border-alizarin bg-alizarin/10 px-3 py-2 text-[12px] font-bold text-ink">অনুমতি নেই — admin প্রয়োজন।</p>}

      <button className="w-fit border-2 border-ink bg-ink px-5 py-2 text-[12.5px] font-bold text-paper transition hover:bg-alizarin">
        {purpose === "image" ? "🎨 ইমেজ প্রোভাইডার যোগ করুন →" : "✍️ টেক্সট প্রোভাইডার যোগ করুন →"}
      </button>
    </form>
  );
}
