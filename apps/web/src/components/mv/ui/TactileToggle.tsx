"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import { playToggle } from "@/lib/mv/sound";

interface TactileToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  className?: string;
  activeColor?: string;
}

export default function TactileToggle({
  checked,
  onChange,
  label,
  size = "md",
  disabled = false,
  className,
  activeColor = "var(--accent)",
}: TactileToggleProps) {
  const handleToggle = () => {
    if (disabled) return;
    const next = !checked;
    playToggle(next);
    onChange(next);
  };

  const dimensions =
    size === "sm"
      ? { track: "w-10 h-5 p-0.5", thumb: "w-4 h-4", led: "w-1 h-1", offset: 20 }
      : size === "lg"
      ? { track: "w-16 h-8 p-1", thumb: "w-6 h-6", led: "w-2 h-2", offset: 32 }
      : { track: "w-12 h-6 p-0.5", thumb: "w-5 h-5", led: "w-1.5 h-1.5", offset: 24 };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={handleToggle}
      className={clsx(
        "group relative inline-flex items-center gap-2.5 rounded-full outline-none select-none transition-all",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {/* 3D Realistic Recessed Track */}
      <span
        className={clsx(
          "relative flex items-center rounded-full border transition-all duration-300 shadow-inner",
          dimensions.track,
          checked
            ? "border-white/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]"
            : "border-white/10 bg-ink-950/80 shadow-[inset_0_2px_6px_rgba(0,0,0,0.85)]"
        )}
        style={{
          background: checked
            ? `linear-gradient(180deg, color-mix(in srgb, ${activeColor} 65%, #05060a), color-mix(in srgb, ${activeColor} 30%, #000))`
            : undefined,
        }}
      >
        {/* Internal Glow Rail */}
        <span
          className={clsx(
            "absolute inset-x-1 top-1/2 -translate-y-1/2 h-[2px] rounded-full transition-opacity duration-300",
            checked ? "opacity-100" : "opacity-20 bg-white/20"
          )}
          style={{
            background: checked
              ? `linear-gradient(90deg, ${activeColor}, #ffffff)`
              : undefined,
            boxShadow: checked ? `0 0 8px ${activeColor}` : undefined,
          }}
        />

        {/* 3D Tactile Sliding Thumb */}
        <motion.span
          className={clsx(
            "relative z-10 flex items-center justify-center rounded-full transition-shadow duration-300",
            dimensions.thumb,
            checked
              ? "bg-gradient-to-b from-white via-mist-100 to-mist-300 text-ink-950 shadow-[0_2px_8px_rgba(0,0,0,0.5),0_0_12px_var(--accent)]"
              : "bg-gradient-to-b from-mist-200 via-mist-400 to-ink-700 text-mist-400 shadow-[0_2px_5px_rgba(0,0,0,0.7)]"
          )}
          initial={false}
          animate={{
            x: checked ? dimensions.offset : 0,
            scale: [1, 0.94, 1],
          }}
          transition={{
            type: "spring",
            stiffness: 600,
            damping: 32,
            mass: 0.6,
          }}
        >
          {/* Metallic Center Bevel */}
          <span className="h-2 w-2 rounded-full border border-black/20 bg-white/40 shadow-sm" />

          {/* Glowing LED Status Dot */}
          <span
            className={clsx(
              "absolute -top-0.5 rounded-full transition-all duration-300",
              dimensions.led,
              checked
                ? "bg-mint-400 shadow-[0_0_6px_#4ade80]"
                : "bg-rose-500/80 shadow-[0_0_4px_#f43f5e]"
            )}
          />
        </motion.span>
      </span>

      {label ? (
        <span className="text-[13px] font-medium text-mist-200 group-hover:text-mist-100 transition-colors">
          {label}
        </span>
      ) : null}
    </button>
  );
}
