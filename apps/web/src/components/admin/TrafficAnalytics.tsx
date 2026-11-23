"use client";

import { useCallback, useEffect, useState } from "react";
import { TrafficView } from "@hoichoi/dash";
import type { TrafficRange, TrafficSnapshot } from "@hoichoi/shared-types";
import { useBi } from "@/components/i18n/LocaleProvider";

/**
 * Web-admin wrapper around the shared {@link TrafficView}: hydrated with a
 * server snapshot, then re-fetched whenever the operator switches the range.
 */
export function TrafficAnalytics({ initial }: { initial: TrafficSnapshot | null }) {
  const b = useBi();
  const [range, setRange] = useState<TrafficRange>(initial?.range ?? "24h");
  const [data, setData] = useState<TrafficSnapshot | null>(initial);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async (r: TrafficRange) => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/traffic?range=${r}`, { cache: "no-store" });
      if (res.status === 401 || res.status === 403) throw new Error(b("অনুমতি নেই", "Not allowed"));
      const json = (await res.json()) as TrafficSnapshot & { ok?: boolean; error?: string; range?: TrafficRange };
      if (!json.ok) throw new Error(json.error ?? b("লোড ব্যর্থ", "Could not load"));
      setData(json);
    } catch (e) {
      setErr(e instanceof Error ? e.message : b("লোড ব্যর্থ", "Could not load"));
    } finally {
      setLoading(false);
    }
    // `b` is stable per locale and is not part of the fetch identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (initial && range === initial.range) return;
    void load(range);
  }, [range, initial, load]);

  return <TrafficView data={data} range={range} onRange={setRange} loading={loading} error={err} />;
}
