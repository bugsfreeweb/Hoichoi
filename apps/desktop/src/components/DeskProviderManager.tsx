import { useCallback, useEffect, useState } from "react";
import { Bot, Check, Plus, Pencil, RefreshCw, Sparkles, Trash2, X } from "lucide-react";
import {
  deskProviders,
  deskUpsertProvider,
  deskToggleProvider,
  deskRemoveProvider,
  deskProviderModels,
  type DeskProvider,
  type DeskProviderModel,
} from "../lib/tauri";
import { PROVIDER_META, metaFor, looksLikeImageModel, purposeLabelBn, type ProviderPurpose } from "@hoichoi/shared-types";
import { getRunEnv } from "../lib/vault";
import { autoPush } from "../lib/autosync";

interface Form {
  id: string;
  providerKey: string;
  displayName: string;
  modelName: string;
  baseUrl: string;
  envVar: string;
  apiKey: string;
  priority: number;
  free: boolean;
  embed: boolean;
  purpose: "text" | "image";
}

const EMPTY: Form = {
  id: "",
  providerKey: "google",
  displayName: "",
  modelName: "",
  baseUrl: "",
  envVar: "",
  apiKey: "",
  priority: 100,
  free: true,
  embed: false,
  purpose: "text",
};

/** AI provider manager for the desk — mirrors the web admin's provider panel. */
export default function DeskProviderManager() {
  const [providers, setProviders] = useState<DeskProvider[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [models, setModels] = useState<DeskProviderModel[] | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const flash = (type: "ok" | "err", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  /** Switching work type retargets provider + model so the row can do the job. */
  const pickPurpose = (next: ProviderPurpose) => {
    const meta = metaFor(form.providerKey);
    if (!meta.kinds.includes(next)) {
      const fallback = PROVIDER_META.find((p) => p.kinds.includes(next));
      if (fallback) {
        setForm((f) => ({
          ...f,
          purpose: next,
          providerKey: fallback.key,
          modelName: fallback.models[next][0] ?? "",
          baseUrl: fallback.baseUrl,
          free: fallback.freeTier,
        }));
        return;
      }
    }
    setForm((f) => ({ ...f, purpose: next, modelName: meta.models[next][0] ?? "", baseUrl: meta.baseUrl, free: meta.freeTier }));
  };

  const pickProvider = (key: string) => {
    const meta = metaFor(key);
    setForm((f) => {
      const purpose = meta.kinds.includes(f.purpose) ? f.purpose : (meta.kinds[0] ?? "text");
      return { ...f, providerKey: key, purpose, modelName: meta.models[purpose][0] ?? "", baseUrl: meta.baseUrl, free: meta.freeTier };
    });
    setModels(null);
    setFetchError("");
  };

  const refresh = useCallback(async () => {
    try {
      setProviders(await deskProviders(await getRunEnv()));
    } catch (e) {
      flash("err", String(e));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const resetForm = () => {
    setForm(EMPTY);
    setEditingId(null);
    setOpen(false);
    setModels(null);
    setFetchError("");
  };

  const startEdit = (p: DeskProvider) => {
    setEditingId(p.id);
    setForm({
      id: p.id,
      providerKey: p.provider_key,
      displayName: p.display_name || p.provider_key,
      modelName: p.model_name ?? "",
      baseUrl: p.base_url ?? "",
      envVar: p.api_key_env_var ?? "",
      apiKey: p.api_key ?? "",
      priority: p.priority,
      free: p.is_free_tier,
      embed: p.supports_embeddings,
      purpose: p.purpose === "image" ? "image" : "text",
    });
    setOpen(true);
    setModels(null);
    setFetchError("");
  };

  const fetchModelList = async () => {
    setFetching(true);
    setFetchError("");
    setModels(null);
    if (
      form.providerKey === "custom" &&
      form.purpose === "image" &&
      /(?:cloudflare\.com|pollinations\.ai)/i.test(form.baseUrl)
    ) {
      setFetchError("এই API-তে chat model তালিকা নেই; নিচের image model ID হাতে লিখুন।");
      setFetching(false);
      return;
    }
    try {
      setModels(
        await deskProviderModels(await getRunEnv(), {
          providerKey: form.providerKey,
          baseUrl: form.baseUrl.trim() || undefined,
          apiKey: form.apiKey.trim() || undefined,
        }),
      );
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "ফেচ ব্যর্থ");
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    if (!form.modelName.trim()) {
      flash("err", "মডেল নাম আবশ্যক");
      return;
    }
    setBusy(true);
    try {
      await deskUpsertProvider(await getRunEnv(), {
        id: editingId || undefined,
        providerKey: form.providerKey,
        displayName: form.displayName.trim() || form.providerKey,
        modelName: form.modelName.trim(),
        baseUrl: form.baseUrl.trim() || undefined,
        envVar: form.envVar.trim() || undefined,
        apiKey: form.apiKey.trim() || undefined,
        priority: Number(form.priority),
        free: form.free,
        embed: form.embed,
        purpose: form.purpose,
      });
      resetForm();
      await refresh();
      await autoPush();
      flash("ok", editingId ? "প্রোভাইডার আপডেট হয়েছে" : "প্রোভাইডার যোগ হয়েছে");
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "সংরক্ষণ ব্যর্থ");
    } finally {
      setBusy(false);
    }
  };

  const handleToggle = async (p: DeskProvider) => {
    try {
      await deskToggleProvider(await getRunEnv(), p.id);
      await refresh();
      await autoPush();
    } catch (e) {
      flash("err", String(e));
    }
  };

  const handleRemove = async (p: DeskProvider) => {
    if (!window.confirm(`"${p.display_name}" প্রোভাইডারটি মুছতে চান?`)) return;
    setBusy(true);
    try {
      await deskRemoveProvider(await getRunEnv(), p.id);
      await refresh();
      await autoPush();
      flash("ok", "মুছে ফেলা হয়েছে");
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "মুছতে ব্যর্থ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel mt-5">
      <p className="flex items-center gap-2 panel-title">
        <Bot size={14} className="text-lime" /> AI প্রোভাইডার · free-tier-first resolver
      </p>
      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">
        প্রতিটি প্রোভাইডার দুটি আলাদা কাজ করে — <b className="text-white">✍️ লেখা</b> আর{" "}
        <b className="text-white">🎨 ছবি</b>. Google/OpenAI-এর একই কী দিয়ে দুটোই হয়, শুধু ছবির জন্য আলাদা
        image মডেল বেছে নিতে হয়। ফ্রি টিয়ার আগে চেষ্টা হয়, তারপর priority ক্রমে। কী ডিফল্টে ভল্ট/env
        থেকে পড়া হয়; ডেটাবেসে আলাদা কী দিলে সেটি প্রাধান্য পায় — তাই খালি রাখাই ভালো।
      </p>

      {msg && (
        <p className={`mt-3 px-3 py-2 text-[12px] font-bold ${msg.type === "ok" ? "bg-lime text-night" : "bg-alizarin text-paper"}`}>
          {msg.type === "ok" ? "✓ " : "✕ "}
          {msg.text}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!open && (
          <button className="btn" onClick={() => setOpen(true)}>
            <Plus size={14} /> প্রোভাইডার যোগ / সম্পাদনা
          </button>
        )}
        <button className="btn-ghost" onClick={() => void refresh()}>
          <RefreshCw size={13} /> refresh
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-3 rounded-xl border border-lime/30 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between">
            <p className="font-serif-bn text-[15px] font-bold text-white">
              {editingId ? "প্রোভাইডার সম্পাদনা" : "নতুন প্রোভাইডার"}
            </p>
            <button className="rounded p-1 text-white/50 hover:text-white" onClick={resetForm}>
              <X size={14} />
            </button>
          </div>

          {/* 1 - purpose first: this is the choice operators kept getting wrong. */}
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">১ · কী কাজে ব্যবহার হবে?</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {([
                { v: "text" as const, emoji: "✍️", t: "লেখা (Text)", d: "সংবাদ লেখা, সারাংশ, অনুবাদ" },
                { v: "image" as const, emoji: "🎨", t: "ছবি (Image)", d: "পোস্টের AI হিরো ছবি" },
              ]).map((c) => (
                <button
                  key={c.v}
                  type="button"
                  onClick={() => pickPurpose(c.v)}
                  aria-pressed={form.purpose === c.v}
                  className={`rounded-lg border p-2.5 text-left transition ${
                    form.purpose === c.v ? "border-lime bg-lime/12" : "border-white/12 hover:border-white/30"
                  }`}
                >
                  <p className="text-[12px] font-bold text-white">
                    {c.emoji} {c.t}
                    {form.purpose === c.v && <span className="ml-2 font-mono-x text-[9px] text-lime">নির্বাচিত</span>}
                  </p>
                  <p className="mt-0.5 text-[10.5px] text-white/50">{c.d}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            <label className="block">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">২ · প্রোভাইডার</span>
              <select
                className="field mt-1 w-full"
                value={form.providerKey}
                onChange={(e) => pickProvider(e.target.value)}
                disabled={Boolean(editingId)}
              >
                {PROVIDER_META.map((k) => (
                  <option key={k.key} value={k.key} disabled={!k.kinds.includes(form.purpose)}>
                    {k.label}
                    {k.kinds.includes(form.purpose) ? "" : " — এই কাজের জন্য নয়"}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[10px] leading-snug text-white/40">{metaFor(form.providerKey).noteBn}</span>
            </label>
            <label className="block sm:col-span-2">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">
                ৩ · মডেল {form.purpose === "image" ? "(ছবি আঁকা মডেল)" : "(লেখার মডেল)"}
              </span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(metaFor(form.providerKey).models[form.purpose] ?? []).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, modelName: m }))}
                    className={`rounded-full border px-2.5 py-1 font-mono-x text-[10px] transition ${
                      form.modelName === m ? "border-lime bg-lime text-night" : "border-white/15 text-white/70 hover:border-white/40"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <input
                className="field mt-1 w-full"
                value={form.modelName}
                onChange={(e) => setForm({ ...form, modelName: e.target.value })}
                placeholder={form.purpose === "image" ? "gemini-2.5-flash-image" : "gpt-4o-mini"}
              />
            </label>
            <label className="block">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">চালু নাম</span>
              <input
                className="field mt-1 w-full"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                placeholder="খালি রাখলে provider_key"
              />
            </label>
            <label className="block">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Base URL</span>
              <input
                className="field mt-1 w-full font-mono text-[10.5px]"
                value={form.baseUrl}
                onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                placeholder="খালি রাখলে প্রিসেট"
              />
            </label>
            <label className="block">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">
                ৪ · Env var (কী কোথা থেকে পড়বে)
              </span>
              <input
                className="field mt-1 w-full font-mono text-[10.5px]"
                value={form.envVar}
                onChange={(e) => setForm({ ...form, envVar: e.target.value })}
                placeholder="GOOGLE_API_KEY"
              />
            </label>
            <label className="block">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">API key (DB override)</span>
              <input
                type="password"
                className="field mt-1 w-full font-mono text-[10.5px]"
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                placeholder="খালি = vault/env (সুপারিশকৃত)"
              />
            </label>
            <label className="block">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">Priority</span>
              <input
                type="number"
                className="field mt-1 w-full"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
              />
            </label>
            <label className="flex items-center gap-2 text-[12px] text-white/70">
              <input
                type="checkbox"
                checked={form.free}
                onChange={(e) => setForm({ ...form, free: e.target.checked })}
              />
              Free-tier (সবার আগে)
            </label>
            <label className="flex items-center gap-2 text-[12px] text-white/70">
              <input
                type="checkbox"
                checked={form.embed}
                onChange={(e) => setForm({ ...form, embed: e.target.checked })}
              />
              Embeddings সমর্থন
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-white/12 px-2.5 py-2 text-[10.5px] text-white/55">
              কাজ: <b className="text-white">{purposeLabelBn(form.purpose)}</b>
            </div>
          </div>
          {form.providerKey === "custom" && form.purpose === "image" && (
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-[11px] leading-relaxed text-white/65">
              <p className="font-bold text-white">ইমেজ API সেটআপ</p>
              <p>Cloudflare Workers AI (free daily quota): Base URL `https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID/ai/run`; model `@cf/black-forest-labs/flux-1-schnell`.</p>
              <p className="mt-1">Together AI: Base URL `https://api.together.ai/v1`; model `black-forest-labs/FLUX.1-schnell` (usage billed).</p>
              <p className="mt-1">Pollinations: Base URL `https://image.pollinations.ai`; model `flux` (key-free, ~1 image / 45s per IP) — অথবা কী থাকলে `https://gen.pollinations.ai`. Perchance has no documented public image API, so it is not wired as an automatic provider.</p>
              <p className="mt-1">Cloudflare has a limited free daily allocation; Together and Pollinations are usage-billed. Mark only eligible providers as Free-tier.</p>
            </div>
          )}

          <div className="border-t border-white/10 pt-3">
            <button
              type="button"
              className="btn-ghost"
              disabled={fetching}
              onClick={() => void fetchModelList()}
            >
              <Sparkles size={13} /> {fetching ? "··· ফেচ হচ্ছে" : "মডেল তালিকা অটো-ফেচ"}
            </button>
            {fetchError && <p className="mt-2 text-[11.5px] font-bold text-alizarin">✕ {fetchError}</p>}
            {models && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {models.length === 0 && <p className="text-[11.5px] text-ink-soft">কোনো মডেল পাওয়া যায়নি।</p>}
                {models.slice(0, 60).map((m) => (
                  <button
                    key={m.id}
                    className="rounded-lg bg-white/[0.06] px-2.5 py-1 font-mono-x text-[10.5px] text-white/80 transition-colors hover:bg-lime hover:text-night"
                    onClick={() => setForm((f) => ({ ...f, modelName: m.id }))}
                  >
                    {m.id}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <button className="btn-ghost" onClick={resetForm}>
              বাতিল
            </button>
            <button className="btn" disabled={busy} onClick={() => void handleSave()}>
              <Check size={14} /> {editingId ? "সংরক্ষণ" : "যোগ করুন"}
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {providers.map((p) => (
          <div key={p.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[12px] font-black text-night" style={{ background: p.is_free_tier ? "#c8f65d" : "#ffb454" }}>
                #{String(p.priority).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-[13.5px] font-bold text-white">
                  {p.display_name}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                      p.purpose === "image" ? "bg-alizarin/20 text-alizarin" : "bg-sky-300/15 text-sky-300"
                    }`}
                  >
                    {p.purpose === "image" ? "🎨 ছবি" : "✍️ লেখা"}
                  </span>
                  {p.is_free_tier && (
                    <span className="rounded-full bg-lime px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-night">FREE</span>
                  )}
                </p>
                <p className="font-mono-x text-[10px] text-white/40">
                  {p.provider_key} · {p.model_name}
                  {p.purpose === "image" && !looksLikeImageModel(p.model_name) && (
                    <span className="ml-1.5 text-amberx">⚠ মডেলটি ছবি আঁকার নয়</span>
                  )}
                </p>
                <p className="font-mono-x text-[10px] text-white/35">
                  key:{" "}
                  <span className={p.api_key ? "text-lime" : "text-white/50"}>
                    {p.api_key ? "DB override ✓" : `env → ${p.api_key_env_var}`}
                  </span>
                </p>
              </div>
              <button
                onClick={() => void handleToggle(p)}
                className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-night transition-colors ${p.is_active ? "bg-lime hover:brightness-110" : "bg-white/20 text-white/60"}`}
              >
                {p.is_active ? "Active" : "Paused"}
              </button>
              <button
                onClick={() => startEdit(p)}
                disabled={busy}
                className="rounded-lg p-2 text-white/55 transition-colors hover:bg-white/10 hover:text-white"
                title="সম্পাদনা"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => void handleRemove(p)}
                disabled={busy}
                className="rounded-lg p-2 text-alizarin transition-colors hover:bg-alizarin/12"
                title="মুছুন"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {providers.length === 0 && !open && (
        <div className="py-10 text-center text-ink-soft">কোনো প্রোভাইডার নেই। একটি যোগ করুন।</div>
      )}
    </div>
  );
}