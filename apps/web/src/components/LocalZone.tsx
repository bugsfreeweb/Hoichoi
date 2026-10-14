"use client";

import { useEffect, useState } from "react";

/**
 * Renders the visitor's own IANA timezone (e.g. `Asia/Dhaka`) so the footer
 * stamp reads `LOCALHOST/<your timezone> · EDGE CACHE ON` on every machine.
 * SSR/first paint shows a neutral placeholder to avoid a hydration mismatch.
 */
export default function LocalZone() {
  const [tz, setTz] = useState<string>("");

  useEffect(() => {
    try {
      setTz(Intl.DateTimeFormat().resolvedOptions().timeZone || "");
    } catch {
      /* very old engines: leave blank */
    }
  }, []);

  return <span suppressHydrationWarning>{tz || "UTC"}</span>;
}
