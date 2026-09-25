import { useEffect, useRef, useState } from "react";
import { Cloud, GitBranch, HardDrive, Server, RotateCw, Check, Loader2, X } from "lucide-react";
import { getRunEnv } from "../lib/vault";
import {
  deskMediaStorage,
  deskMediaCleanup,
  type MediaStorageConfig,
  type MediaStorageAdapterConfig,
} from "../lib/tauri";
import { toast } from "../lib/toast";

const DEFAULT_ADAPTERS: MediaStorageAdapterConfig[] = [
  { kind: "github", enabled: false, label: "GitHub" },
  { kind: "s3", enabled: false, label: "IDrive e2", provider: "idrivee2" },
  { kind: "s3", enabled: false, label: "Backblaze B2", provider: "backblaze" },
];

const EMPTY: MediaStorageConfig = {
  adapters: DEFAULT_ADAPTERS.map((a) => ({ ...a })),
  purge_local_after_upload: false,
  retention_months: 1,
  cleanup_enabled: false,
};

const ADAPTER_ICON: Record<string, typeof GitBranch> = {
  github: GitBranch,
  idrivee2: Server,
  backblaze: HardDrive,
};

export default function MediaStoragePanel() {
  const [cfg, setCfg] = useState<MediaStorageConfig | null>(null);
  const [registry, setRegistry] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);

  const persist = async (next: MediaStorageConfig, silent = false) => {
    setSaving(true);
    setErr(null);
    try {
      await deskMediaStorage(await getRunEnv(), JSON.stringify(next));
      setSavedTick((t) => t + 1);
      if (!silent) {
        setMsg("মিডিয়া স্টোরেজ নীতি সংরক্ষিত হয়েছে — পরের রানে অ্যাডাপ্টার চেইন কার্যকর হবে।");
        toast.ok("স্টোরেজ নীতি সংরক্ষিত", "পরের রান থেকেই অ্যাডাপ্টার চেইন কার্যকর হবে।");
      }
    } catch (e) {
      setSaving(false);
      setErr(String(e));
      toast.err("স্টোরেজ সংরক্ষণ ব্যর্থ", String(e));
      return false;
    }
    setSaving(false);
    return true;
  };

  // Auto-save after every edit so toggles never get lost when the panel remounts.
  const enqueuePersist = (next: MediaStorageConfig) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void persist(next, true);
    }, 800);
  };

  const load = async () => {
    if (!isMounted.current) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await deskMediaStorage(await getRunEnv());
      if (!isMounted.current) return;
      setCfg(
        res.config && Array.isArray(res.config.adapters) && res.config.adapters.length > 0
          ? res.config
          : EMPTY,
      );
      setRegistry(res.registry ?? 0);
    } catch (e) {
      if (isMounted.current) setErr(String(e));
    } finally {
      if (isMounted.current) setBusy(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    void load();
    return () => {
      isMounted.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const patch = (i: number, p: Partial<MediaStorageAdapterConfig>) => {
    if (!cfg) return;
    const next = { ...cfg, adapters: cfg.adapters.map((a, k) => (k === i ? { ...a, ...p } : a)) };
    setCfg(next);
    enqueuePersist(next);
  };

  const patchGlobal = (p: Partial<MediaStorageConfig>) => {
    if (!cfg) return;
    const next = { ...cfg, ...p };
    setCfg(next);
    enqueuePersist(next);
  };

  const dryRunCleanup = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await deskMediaCleanup(await getRunEnv(), { dryRun: true });
      setMsg(`ক্লিনআপ (dry-run): ${r.considered}টি পুরনো ব্লব মুছে ফেলা হবে (${r.cutoff.slice(0, 10)}-এর আগে)।`);
      toast.info("ক্লিনআপ (dry-run)", `${toBn(r.considered)}টি ব্লব ডিলিট-প্রস্তাবিত · cutoff ${r.cutoff.slice(0, 10)}`);
    } catch (e) {
      setErr(String(e));
      toast.err("ক্লিনআপ ব্যর্থ", String(e));
    } finally {
      setBusy(false);
    }
  };

  const enabledCount = cfg?.adapters.filter((a) => a.enabled).length ?? 0;
  const hasEnabled = (cfg?.adapters.some((a) => a.enabled) ?? false);

  return (
    <div className="panel mt-5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="flex items-center gap-2 panel-title">
          <Cloud size={14} className="text-lime" /> মিডিয়া স্টোরেজ · fallback চেইন + মাসিক ডিলিট
        </p>
        <span className="rounded-full bg-white/5 px-2 py-1 font-mono-x text-[10px] text-white/45">
          {enabledCount} চালু · {toBn(registry)} ফাইল registry
        </span>
        {saving && (
          <span className="flex items-center gap-1.5 rounded-full bg-sky-400/15 px-2.5 py-1 font-mono-x text-[10px] text-sky-300">
            <Loader2 size={11} className="animate-spin" /> সংরক্ষণ হচ্ছে…
          </span>
        )}
        {!saving && cfg && savedTick > 0 && hasEnabled && (
          <span className="flex items-center gap-1.5 rounded-full bg-lime/15 px-2.5 py-1 font-mono-x text-[10px] text-lime">
            <Check size={11} /> সংরক্ষিত ✓
          </span>
        )}
        {!saving && cfg && !hasEnabled && (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-400/15 px-2.5 py-1 font-mono-x text-[10px] text-amber-300">
            <X size={11} /> কোনো অ্যাডাপ্টার চালু নেই
          </span>
        )}
      </div>
      <p className="mt-2 text-[11.5px] leading-relaxed text-white/50">
        প্রতিটি মিডিয়া ফাইল প্রথমে চালু অ্যাডাপ্টারগুলোর মধ্যে প্রথমটিতে আপলোড হয়; ব্যর্থ হলে পরেরটি
        নেয় (fallback)। সিক্রেট (PAT / Access key) API ভল্ট ট্যাবে রাখা হয়। GitHub আরার জন্য রিপো
        পাবলিক হলেই jsDelivr CDN কাজ করে, প্রাইভেট হলেও আপলোড হবে।
      </p>

      {msg && <p className="mt-3 rounded-lg bg-lime/10 px-3 py-2 text-[11.5px] font-bold text-lime">✓ {msg}</p>}
      {err && <p className="mt-3 rounded-lg bg-rose-500/12 px-3 py-2 text-[11.5px] font-bold text-rose-300">✕ {err}</p>}

      {cfg && (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {cfg.adapters.map((a, i) => {
            const Icon = ADAPTER_ICON[a.provider ?? a.kind] ?? Cloud;
            const enabled = Boolean(a.enabled);
            return (
              <section
                key={`${a.kind}-${a.provider ?? ""}`}
                className={`rounded-xl border p-4 transition-colors ${enabled ? "border-lime/30 bg-lime/[0.04]" : "border-white/10 bg-white/[0.03]"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-[13px] font-bold text-white">
                    <Icon size={14} className={enabled ? "text-lime" : "text-white/35"} />
                    {a.kind === "s3" && a.provider === "backblaze"
                      ? "Backblaze B2"
                      : a.kind === "s3"
                        ? "IDrive e2"
                        : "GitHub"}
                  </p>
                  <button
                    onClick={() => patch(i, { enabled: !enabled })}
                    className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${enabled ? "bg-lime" : "bg-white/15"}`}
                  >
                    <span className="absolute top-0.5 h-4 w-4 rounded-full bg-night transition-all" style={{ left: enabled ? 18 : 2 }} />
                  </button>
                </div>

                {enabled && (
                  <div className="mt-3 space-y-2">
                    <label className="block">
                      <span className="text-[9.5px] font-bold uppercase tracking-wide text-white/40">লেবেল</span>
                      <input
                        value={a.label}
                        onChange={(e) => patch(i, { label: e.target.value })}
                        className="mt-0.5 w-full rounded-lg border border-white/10 bg-[#0a0d12] px-2.5 py-1.5 text-[12px] text-white outline-none focus:border-lime/60"
                      />
                    </label>
                    {a.kind === "github" && (
                      <>
                        <label className="block">
                          <span className="text-[9.5px] font-bold uppercase tracking-wide text-white/40">
                            ব্রাঞ্চ (ঐচ্ছিক)
                          </span>
                          <input
                            value={a.branch ?? "main"}
                            onChange={(e) => patch(i, { branch: e.target.value || undefined })}
                            className="mt-0.5 w-full rounded-lg border border-white/10 bg-[#0a0d12] px-2.5 py-1.5 font-mono-x text-[12px] text-white outline-none"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[9.5px] font-bold uppercase tracking-wide text-white/40">
                            রিপো পাথ (ঐচ্ছিক)
                          </span>
                          <input
                            value={a.mediaPath ?? "media/"}
                            onChange={(e) => patch(i, { mediaPath: e.target.value || "media/" })}
                            className="mt-0.5 w-full rounded-lg border border-white/10 bg-[#0a0d12] px-2.5 py-1.5 font-mono-x text-[12px] text-white outline-none"
                          />
                        </label>
                      </>
                    )}
                    {a.kind === "s3" && (
                      <>
                        <label className="block">
                          <span className="text-[9.5px] font-bold uppercase tracking-wide text-white/40">
                            Endpoint (ঐচ্ছিক ওভাররাইড)
                          </span>
                          <input
                            value={a.endpoint ?? ""}
                            placeholder={a.provider === "backblaze" ? "https://s3.us-west-004.backblazeb2.com" : "https://www.idrivee2.com"}
                            onChange={(e) => patch(i, { endpoint: e.target.value || undefined })}
                            className="mt-0.5 w-full rounded-lg border border-white/10 bg-[#0a0d12] px-2.5 py-1.5 font-mono-x text-[12px] text-white outline-none"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[9.5px] font-bold uppercase tracking-wide text-white/40">
                            Bucket (ঐচ্ছিক ওভাররাইড)
                          </span>
                          <input
                            value={a.bucket ?? ""}
                            onChange={(e) => patch(i, { bucket: e.target.value || undefined })}
                            className="mt-0.5 w-full rounded-lg border border-white/10 bg-[#0a0d12] px-2.5 py-1.5 font-mono-x text-[12px] text-white outline-none"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[9.5px] font-bold uppercase tracking-wide text-white/40">Region</span>
                          <input
                            value={a.region ?? "us-east-1"}
                            onChange={(e) => patch(i, { region: e.target.value || "us-east-1" })}
                            className="mt-0.5 w-full rounded-lg border border-white/10 bg-[#0a0d12] px-2.5 py-1.5 font-mono-x text-[12px] text-white outline-none"
                          />
                        </label>
                      </>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {cfg && (
        <div className="mt-4 grid gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-3">
          <label className="flex items-center justify-between gap-3">
            <span className="text-[12px] font-bold text-white">আপলোডের পর লোকাল কপি মুছে ফেলুন</span>
            <button
              onClick={() => patchGlobal({ purge_local_after_upload: !cfg.purge_local_after_upload })}
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${cfg.purge_local_after_upload ? "bg-lime" : "bg-white/15"}`}
            >
              <span className="absolute top-0.5 h-4 w-4 rounded-full bg-night transition-all" style={{ left: cfg.purge_local_after_upload ? 18 : 2 }} />
            </button>
          </label>
          <label className="block">
            <span className="text-[9.5px] font-bold uppercase tracking-wide text-white/40">
              Retention (মাস) — মাসিক ডিলিট
            </span>
            <input
              type="number"
              min={1}
              max={120}
              value={cfg.retention_months}
              onChange={(e) => patchGlobal({ retention_months: Math.max(1, Number(e.target.value) || 1) })}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#0a0d12] px-2.5 py-1.5 font-mono-x text-[12px] text-white outline-none"
            />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span className="text-[12px] font-bold text-white">ক্লিনআপ (সূচি) চালু</span>
            <button
              onClick={() => patchGlobal({ cleanup_enabled: !cfg.cleanup_enabled })}
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${cfg.cleanup_enabled ? "bg-lime" : "bg-white/15"}`}
            >
              <span className="absolute top-0.5 h-4 w-4 rounded-full bg-night transition-all" style={{ left: cfg.cleanup_enabled ? 18 : 2 }} />
            </button>
          </label>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => void persist(cfg!)} disabled={busy || saving || !cfg} className="btn">
          💾 স্টোরেজ নীতি সংরক্ষণ
        </button>
        <button onClick={() => void dryRunCleanup()} disabled={busy || saving || !cfg} className="btn-ghost" title="শুধু দেখাবে, কিছু মুছবে না">
          <RotateCw size={12} /> ক্লিনআপ (dry-run)
        </button>
        <button onClick={() => void load()} disabled={busy || saving} className="btn-ghost">
          Load current
        </button>
      </div>
      <p className="mt-3 text-[10.5px] text-white/35">
        টগল বদলালেই অটো-সংরক্ষিত হয় — ট্যাব পাল্টালেও সেটিং হারাবে না। Access keys vault ট্যাবে:
        IDRIVEE2_ACCESS_KEY/SECRET_KEY/BUCKET/ENDPOINT, B2_ACCESS_KEY/SECRET_KEY/BUCKET/ENDPOINT,
        GitHub PAT + repo। চলমান <code className="text-lime">media cleanup --dry-run --months N</code> ডি-লিটের প্রিভিউ দেয়।
      </p>
    </div>
  );
}

function toBn(n: number): string {
  try {
    return new Intl.NumberFormat("bn-BD").format(n);
  } catch {
    return String(n);
  }
}