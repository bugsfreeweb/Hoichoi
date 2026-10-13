"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { playToggle, isSoundEnabled, toggleSound } from "@/lib/mv/sound";

function applyTheme(theme: "dark" | "light") {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  try {
    window.localStorage.setItem("hoichoi-theme", theme);
  } catch {
    // Storage may be disabled
  }
  document.cookie = `hoichoi-theme=${theme}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export default function ThemeToggle({
  className,
  showSoundToggle = false,
}: {
  className?: string;
  showSoundToggle?: boolean;
}) {
  const [light, setLight] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    const current = document.documentElement.dataset.theme === "light";
    setLight(current);
    setSoundOn(isSoundEnabled());

    const onStorage = (event: StorageEvent) => {
      if (event.key === "hoichoi-theme" && event.newValue) {
        const isLight = event.newValue === "light";
        document.documentElement.dataset.theme = isLight ? "light" : "dark";
        document.documentElement.style.colorScheme = isLight ? "light" : "dark";
        setLight(isLight);
      }
      if (event.key === "hoichoi-sound") {
        setSoundOn(isSoundEnabled());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const handleToggle = () => {
    const next = light ? "dark" : "light";
    playToggle(next === "light");
    setLight(next === "light");
    applyTheme(next);
  };

  const handleSoundToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = toggleSound();
    setSoundOn(next);
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      {/* 3D Realistic Theme Switch */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label={light ? "অন্ধকার থিমে পরিবর্তন" : "আলো থিমে পরিবর্তন"}
        title={light ? "অন্ধকার মোড সক্রিয় করুন" : "আলো মোড সক্রিয় করুন"}
        className={clsx(
          "relative flex items-center justify-between rounded-full border border-white/12 p-1 transition-all duration-300 shadow-md",
          "w-14 h-8 bg-ink-900/90 hover:border-white/30 hover:scale-105 active:scale-95",
          className
        )}
        style={{
          boxShadow: light
            ? "inset 0 2px 4px rgba(0,0,0,0.1), 0 0 12px rgba(245, 165, 36, 0.25)"
            : "inset 0 2px 6px rgba(0,0,0,0.8), 0 0 12px rgba(86, 200, 255, 0.15)",
        }}
      >
        {/* Sun Icon Track */}
        <span
          className={clsx(
            "grid h-5 w-5 place-items-center transition-opacity duration-300",
            light ? "opacity-100 text-gold-400" : "opacity-30 text-mist-400"
          )}
        >
          <Sun className="h-3.5 w-3.5" />
        </span>

        {/* Moon Icon Track */}
        <span
          className={clsx(
            "grid h-5 w-5 place-items-center transition-opacity duration-300",
            !light ? "opacity-100 text-azure-400" : "opacity-30 text-mist-400"
          )}
        >
          <Moon className="h-3.5 w-3.5" />
        </span>

        {/* Mechanical Sliding Thumb */}
        <motion.span
          className="absolute left-1 top-1 grid h-6 w-6 place-items-center rounded-full shadow-lg"
          initial={false}
          animate={{
            x: light ? 0 : 24,
            rotate: light ? 0 : 180,
            background: light
              ? "linear-gradient(135deg, #ffc94d, #f5a524)"
              : "linear-gradient(135deg, #1e293b, #0f172a)",
          }}
          transition={{ type: "spring", stiffness: 500, damping: 28 }}
        >
          <AnimatePresence mode="wait">
            {light ? (
              <motion.span
                key="sun"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-ink-950 font-bold"
              >
                <Sun className="h-3.5 w-3.5 stroke-[2.5]" />
              </motion.span>
            ) : (
              <motion.span
                key="moon"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-azure-400"
              >
                <Moon className="h-3.5 w-3.5 stroke-[2.5]" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.span>
      </button>

      {/* Optional Sound Mute / Unmute Button */}
      {showSoundToggle && (
        <button
          type="button"
          onClick={handleSoundToggle}
          aria-label={soundOn ? "সাউন্ড নিঃশব্দ করুন" : "সাউন্ড চালু করুন"}
          title={soundOn ? "সাউন্ড অন (ক্লিক করে মিউট করুন)" : "সাউন্ড মিউট (ক্লিক করে অন করুন)"}
          className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-ink-900/80 text-mist-300 transition-all hover:border-white/25 hover:text-mist-100"
        >
          {soundOn ? (
            <Volume2 className="h-3.5 w-3.5 text-mint-400" />
          ) : (
            <VolumeX className="h-3.5 w-3.5 text-mist-400" />
          )}
        </button>
      )}
    </div>
  );
}
