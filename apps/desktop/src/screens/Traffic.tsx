import { useCallback, useEffect, useState } from "react";
import { TrafficView } from "@hoichoi/dash";
import type { TrafficRange, TrafficSnapshot } from "@hoichoi/shared-types";
import { deskTraffic } from "../lib/tauri";
import { getRunEnv } from "../lib/vault";

/**
 * Desktop traffic analytics. Pulls the same first-party snapshot the web admin
 * renders (via the runner's `traffic` command) and hands it to the shared
 * {@link TrafficView} so both surfaces stay identical.
 */
export default function Traffic() {
  const [range, setRange] = useState<TrafficRange>("24h");
  const [data, setData] = useState<TrafficSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async (r: TrafficRange) => {
    setLoading(true);
    setErr(null);
    try {
      const snap = await deskTraffic(await getRunEnv(), r);
      setData(snap);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(range);
  }, [range, load]);

  return (
    <div className="flex h-full flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono-x text-[10px] tracking-[0.24em] text-white/35 uppercase">
            FIRST-PARTY · COOKIE-LESS
          </p>
          <h1 className="text-[22px] font-bold text-white">ট্রাফিক অ্যানালিটিক্স</h1>
        </div>
        <button
          onClick={() => void load(range)}
          disabled={loading}
          className="rounded-lg border border-white/12 bg-white/5 px-3 py-1.5 font-mono-x text-[10.5px] tracking-[0.12em] text-white/70 transition-colors hover:bg-white/10 disabled:opacity-50"
        >
          {loading ? "SYNCING…" : "REFRESH"}
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {err && !data ? (
          <div className="rounded-xl border border-rose-400/25 bg-rose-400/10 p-4 text-[12.5px] text-rose-200">
            ট্রাফিক ডেটা লোড ব্যর্থ: {err}
          </div>
        ) : (
          <TrafficView data={data} range={range} onRange={setRange} loading={loading} error={err} />
        )}
      </div>
    </div>
  );
}
