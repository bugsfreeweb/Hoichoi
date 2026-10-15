"use client";

import { motion, useInView, useScroll, useSpring, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { bn } from "@/lib/format";

/* ───────────────────────── scroll reveal ───────────────────────── */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 26,
  once = true,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
  as?: "div" | "section" | "li" | "article" | "header" | "footer";
}) {
  const M = motion[as] as typeof motion.div;
  return (
    <M
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </M>
  );
}

/* ───────────────────────── stagger group ───────────────────────── */
export function Stagger({
  children,
  className,
  stagger = 0.07,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  y = 22,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y },
        show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
      }}
    >
      {children}
    </motion.div>
  );
}

/* ───────────────────────── count-up number ───────────────────────── */
export function CountUp({
  value,
  className,
  bangla = true,
  duration = 1.6,
  decimals = 0,
  prefix = "",
  suffix = "",
}: {
  value: number;
  className?: string;
  bangla?: boolean;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);

  const formatted = display.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return (
    <span ref={ref} className={className}>
      {prefix}
      {bangla ? bn(formatted) : formatted}
      {suffix}
    </span>
  );
}

/* ───────────────────────── scramble / decode title ───────────────────────── */
const GLYPHS = "অআইঈউকখগঘচছজঝটঠডঢতথদধনপফবভমযরলশষসহ০১২৩৪৫৬৭৮৯#/*<>_";

export function Scramble({
  text,
  className,
  speed = 34,
}: {
  text: string;
  className?: string;
  speed?: number;
}) {
  const [out, setOut] = useState(text);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setOut(text);
      return;
    }
    let frame = 0;
    let timer: ReturnType<typeof setInterval> | undefined;
    const chars = [...text];
    timer = setInterval(() => {
      frame += 1;
      const revealed = Math.floor(frame / 2);
      setOut(
        chars
          .map((c, i) => {
            if (c === " ") return " ";
            if (i < revealed) return c;
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          })
          .join(""),
      );
      if (revealed > chars.length && timer) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [inView, text, speed]);

  return (
    <span ref={ref} className={className}>
      {out}
    </span>
  );
}

/* ───────────────────────── typewriter ───────────────────────── */
export function TypeWriter({
  lines,
  className,
  charMs = 26,
}: {
  lines: string[];
  className?: string;
  charMs?: number;
}) {
  const [idx, setIdx] = useState(0);
  const [len, setLen] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setIdx(lines.length - 1);
      setLen(lines[lines.length - 1].length);
      setDone(true);
      return;
    }
    if (done) return;
    const current = lines[idx] ?? "";
    if (len < current.length) {
      const t = setTimeout(() => setLen((l) => l + 1), charMs);
      return () => clearTimeout(t);
    }
    if (idx < lines.length - 1) {
      const t = setTimeout(() => {
        setIdx((i) => i + 1);
        setLen(0);
      }, 420);
      return () => clearTimeout(t);
    }
    setDone(true);
  }, [len, idx, done, lines, charMs]);

  return (
    <span className={className}>
      {(lines[idx] ?? "").slice(0, len)}
      <span className="caret">▊</span>
    </span>
  );
}

/* ───────────────────────── mouse spotlight card ───────────────────────── */
export function Spotlight({
  children,
  className,
  radius = 340,
}: {
  children: ReactNode;
  className?: string;
  radius?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(-9999);
  const y = useMotionValue(-9999);
  const bg = useTransform(
    [x, y],
    ([lx, ly]) =>
      `radial-gradient(${radius}px circle at ${lx}px ${ly}px, rgba(255,255,255,0.10), transparent 65%)`,
  );

  return (
    <div
      ref={ref}
      className={clsx("relative", className)}
      onMouseMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        x.set(e.clientX - r.left);
        y.set(e.clientY - r.top);
      }}
      onMouseLeave={() => {
        x.set(-9999);
        y.set(-9999);
      }}
    >
      <motion.div aria-hidden className="pointer-events-none absolute inset-0 z-0" style={{ background: bg }} />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/* ───────────────────────── page scroll progress ───────────────────────── */
export function ScrollProgress({ className }: { className?: string }) {
  const { scrollYProgress } = useScroll();
  const w = useSpring(scrollYProgress, { stiffness: 140, damping: 26, mass: 0.3 });
  return (
    <motion.div
      aria-hidden
      className={clsx("fixed left-0 top-0 z-[70] h-[2px] origin-left", className)}
      style={{ scaleX: w, width: "100%", background: "linear-gradient(90deg,#f5a524,var(--accent),#a78bfa)" }}
    />
  );
}

/* ───────────────────────── marquee ───────────────────────── */
export function Marquee({
  children,
  className,
  speed = "normal",
  reverse = false,
  pauseOnHover = true,
}: {
  children: ReactNode;
  className?: string;
  speed?: "slow" | "normal" | "fast";
  reverse?: boolean;
  pauseOnHover?: boolean;
}) {
  const anim =
    speed === "fast" ? "animate-marquee-fast" : speed === "slow" ? "animate-marquee-rev" : "animate-marquee";
  return (
    <div className={clsx("relative flex overflow-hidden", className)}>
      {/* single animated track holding two identical copies: -50% === exactly one copy */}
      <div
        className={clsx(
          "flex w-max shrink-0 will-change-transform",
          anim,
          reverse && "flex-row-reverse",
          pauseOnHover && "hover:[animation-play-state:paused]",
        )}
      >
        <div className={clsx("flex w-max shrink-0", reverse && "flex-row-reverse")}>{children}</div>
        <div aria-hidden className={clsx("flex w-max shrink-0", reverse && "flex-row-reverse")}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── compare slider (raw vs rewritten) ───────────────────────── */
export function CompareSlider({
  left,
  right,
  leftLabel,
  rightLabel,
  className,
}: {
  left: ReactNode;
  right: ReactNode;
  leftLabel: string;
  rightLabel: string;
  className?: string;
}) {
  const [pos, setPos] = useState(52);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const update = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setPos(Math.max(4, Math.min(96, ((clientX - r.left) / r.width) * 100)));
  };

  useEffect(() => {
    const move = (e: MouseEvent) => dragging.current && update(e.clientX);
    const touch = (e: TouchEvent) => dragging.current && update(e.touches[0].clientX);
    const up = () => (dragging.current = false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", touch);
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", touch);
      window.removeEventListener("touchend", up);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={clsx("relative select-none overflow-hidden rounded-2xl border hairline", className)}
      onMouseDown={(e) => {
        dragging.current = true;
        update(e.clientX);
      }}
      onTouchStart={(e) => {
        dragging.current = true;
        update(e.touches[0].clientX);
      }}
    >
      <div className="min-h-[280px]">{right}</div>
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      >
        <div className="min-h-[280px]">{left}</div>
      </div>
      <div
        className="absolute inset-y-0 z-20 w-[2px] cursor-ew-resize"
        style={{ left: `${pos}%`, background: "var(--accent)", boxShadow: "0 0 22px var(--accent)" }}
      >
        <div className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border hairline bg-ink-900 text-mist-100 glow-accent">
          <span className="mono-label text-[9px]">⟷</span>
        </div>
      </div>
      <span className="mono-label absolute left-4 top-4 z-10 rounded-full bg-ink-950/80 px-3 py-1 text-mist-300 backdrop-blur">
        {leftLabel}
      </span>
      <span className="mono-label absolute right-4 top-4 z-10 rounded-full bg-ink-950/80 px-3 py-1 text-mist-300 backdrop-blur">
        {rightLabel}
      </span>
    </div>
  );
}

/* ───────────────────────── live clock ───────────────────────── */
export function LiveClock({ className }: { className?: string }) {
  const [now, setNow] = useState<string>("—");
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      let h = d.getHours();
      const suffix = h < 12 ? "AM" : "PM";
      h = h % 12 || 12;
      setNow(`${bn(h)}:${bn(String(d.getMinutes()).padStart(2, "0"))}:${bn(String(d.getSeconds()).padStart(2, "0"))} ${suffix}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  return <span className={clsx("tabular-nums", className)}>{now}</span>;
}

/* ───────────────────────── motion toggle applier ───────────────────────── */
export function MotionFlag({ enabled, accent }: { enabled: boolean; accent: string }) {
  useEffect(() => {
    document.documentElement.dataset.motion = enabled ? "on" : "off";
    document.documentElement.style.setProperty("--accent", accent);
    document.documentElement.style.setProperty(
      "--accent-soft",
      `${accent}29`,
    );
  }, [enabled, accent]);
  return null;
}

/* ───────────────────────── magnetic button ───────────────────────── */
export function Magnetic({
  children,
  className,
  strength = 0.28,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18 });
  const sy = useSpring(y, { stiffness: 220, damping: 18 });

  return (
    <motion.span
      ref={ref}
      className={clsx("inline-block", className)}
      style={{ x: sx, y: sy }}
      onMouseMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.span>
  );
}
