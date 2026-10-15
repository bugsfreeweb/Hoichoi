import { useCallback, useEffect, useState } from "react";
import { StorageView, TrafficView } from "@hoichoi/dash";
import type { StorageSnapshot, TrafficRange, TrafficSnapshot } from "@hoichoi/shared-types";
import { deskStorage, deskTraffic } from "../lib/tauri";
import { getRunEnv } from "../lib/vault";

type Tab = "traffic" | "storage";

/**
 * Desktop analytics. Pulls the same first-party snapshots the web admin renders
 * (via the runner's `traffic` / `storage` commands) and hands them to the shared
 * views so both surfaces stay identical. A tab switch keeps the traffic charts
 * and the storage report in one screen without a second nav entry.
 */
export default function Traffic() {
  const [tab, setTab] = useState<Tab>("traffic");
  const [range, setRange] = useState<TrafficRange>("24h");
  const [data, setData] = useState<TrafficSnapshot | null>(null);
  const [storage, setStorage] = useState<StorageSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadTraffic = useCallback(async (r: TrafficRange) => {
    setLoading(true);
    setErr(null);
    try {
      setData(await deskTraffic(await getRunEnv(), r));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStorage = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      setStorage(await deskStorage(await getRunEnv()));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "traffic") void loadTraffic(range);
    else void loadStorage();
  }, [tab, range, loadTraffic, loadStorage]);

  return (
    <div className="flex h-full flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono-x text-[10px] tracking-[0.24em] text-white/35 uppercase">
            FIRST-PARTY · COOKIE-LESS
          </p>
          <h1 className="text-[22px] font-bold text-white">
            {tab === "traffic" ? "ট্রাফিক অ্যানালিটিক্স" : "স্টোরেজ ও ডেটাবেস"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-white/12 bg-white/5 p-0.5">
            {(["traffic", "storage"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-md px-3 py-1.5 text-[11px] font-bold transition-colors ${
                  tab === t ? "bg-white text-night" : "text-white/60 hover:text-white"
                }`}
              >
                {t === "traffic" ? "ট্রাফিক" : "স্টোরেজ"}
              </button>
            ))}
          </div>
          <button
            onClick={() => void (tab === "traffic" ? loadTraffic(range) : loadStorage())}
            disabled={loading}
            className="rounded-lg border border-white/12 bg-white/5 px-3 py-1.5 font-mono-x text-[10.5px] tracking-[0.12em] text-white/70 transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            {loading ? "SYNCING…" : "REFRESH"}
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {err && !data && tab === "traffic" ? (
          <div className="rounded-xl border border-rose-400/25 bg-rose-400/10 p-4 text-[12.5px] text-rose-200">
            ট্রাফিক ডেটা লোড ব্যর্থ: {err}
          </div>
        ) : err && !storage && tab === "storage" ? (
          <div className="rounded-xl border border-rose-400/25 bg-rose-400/10 p-4 text-[12.5px] text-rose-200">
            স্টোরেজ রিপোর্ট লোড ব্যর্থ: {err}
          </div>
        ) : tab === "traffic" ? (
          <TrafficView data={data} range={range} onRange={setRange} loading={loading} error={err} />
        ) : (
          <StorageView data={storage} loading={loading} error={err} />
        )}
      </div>
    </div>
  );
}
