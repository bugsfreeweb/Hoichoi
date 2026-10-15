import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useInView } from "../lib/hooks";
import { cn } from "../utils/cn";

/** Types text out character-by-character (Bengali-safe, splits by code point). */
export function Typewriter({ text, speed = 30, className }: { text: string; speed?: number; className?: string }) {
  const chars = useMemo(() => [...text], [text]);
  const [n, setN] = useState(0);

  useEffect(() => {
    setN(0);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setN(i);
      if (i >= chars.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [chars, speed]);

  const done = n >= chars.length;
  return (
    <span className={className}>
      {chars.slice(0, n).join("")}
      <span
        className={cn("ml-0.5 inline-block w-[2px] align-middle bg-violet-brand", done && "blink")}
        style={{ height: "1em" }}
      >
        &nbsp;
      </span>
    </span>
  );
}

/** Mounts children only once scrolled into view (lazy charts + entrance). */
export function Reveal({ children, min = 260, className }: { children: ReactNode; min?: number; className?: string }) {
  const { ref, seen } = useInView<HTMLDivElement>(0.12);
  return (
    <div ref={ref} className={className} style={seen ? undefined : { minHeight: min }}>
      {seen ? children : null}
    </div>
  );
}

/** Drifting particle field with proximity links. */
export function Particles({ count = 70 }: { count?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const colors = ["245,165,36", "34,211,238", "168,85,247"];
    const pts = Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00025,
      vy: (Math.random() - 0.5) * 0.00025,
      r: 0.6 + Math.random() * 1.6,
      c: colors[Math.floor(Math.random() * colors.length)],
      a: 0.2 + Math.random() * 0.5,
    }));

    let w = 0;
    let h = 0;
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > 1) p.vx *= -1;
        if (p.y < 0 || p.y > 1) p.vy *= -1;
      }
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const ax = a.x * w;
        const ay = a.y * h;
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j];
          const dx = ax - b.x * w;
          const dy = ay - b.y * h;
          const d2 = dx * dx + dy * dy;
          if (d2 < 120 * 120) {
            ctx.strokeStyle = `rgba(255,255,255,${0.05 * (1 - d2 / 14400)})`;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(b.x * w, b.y * h);
            ctx.stroke();
          }
        }
      }
      for (const p of pts) {
        ctx.fillStyle = `rgba(${p.c},${p.a})`;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [count]);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" />;
}

/** Full-screen boot loader that fades out once `done` is true. */
export function BootLoader({ done }: { done: boolean }) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-[60] grid place-items-center bg-ink-950 transition-all duration-700",
        done ? "pointer-events-none scale-105 opacity-0" : "opacity-100",
      )}
    >
      <div className="text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-brand to-flame text-xl font-bold text-ink-950 shadow-[0_0_40px_rgba(245,165,36,0.5)]">
          হৈ
        </div>
        <div className="bn mt-4 text-sm text-white/70">কনসোল লোড হচ্ছে…</div>
        <div className="mx-auto mt-4 h-1 w-48 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full w-full origin-left bg-gradient-to-r from-amber-brand to-cyan-brand"
            style={{ animation: "loadBar 1.1s ease forwards" }}
          />
        </div>
      </div>
    </div>
  );
}
