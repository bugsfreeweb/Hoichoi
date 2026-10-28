"use client";

import { useEffect, useRef, useState } from "react";
import { Play, RotateCw, Tv, Radio } from "lucide-react";
import { YoutubeIcon as Youtube } from "./BrandIcons";
import type { StreamKind } from "@/lib/live-types";
import { clsx, iframeEmbed, streamLabel, youtubeEmbed, youtubeThumb } from "@/lib/live-format";

type Props = {
  type: StreamKind;
  url: string;
  title: string;
  poster?: string;
  autoplay?: boolean;
  live?: boolean;
  compact?: boolean;
  onPlay?: () => void;
  onActiveChange?: (active: boolean) => void;
  className?: string;
};

/**
 * One player for every source a newsroom throws at it:
 * YouTube (video or channel live), TV/HLS (.m3u8), Facebook/any iframe, MP4.
 * Click-to-load facade keeps the home page light.
 */
export default function VideoPlayer({
  type,
  url,
  title,
  poster,
  autoplay = false,
  live = true,
  compact = false,
  onPlay,
  onActiveChange,
  className,
}: Props) {
  const [active, setActive] = useState(autoplay);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setActive(autoplay);
    setError(null);
  }, [url, type, autoplay]);

  useEffect(() => {
    onActiveChange?.(active);
  }, [active, onActiveChange]);

  // HLS / MP4 wiring
  useEffect(() => {
    if (!active || (type !== "hls" && type !== "mp4")) return;
    const video = videoRef.current;
    if (!video) return;
    let destroyed = false;
    let hls: { destroy: () => void } | null = null;

    if (type === "mp4" || video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.play().catch(() => undefined);
    } else {
      import("hls.js")
        .then(({ default: Hls }) => {
          if (destroyed) return;
          if (!Hls.isSupported()) {
            setError("এই ব্রাউজারে টিভি স্ট্রিম চালানো যাচ্ছে না");
            return;
          }
          const instance = new Hls({ lowLatencyMode: true, backBufferLength: 30 });
          hls = instance;
          instance.loadSource(url);
          instance.attachMedia(video);
          instance.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(() => undefined);
          });
          instance.on(Hls.Events.ERROR, (_evt, data) => {
            if (data.fatal) setError("স্ট্রিম সংযোগ বিচ্ছিন্ন হয়েছে");
          });
        })
        .catch(() => setError("প্লেয়ার লোড করা যায়নি"));
    }
    return () => {
      destroyed = true;
      hls?.destroy();
    };
  }, [active, type, url, attempt]);

  const start = () => {
    setActive(true);
    setError(null);
    onPlay?.();
  };

  const thumb = poster || (type === "youtube" ? youtubeThumb(url) : null) || "";
  const SourceIcon = type === "youtube" ? Youtube : type === "hls" ? Tv : Radio;

  if (!url) {
    return (
      <div className={clsx("relative flex h-full w-full items-center justify-center bg-[#0a0c10] text-white/60", className)}>
        <p className="font-mono-x text-[11px] tracking-[0.2em] uppercase">স্ট্রিম লিংক যোগ করা হয়নি</p>
      </div>
    );
  }

  if (!active) {
    return (
      <button
        type="button"
        onClick={start}
        className={clsx("group relative block h-full w-full overflow-hidden bg-[#0a0c10] text-left", className)}
        aria-label={`${title} — ভিডিও চালু করুন`}
      >
        {thumb ? (
          <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80 transition duration-700 group-hover:scale-[1.03] group-hover:opacity-90" />
        ) : (
          <div className="surface-night absolute inset-0" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c10] via-[#0a0c10]/35 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={clsx(
              "flex items-center justify-center bg-[#d2202c] text-white shadow-[6px_6px_0_0_rgba(0,0,0,0.6)] transition-transform duration-300 group-hover:scale-105",
              compact ? "h-11 w-11" : "h-16 w-16 md:h-20 md:w-20",
            )}
          >
            <Play size={compact ? 18 : 30} fill="currentColor" className="ml-1" />
          </span>
        </div>
        {!compact && (
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 md:p-5">
            <p className="max-w-[75%] font-serif-bn text-[14px] leading-snug font-bold text-white/90 md:text-[16px]">
              {live ? "ট্যাপ করে সরাসরি দেখুন" : "রিপ্লে দেখুন"}
            </p>
            <span className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 font-mono-x text-[9.5px] tracking-[0.16em] text-white uppercase backdrop-blur-sm">
              <SourceIcon size={11} /> {streamLabel(type)}
            </span>
          </div>
        )}
      </button>
    );
  }

  if (error) {
    return (
      <div className={clsx("relative flex h-full w-full flex-col items-center justify-center gap-3 bg-[#0a0c10] text-center text-white", className)}>
        <p className="font-serif-bn text-[15px] font-bold">{error}</p>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setAttempt((a) => a + 1);
          }}
          className="flex items-center gap-2 border border-white/25 px-4 py-2 text-[12.5px] font-semibold hover:bg-white/10"
        >
          <RotateCw size={13} /> আবার চেষ্টা করুন
        </button>
      </div>
    );
  }

  if (type === "youtube") {
    const src = youtubeEmbed(url, true);
    if (!src) return <div className={clsx("flex h-full w-full items-center justify-center bg-black text-white/70", className)}>ইউটিউব লিংকটি সঠিক নয়</div>;
    return (
      <iframe
        key={src}
        src={src}
        title={title}
        className={clsx("h-full w-full border-0 bg-black", className)}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    );
  }

  if (type === "iframe") {
    return (
      <iframe
        key={url}
        src={iframeEmbed(url)}
        title={title}
        className={clsx("h-full w-full border-0 bg-black", className)}
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        allowFullScreen
      />
    );
  }

  return (
    <video
      key={`${url}-${attempt}`}
      ref={videoRef}
      className={clsx("h-full w-full bg-black object-contain", className)}
      controls
      muted
      autoPlay
      playsInline
      preload="metadata"
      loop={url === "/media/live-preview.mp4"}
      onError={() => setError("ভিডিও লিংকটি খোলা যাচ্ছে না — মূল লিংক পরীক্ষা করুন বা ডেমো ভিডিও বেছে নিন")}
      poster={thumb || undefined}
    />
  );
}
