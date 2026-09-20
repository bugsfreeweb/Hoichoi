"use client";

import Script from "next/script";
import { createElement } from "react";

/** The exact same vanilla Web Component powers web admin and both desktop UIs. */
export default function ModerationPanel({ origin = "web" }: { origin?: "web" | "desktop" }) {
  return <>
    <Script src="/moderation-panel.js" strategy="afterInteractive" />
    {createElement("hoichoi-moderation", { origin, theme: "dark", style: { display: "block", minHeight: 560 } })}
    <noscript>মন্তব্য পর্যালোচনা করতে JavaScript চালু করুন।</noscript>
  </>;
}
