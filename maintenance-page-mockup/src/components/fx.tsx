"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/** Deterministic PRNG so server markup and client hydration always match. */
export function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function useDots(count: number, seed: number) {
  return useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: r() * 100,
      top: r() * 100,
      size: 1 + r() * 3.2,
      delay: r() * 8,
      dur: 5 + r() * 9,
      drift: (r() - 0.5) * 220,
      opacity: 0.25 + r() * 0.7,
    }));
  }, [count, seed]);
}

export function Starfield({
  count = 90,
  seed = 7,
  color = "#ffffff",
}: {
  count?: number;
  seed?: number;
  color?: string;
}) {
  const dots = useDots(count, seed);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {dots.map((d) => (
        <span
          key={d.id}
          className="absolute rounded-full animate-twinkle"
          style={{
            left: `${d.left}%`,
            top: `${d.top}%`,
            width: d.size,
            height: d.size,
            background: color,
            opacity: d.opacity,
            animationDelay: `${d.delay}s`,
            animationDuration: `${d.dur * 0.45}s`,
            boxShadow: d.size > 3 ? `0 0 ${d.size * 4}px ${color}` : undefined,
          }}
        />
      ))}
    </div>
  );
}

export function Dust({
  count = 26,
  seed = 21,
  color = "var(--mc-accent, #22d3ee)",
}: {
  count?: number;
  seed?: number;
  color?: string;
}) {
  const dots = useDots(count, seed);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {dots.map((d) => (
        <span
          key={d.id}
          className="absolute bottom-[-10%] rounded-full animate-rise"
          style={{
            left: `${d.left}%`,
            width: d.size + 1,
            height: d.size + 1,
            background: color,
            filter: "blur(0.4px)",
            opacity: 0,
            animationDelay: `${d.delay}s`,
            animationDuration: `${d.dur}s`,
            ["--dx" as string]: `${d.drift}px`,
            boxShadow: `0 0 12px ${color}`,
          }}
        />
      ))}
    </div>
  );
}

export function Meteors({ count = 6, seed = 5 }: { count?: number; seed?: number }) {
  const items = useDots(count, seed);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((d) => (
        <span
          key={d.id}
          className="absolute h-px w-40 animate-meteor bg-gradient-to-r from-white/90 to-transparent"
          style={{
            left: `${d.left}%`,
            top: `${d.top * 0.6}%`,
            animationDelay: `${d.delay * 1.4}s`,
            animationDuration: `${5 + d.dur * 0.6}s`,
          }}
        />
      ))}
    </div>
  );
}

export function AuroraBlobs({
  colors = ["#6d5efc", "#22d3ee", "#a855f7"],
  opacity = 0.55,
}: {
  colors?: string[];
  opacity?: number;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ opacity }}>
      {colors.map((c, i) => (
        <span
          key={c + i}
          className="absolute animate-blob blur-[70px]"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${c}, transparent 68%)`,
            width: `${38 + i * 12}%`,
            height: `${42 + i * 10}%`,
            left: `${[4, 52, 24][i % 3]}%`,
            top: `${[-8, 34, 58][i % 3]}%`,
            animationDelay: `${i * -5}s`,
            animationDuration: `${16 + i * 5}s`,
          }}
        />
      ))}
    </div>
  );
}

export function Nebula({ colors = ["#6d5efc", "#22d3ee"] }: { colors?: string[] }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        className="absolute inset-0 animate-gradient opacity-90"
        style={{
          background: `radial-gradient(60% 55% at 18% 22%, ${colors[0]}55, transparent 65%),
            radial-gradient(50% 50% at 82% 18%, ${colors[1] ?? colors[0]}44, transparent 62%),
            radial-gradient(70% 60% at 60% 92%, ${colors[0]}33, transparent 68%)`,
          backgroundSize: "180% 180%",
        }}
      />
    </div>
  );
}

const GLYPHS = "アイウエオカキクケサシスセソ01<>[]{}/\\|=+*#$%&@ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** CSS-driven matrix / glyph rain (no canvas, scales inside previews). */
export function MatrixRain({
  columns = 26,
  seed = 11,
  color = "#22c55e",
}: {
  columns?: number;
  seed?: number;
  color?: string;
}) {
  const cols = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: columns }, (_, i) => ({
      id: i,
      left: (i / columns) * 100 + (r() - 0.5) * 1.6,
      dur: 5 + r() * 8,
      delay: -r() * 12,
      opacity: 0.25 + r() * 0.6,
      text: Array.from({ length: 26 }, () => GLYPHS[Math.floor(r() * GLYPHS.length)]).join("\n"),
    }));
  }, [columns, seed]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {cols.map((c) => (
        <span
          key={c.id}
          className="absolute top-[-60%] whitespace-pre font-mono text-[13px] leading-[1.35] animate-rise"
          style={{
            left: `${c.left}%`,
            color,
            opacity: c.opacity,
            textShadow: `0 0 8px ${color}`,
            animationDelay: `${c.delay}s`,
            animationDuration: `${c.dur}s`,
            ["--dx" as string]: "0px",
          }}
        >
          {c.text}
        </span>
      ))}
    </div>
  );
}

/** Cursor-following spotlight that writes --mx/--my onto its parent stage. */
export function Spotlight({ color }: { color?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const parent = el.parentElement;
    const move = (e: PointerEvent) => {
      if (!parent) return;
      const r = parent.getBoundingClientRect();
      parent.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
      parent.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, []);
  return (
    <div
      ref={ref}
      className="mc-spotlight pointer-events-none absolute inset-0 z-[4] transition-opacity duration-500"
      style={color ? ({ ["--mc-accent" as string]: color } as React.CSSProperties) : undefined}
    />
  );
}

/** Pointer-tracked 3D tilt wrapper. */
export function Tilt({
  children,
  max = 9,
  className = "",
  glow = true,
}: {
  children: ReactNode;
  max?: number;
  className?: string;
  glow?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState({ rx: 0, ry: 0, mx: 50, my: 50 });

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    setT({ rx: (0.5 - py) * max * 2, ry: (px - 0.5) * max * 2, mx: px * 100, my: py * 100 });
  };

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={() => setT({ rx: 0, ry: 0, mx: 50, my: 50 })}
      className={className}
      style={{
        transform: `perspective(1100px) rotateX(${t.rx}deg) rotateY(${t.ry}deg)`,
        transition: "transform 260ms cubic-bezier(0.2,0.8,0.2,1)",
        transformStyle: "preserve-3d",
        ["--mx" as string]: `${t.mx}%`,
        ["--my" as string]: `${t.my}%`,
      }}
    >
      {glow && (
        <span
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-70"
          style={{
            background: `radial-gradient(320px circle at ${t.mx}% ${t.my}%, rgba(255,255,255,0.16), transparent 65%)`,
          }}
        />
      )}
      {children}
    </div>
  );
}

/** Mouse-driven parallax layers (used by the orbit theme). */
export function useParallax() {
  const [p, setP] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const move = (e: PointerEvent) => {
      setP({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      });
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, []);
  return p;
}

/** Text scramble / decode effect. */
export function Scramble({
  text,
  className = "",
  speed = 34,
}: {
  text: string;
  className?: string;
  speed?: number;
}) {
  const [out, setOut] = useState(text);
  useEffect(() => {
    let frame = 0;
    const total = text.length * 3 + 12;
    const id = setInterval(() => {
      frame++;
      const revealed = Math.floor((frame / total) * text.length * 1.35);
      setOut(
        text
          .split("")
          .map((ch, i) =>
            i < revealed || ch === " "
              ? ch
              : GLYPHS[Math.floor(Math.random() * GLYPHS.length)].toLowerCase(),
          )
          .join(""),
      );
      if (frame >= total) {
        setOut(text);
        clearInterval(id);
      }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return <span className={className}>{out}</span>;
}

/** Typewriter that types a list of lines sequentially. */
export function Typewriter({
  lines,
  className = "",
  caret = "▋",
  speed = 22,
  loop = false,
}: {
  lines: string[];
  className?: string;
  caret?: string;
  speed?: number;
  loop?: boolean;
}) {
  const [rendered, setRendered] = useState<string[]>([]);
  const [current, setCurrent] = useState("");

  useEffect(() => {
    let line = 0;
    let char = 0;
    let done = false;
    const doneLines: string[] = [];
    const tick = () => {
      if (done) return;
      if (line >= lines.length) {
        if (loop) {
          doneLines.length = 0;
          line = 0;
          char = 0;
          setRendered([]);
          setCurrent("");
        } else {
          done = true;
          return;
        }
      }
      const full = lines[line];
      char++;
      setCurrent(full.slice(0, char));
      if (char >= full.length) {
        doneLines.push(full);
        setRendered([...doneLines]);
        setCurrent("");
        line++;
        char = 0;
      }
    };
    const id = setInterval(tick, speed);
    return () => {
      done = true;
      clearInterval(id);
    };
  }, [lines, speed, loop]);

  return (
    <span className={className}>
      {rendered.map((l, i) => (
        <span key={i} className="block">
          {l || "\u00a0"}
        </span>
      ))}
      <span className="block">
        {current}
        <span className="animate-blink">{caret}</span>
      </span>
    </span>
  );
}

/** Staggered entrance helper. */
export function Reveal({
  children,
  delay = 0,
  y = 18,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        animation: `pop 0.75s cubic-bezier(0.2,0.9,0.25,1) ${delay}ms both`,
        ["--pop-y" as string]: `${y}px`,
      }}
    >
      {children}
    </div>
  );
}
