"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackPageView } from "@/lib/track-client";

/**
 * Fires one page-view beacon per client-side navigation. Mounted once in the
 * public site layout; renders nothing.
 */
export default function TrafficTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname) return;
    trackPageView(pathname, typeof document !== "undefined" ? document.referrer : "");
  }, [pathname]);
  return null;
}
