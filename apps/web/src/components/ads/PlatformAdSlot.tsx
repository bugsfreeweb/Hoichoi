"use client";

import { useEffect, useRef, useState } from "react";
import { AdCreativePreview } from "./AdCreativePreview";

interface PlatformAd {
  bookingId: string;
  slotKey: string;
  name: string;
  templateId: string;
  palette: string;
  data: Record<string, unknown>;
}

function destinationUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function PlatformAdSlot({ slotKey }: { slotKey: string }) {
  const [ad, setAd] = useState<PlatformAd | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const impressionSent = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/platform-ads/${encodeURIComponent(slotKey)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Ad slot request failed (${response.status}).`);
        const result = await response.json() as { ad?: PlatformAd | null };
        setAd(result.ad ?? null);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        console.error("[platform-ads] slot request failed", { slotKey, error });
      });
    return () => controller.abort();
  }, [slotKey]);

  useEffect(() => {
    if (!ad || !root.current || impressionSent.current) return;
    const sendImpression = () => {
      if (impressionSent.current) return;
      impressionSent.current = true;
      void sendEvent(ad, "impression");
    };
    if (!("IntersectionObserver" in window)) {
      sendImpression();
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        sendImpression();
        observer.disconnect();
      }
    }, { threshold: 0.25 });
    observer.observe(root.current);
    return () => observer.disconnect();
  }, [ad]);

  if (!ad) return null;
  const headline = typeof ad.data.headline === "string" && ad.data.headline.trim()
    ? ad.data.headline
    : ad.name;
  const body = typeof ad.data.body === "string" ? ad.data.body : "";
  const cta = typeof ad.data.cta === "string" && ad.data.cta.trim() ? ad.data.cta : "আরও জানুন";
  const destination = destinationUrl(ad.data.url);
  if (!destination) {
    console.error("[platform-ads] active creative has an invalid destination", { slotKey, creative: ad.name });
    return null;
  }

  return (
    <aside ref={root} aria-label="স্পনসরকৃত বিজ্ঞাপন" className="mx-auto my-5 max-w-[1400px] md:my-7">
      <AdCreativePreview
        name={ad.name}
        headline={headline}
        body={body}
        cta={cta}
        templateId={ad.templateId}
        palette={ad.palette}
        href={destination}
        onClick={() => { void sendEvent(ad, "click"); }}
      />
    </aside>
  );
}

async function sendEvent(ad: PlatformAd, kind: "impression" | "click"): Promise<void> {
  const payload = JSON.stringify({
    bookingId: ad.bookingId,
    slotKey: ad.slotKey,
    kind,
    path: window.location.pathname,
    device: window.matchMedia("(max-width: 640px)").matches ? "mobile" : "desktop",
  });
  if (navigator.sendBeacon) {
    const sent = navigator.sendBeacon(
      "/api/platform-ads/event",
      new Blob([payload], { type: "application/json" }),
    );
    if (sent) return;
  }
  try {
    const response = await fetch("/api/platform-ads/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    });
    if (!response.ok) throw new Error(`Ad event request failed (${response.status}).`);
  } catch (error) {
    console.error("[platform-ads] event request failed", { kind, slotKey: ad.slotKey, error });
  }
}
