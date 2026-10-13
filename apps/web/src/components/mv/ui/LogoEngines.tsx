"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import clsx from "clsx";

/**
 * হৈচৈ logo scenes.
 *
 * Bengali note: the word is never split per code point. Where a scene needs
 * per-slot motion it works on whole clusters ("হৈ" + "চৈ") so the matras stay
 * attached to their consonants at every frame.
 */

export interface EngineProps {
  px: number;
  size: number;
  animate: boolean;
  showMark: boolean;
  stacked: boolean;
  sub: ReactNode;
}

const WORD = "হৈচৈ";
const vars = (v: Record<string, string | number>) => v as unknown as CSSProperties;

/** Respect OS reduced-motion and the admin motion switch. Client-only, so SSR markup stays static. */
function useMotionOk(animate: boolean) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const off = document.documentElement.dataset.motion === "off";
    setOk(animate && !reduce && !off);
  }, [animate]);
  return ok;
}

/* ═══════════════════════ shared mark ═══════════════════════ */

export function Mark({
  size = 40,
  animate = true,
  rings = false,
}: {
  size?: number;
  animate?: boolean;
  rings?: boolean;
}) {
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      {rings && animate ? (
        <>
          <span aria-hidden className="lg-ring" />
          <span aria-hidden className="lg-ring" data-d="2" />
        </>
      ) : null}
      <span
        className="relative grid h-full w-full place-items-center overflow-hidden rounded-xl"
        style={{
          background: "linear-gradient(145deg, var(--accent), color-mix(in srgb, var(--accent) 50%, #f5a524))",
          boxShadow: "0 6px 18px -8px color-mix(in srgb, var(--accent) 70%, transparent)",
        }}
      >
        {animate ? (
          <span
            aria-hidden
            className="logo-breathe absolute inset-0"
            style={{ background: "radial-gradient(circle at 50% 50%, #fff, transparent 62%)" }}
          />
        ) : null}
        <svg viewBox="0 0 24 24" width={size * 0.54} height={size * 0.54} className="relative z-10" aria-hidden>
          <path d="M13.6 2.2 5.4 13.1h5.3l-1.1 8.7 8.2-10.9h-5.3l1.1-8.7Z" fill="#07090f" fillOpacity="0.92" />
          <path
            d="M13.6 2.2 5.4 13.1h5.3l-1.1 8.7 8.2-10.9h-5.3l1.1-8.7Z"
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.85"
            strokeWidth="1.1"
            strokeLinejoin="round"
            className={animate ? "logo-draw" : undefined}
          />
        </svg>
        {animate ? (
          <svg aria-hidden viewBox="0 0 40 40" className="logo-orbit absolute inset-0 h-full w-full">
            <circle cx="20" cy="4.5" r="1.6" fill="#07090f" fillOpacity="0.75" />
          </svg>
        ) : null}
        {animate ? (
          <span
            aria-hidden
            className="logo-sweep absolute inset-y-0 left-0 w-1/3"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.75), transparent)" }}
          />
        ) : null}
      </span>
    </span>
  );
}

/* ═══════════════════════ layout helper for lockup scenes ═══════════════════════ */

function Lockup({
  stacked,
  mark,
  children,
}: {
  stacked: boolean;
  mark: ReactNode;
  children: ReactNode;
}) {
  if (stacked) {
    return (
      <span className="inline-flex flex-col items-center gap-3 text-center">
        {mark}
        {children}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2.5">
      {mark}
      {children}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════
   1 · BROADCAST — control-room live feed
   RGB split + random glitch bursts + slice tear + scan beam
   + running timecode + buffer bar + pulsing rings
   ══════════════════════════════════════════════════════════ */

export function Broadcast({ px, size, animate, showMark, stacked, sub }: EngineProps) {
  const ok = useMotionOk(animate);
  const [burst, setBurst] = useState(false);
  const [jit, setJit] = useState({ gx: 3, gy: 1, sx: 6 });
  const [tc, setTc] = useState("00:00:00");

  useEffect(() => {
    if (!ok) return;
    let next: number | undefined;
    let off: number | undefined;
    const fire = () => {
      setJit({ gx: 2 + Math.random() * 4, gy: (Math.random() - 0.5) * 3, sx: 4 + Math.random() * 10 });
      setBurst(true);
      off = window.setTimeout(() => setBurst(false), 360 + Math.random() * 240);
      next = window.setTimeout(fire, 3200 + Math.random() * 3800);
    };
    next = window.setTimeout(fire, 1500);
    return () => {
      window.clearTimeout(next);
      window.clearTimeout(off);
    };
  }, [ok]);

  useEffect(() => {
    if (!ok) return;
    const start = Date.now();
    const pad = (n: number) => String(n).padStart(2, "0");
    const id = window.setInterval(() => {
      const s = Math.floor((Date.now() - start) / 1000);
      setTc(`${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`);
    }, 1000);
    return () => window.clearInterval(id);
  }, [ok]);

  const word = (
    <span
      className="lg-bc inline-block"
      data-burst={burst ? "1" : "0"}
      style={vars({ "--gx": `${jit.gx}px`, "--gy": `${jit.gy}px`, "--sx": `${jit.sx}px` })}
    >
      <span className="lg-bc-word" style={{ fontSize: px }}>
        {WORD}
        {ok ? (
          <>
            <span aria-hidden className="lg-bc-layer" data-ch="r">{WORD}</span>
            <span aria-hidden className="lg-bc-layer" data-ch="c">{WORD}</span>
            <span aria-hidden className="lg-bc-slice" data-s="a">{WORD}</span>
            <span aria-hidden className="lg-bc-slice" data-s="b">{WORD}</span>
            <span aria-hidden className="lg-bc-scan" />
          </>
        ) : null}
      </span>
      <span className="mt-1.5 flex items-center gap-2">
        <span className="lg-live">
          <i />
          LIVE
        </span>
        {sub}
        {ok ? <span className="mono-label ml-auto text-mist-400/80">{tc}</span> : null}
      </span>
      {ok ? (
        <span className="lg-bc-buffer mt-1.5 block" aria-hidden>
          <i />
        </span>
      ) : null}
    </span>
  );

  return (
    <Lockup stacked={stacked} mark={showMark ? <Mark size={size} animate={animate} rings /> : null}>
      {word}
    </Lockup>
  );
}

/* ══════════════════════════════════════════════════════════
   2 · SIGNAL — glass capsule with a live spectrum
   rAF-driven bars + flowing gradient word + travelling sine
   + specular sweep across the glass
   ══════════════════════════════════════════════════════════ */

const SPECTRUM = [0.5, 0.8, 0.62, 0.95, 0.4, 0.74, 0.55, 0.9, 0.46];

export function Signal({ px, size, animate, showMark, stacked, sub }: EngineProps) {
  const ok = useMotionOk(animate);
  const bars = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    if (!ok) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const s = (t - t0) / 1000;
      bars.current.forEach((el, i) => {
        if (!el) return;
        const v = 0.3 + 0.7 * Math.abs(Math.sin(s * 2.1 + i * 0.72) * Math.cos(s * 1.27 + i * 1.9));
        el.style.transform = `scaleY(${v.toFixed(3)})`;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ok]);

  const wave = ["M0 5 Q7.5 -2 15 5", ...Array.from({ length: 16 }, (_, i) => `T${30 + i * 15} 5`)].join(" ");

  return (
    <span className="lg-sg-pill inline-flex items-center gap-3">
      {showMark && !stacked ? <Mark size={size * 0.92} animate={animate} /> : null}
      <span className={clsx("flex flex-col", stacked && "items-center")}>
        {showMark && stacked ? <Mark size={size} animate={animate} /> : null}
        <span className={clsx("lg-sg-word", stacked && "mt-2")} style={{ fontSize: px, lineHeight: 1 }}>
          {WORD}
        </span>
        {ok ? (
          <span className="lg-sg-wavebox mt-1.5" aria-hidden>
            <svg width="240" height="10" viewBox="0 0 240 10" className="lg-sg-wave">
              <path d={wave} fill="none" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </span>
        ) : null}
        {sub ? <span className="mt-1">{sub}</span> : null}
      </span>
      <span className="flex items-end gap-[3px]" style={{ height: px * 0.95 }} aria-hidden>
        {SPECTRUM.map((h, i) => (
          <i
            key={i}
            ref={(el) => {
              bars.current[i] = el;
            }}
            className="lg-sg-bar"
            style={{ transform: `scaleY(${h})` }}
          />
        ))}
      </span>
    </span>
  );
}

/* ══════════════════════════════════════════════════════════
   3 · CUBE — 3D cube, orbit ring, flipping wordmark
   ══════════════════════════════════════════════════════════ */

const CUBE_FACES: { face: string; label: string; latin?: boolean }[] = [
  { face: "front", label: WORD },
  { face: "right", label: "FEED", latin: true },
  { face: "back", label: WORD },
  { face: "left", label: "VERIFY", latin: true },
  { face: "top", label: "◉", latin: true },
  { face: "bottom", label: "▮", latin: true },
];

export function CubeMark({ size = 40, animate = true }: { size?: number; animate?: boolean }) {
  const cs = Math.round(size * 1.05);
  return (
    <span className="lg-cube-scene relative inline-grid shrink-0 place-items-center" style={{ width: cs * 1.5, height: cs * 1.35 }}>
      {animate ? <span aria-hidden className="lg-cube-shadow" style={{ width: cs }} /> : null}
      {animate ? <span aria-hidden className="lg-cube-orbit" style={{ width: cs * 1.5, height: cs * 1.5 }} /> : null}
      <span
        className={clsx("lg-cube block", !animate && "[animation:none]")}
        style={vars({ width: cs, height: cs, "--cs": `${cs}px` })}
      >
        {CUBE_FACES.map((f) => (
          <span key={f.face} className="lg-cube-face" data-face={f.face}>
            <span className={f.latin ? "lg-cube-latin" : undefined}>{f.label}</span>
          </span>
        ))}
      </span>
    </span>
  );
}

export function Cube({ px, size, animate, showMark, stacked, sub }: EngineProps) {
  const reflect = px >= 36;
  const w = Math.round(px * 2.45);
  const h = Math.round(px * 1.12);
  return (
    <Lockup stacked={stacked} mark={showMark ? <CubeMark size={size} animate={animate} /> : null}>
      <span className={clsx("flex flex-col", stacked && "items-center")}>
        <span className="lg-flip-scene" style={{ width: w, height: h }}>
          <span className={clsx("lg-flip", !animate && "[animation:none]")}>
            <span className="lg-flip-face" style={{ fontSize: px }}>{WORD}</span>
            <span className="lg-flip-face lg-flip-back" style={{ fontSize: px * 0.62 }}>HOICHOI</span>
          </span>
        </span>
        {reflect ? (
          <span className="lg-flip-reflect" style={{ width: w, height: h * 0.55 }} aria-hidden>
            <span style={{ fontSize: px }}>{WORD}</span>
          </span>
        ) : null}
        {sub ? <span className="mt-1">{sub}</span> : null}
      </span>
    </Lockup>
  );
}

/* ══════════════════════════════════════════════════════════
   4 · DEPTH — letterpress with a cursor-driven light
   six extrusion layers + glare that follows the pointer +
   crop marks + ink rule + idle sway
   ══════════════════════════════════════════════════════════ */

export function Depth({ px, size, animate, showMark, stacked, sub }: EngineProps) {
  const ok = useMotionOk(animate);
  const ref = useRef<HTMLSpanElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0, mx: 50, my: 28, active: false });

  const move = (e: React.MouseEvent) => {
    if (!ok) return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top) / r.height;
    setTilt({
      x: (nx - 0.5) * 30,
      y: (0.5 - ny) * 22,
      mx: nx * 100,
      my: ny * 100,
      active: true,
    });
  };

  const layers = Array.from({ length: 6 }, (_, i) => i + 1);

  const word = (
    <span
      ref={ref}
      className="lg-dp relative inline-block"
      onMouseMove={move}
      onMouseLeave={() => setTilt((t) => ({ ...t, x: 0, y: 0, active: false }))}
      style={{ padding: `${px * 0.2}px ${px * 0.26}px` }}
    >
      {ok ? (
        <>
          <i aria-hidden className="lg-dp-crop" data-c="tl" />
          <i aria-hidden className="lg-dp-crop" data-c="tr" />
          <i aria-hidden className="lg-dp-crop" data-c="bl" />
          <i aria-hidden className="lg-dp-crop" data-c="br" />
        </>
      ) : null}
      <span className="lg-dp-scene">
        <span className={clsx("lg-dp-sway", ok && !tilt.active && "lg-dp-sway-on")}>
          <span
            className="lg-dp-body"
            style={{ transform: `rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)` }}
          >
            {ok
              ? layers.map((n) => (
                  <span
                    key={n}
                    aria-hidden
                    className="lg-dp-echo"
                    style={{
                      fontSize: px,
                      transform: `translate3d(${n * 0.9}px, ${n * 1.1}px, ${-n * 3}px)`,
                      opacity: 0.5 - n * 0.065,
                    }}
                  >
                    {WORD}
                  </span>
                ))
              : null}
            <span
              className="lg-dp-face"
              style={{
                fontSize: px,
                ["--mx" as string]: `${tilt.mx}%`,
                ["--my" as string]: `${tilt.my}%`,
              }}
            >
              {WORD}
            </span>
          </span>
        </span>
      </span>
      {ok ? <span aria-hidden className="lg-dp-rule" /> : null}
    </span>
  );

  return (
    <Lockup stacked={stacked} mark={showMark ? <Mark size={size} animate={animate} /> : null}>
      <span className={clsx("flex flex-col", stacked && "items-center")}>
        {word}
        {sub ? <span className="mt-1.5 px-1">{sub}</span> : null}
      </span>
    </Lockup>
  );
}

/* ══════════════════════════════════════════════════════════
   5 · DECODE — cluster-safe scramble, hex stream, verified seal
   ══════════════════════════════════════════════════════════ */

const POOL = ["হৈ", "চৈ", "কা", "মি", "নি", "তা", "রা", "সং", "বা", "দে", "ক্ষ", "ত্র", "জ্ঞ", "শ্র", "পো", "লী"];
const TARGET = ["হৈ", "চৈ"];
const HEX = Array.from({ length: 9 }, (_, i) =>
  Array.from({ length: 6 }, (_, j) => ((i * 53 + j * 97 + 11) % 256).toString(16).padStart(2, "0")).join(" "),
);

export function Decode({ px, size, animate, showMark, stacked, sub }: EngineProps) {
  const ok = useMotionOk(animate);
  const [cells, setCells] = useState<string[]>(TARGET);
  const [done, setDone] = useState(true);
  const timer = useRef<number | undefined>(undefined);

  const run = useCallback(() => {
    window.clearInterval(timer.current);
    setDone(false);
    let tick = 0;
    const last = 9 + (TARGET.length - 1) * 8;
    timer.current = window.setInterval(() => {
      tick += 1;
      setCells(TARGET.map((t, i) => (tick > 9 + i * 8 ? t : POOL[Math.floor(Math.random() * POOL.length)] ?? "")));
      if (tick > last) {
        window.clearInterval(timer.current);
        setCells(TARGET);
        setDone(true);
      }
    }, 58);
  }, []);

  useEffect(() => {
    if (!ok) return;
    const first = window.setTimeout(run, 420);
    const loop = window.setInterval(run, 13000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(loop);
      window.clearInterval(timer.current);
    };
  }, [ok, run]);

  const word = (
    <span className="lg-dc relative inline-flex flex-col" onMouseEnter={ok ? run : undefined}>
      <span className="relative inline-block px-3 py-1.5" aria-label={WORD}>
        {ok ? (
          <span aria-hidden className="lg-dc-hex">
            <span>{`${HEX.join("\n")}\n${HEX.join("\n")}`}</span>
          </span>
        ) : null}
        {ok ? (
          <svg aria-hidden className="lg-dc-br" viewBox="0 0 100 40" preserveAspectRatio="none">
            <path d="M2 12 V2 H14" pathLength="1" className="lg-draw" />
            <path d="M98 12 V2 H86" pathLength="1" className="lg-draw" style={{ animationDelay: "0.15s" }} />
            <path d="M2 28 V38 H14" pathLength="1" className="lg-draw" style={{ animationDelay: "0.3s" }} />
            <path d="M98 28 V38 H86" pathLength="1" className="lg-draw" style={{ animationDelay: "0.45s" }} />
          </svg>
        ) : null}
        <span
          aria-hidden
          className={clsx("lg-dc-word relative", !done && "lg-dc-busy")}
          style={{ fontSize: px, lineHeight: 1 }}
        >
          <span>{cells[0]}</span>
          <span>{cells[1]}</span>
        </span>
      </span>
      <span className="mt-1 flex items-center justify-center gap-2">
        {ok ? (
          <span className={clsx("lg-dc-seal", done && "lg-dc-seal-ok")}>
            {done ? "✓ যাচাইকৃত" : "ডিকোডিং…"}
          </span>
        ) : null}
        {sub}
      </span>
    </span>
  );

  return (
    <Lockup stacked={stacked} mark={showMark ? <Mark size={size} animate={animate} /> : null}>
      {word}
    </Lockup>
  );
}

/* ══════════════════════════════════════════════════════════
   6 · SHINE — the restrained one
   ══════════════════════════════════════════════════════════ */

export function Shine({ px, size, animate, showMark, stacked, sub }: EngineProps) {
  return (
    <Lockup stacked={stacked} mark={showMark ? <Mark size={size} animate={animate} /> : null}>
      <span className={clsx("flex flex-col", stacked && "items-center")}>
        <span className={animate ? "logo-shine" : "text-mist-100"} style={{ fontSize: px, lineHeight: 1, fontFamily: "var(--font-display)", fontWeight: 700 }}>
          {WORD}
        </span>
        {sub ? <span className="mt-1.5">{sub}</span> : null}
      </span>
    </Lockup>
  );
}

/* ══════════════════════════════════════════════════════════
   PANEL SCENES — draw their own dark screen (theme-proof)
   ══════════════════════════════════════════════════════════ */

/* ───────── 7 · CRT — channel zapping television ───────── */

type CrtPhase = "on" | "static" | "bars" | "boot";

export function Crt({ px, animate }: EngineProps) {
  const ok = useMotionOk(animate);
  const [phase, setPhase] = useState<CrtPhase>("on");
  const [ch, setCh] = useState(1);
  const [tc, setTc] = useState(0);

  useEffect(() => {
    if (!ok) return;
    const timers: number[] = [];
    const schedule = (p: CrtPhase, at: number) => timers.push(window.setTimeout(() => setPhase(p), at));

    // power on once at mount, then zap through a channel change every so often
    setPhase("boot");
    schedule("on", 900);

    const zap = () => {
      const seq: [CrtPhase, number][] = [
        ["static", 300],
        ["bars", 1100],
        ["static", 260],
        ["boot", 900],
        ["on", 0],
      ];
      let acc = 0;
      setCh((c) => (c % 9) + 1);
      seq.forEach(([p, d]) => {
        schedule(p, acc);
        acc += d;
      });
      timers.push(window.setTimeout(zap, acc + 7500 + Math.random() * 3500));
    };
    timers.push(window.setTimeout(zap, 5200));

    const clock = window.setInterval(() => setTc((t) => t + 1), 1000);
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.clearInterval(clock);
    };
  }, [ok]);

  const w = Math.round(px * 3.3);
  const h = Math.round(px * 2.05);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <span className="lg-crt inline-flex flex-col">
      <span className="lg-crt-bezel">
        <span className="lg-crt-screen" style={{ width: w, height: h }}>
          {phase === "bars" ? (
            <span className="lg-crt-bars">
              <i />
            </span>
          ) : null}
          {phase === "static" ? <span className="lg-crt-static" /> : null}
          {phase === "on" || phase === "boot" ? (
            <span className={clsx("lg-crt-word", phase === "boot" && "lg-crt-poweron")} style={{ fontSize: px }}>
              {WORD}
            </span>
          ) : null}
          <span aria-hidden className="lg-crt-lines" />
          <span aria-hidden className="lg-crt-vignette" />
          <span aria-hidden className="lg-crt-glass" />
          {ok ? <span aria-hidden className="lg-crt-roll" /> : null}
          {ok ? (
            <>
              <span className="lg-crt-osd left-2 top-1.5">CH {pad(ch)}</span>
              <span className="lg-crt-osd right-2 top-1.5" style={{ color: "#ff6b6b" }}>● REC</span>
              <span className="lg-crt-osd bottom-1.5 left-2">00:{pad(Math.floor(tc / 60) % 60)}:{pad(tc % 60)}</span>
            </>
          ) : null}
        </span>
        <span className="lg-crt-ctrl" aria-hidden>
          <i className="lg-crt-knob" />
          <i className="lg-crt-knob" />
          <span className="lg-crt-grille">
            <i /><i /><i /><i />
          </span>
          <i className="lg-crt-led" />
        </span>
      </span>
    </span>
  );
}

/* ───────── 8 · NEON — brick wall sign ───────── */

export function Neon({ px, animate }: EngineProps) {
  const ok = useMotionOk(animate);
  const [cycle, setCycle] = useState(0);

  // power-cycle the sign every so often so the ignition sequence replays
  useEffect(() => {
    if (!ok) return;
    const id = window.setInterval(() => setCycle((c) => c + 1), 24000);
    return () => window.clearInterval(id);
  }, [ok]);

  const w = Math.round(px * 3.2);
  const h = Math.round(px * 1.75);

  return (
    <span className="lg-nn inline-flex flex-col items-center">
      <span className="lg-nn-plate" style={{ width: w + 28, height: h + 24 }}>
        <svg aria-hidden className="lg-nn-frame" viewBox={`0 0 ${w} ${h}`} width={w} height={h}>
          <rect
            x="2"
            y="2"
            width={w - 4}
            height={h - 4}
            rx={h * 0.22}
            fill="none"
            pathLength="1"
            className={clsx(ok && "lg-draw")}
            style={{ animationDuration: "2s" }}
          />
        </svg>
        <span className="lg-nn-text" style={{ fontSize: px }}>
          <span className="lg-nn-off">{WORD}</span>
          <span key={cycle} className={clsx("lg-nn-on", ok && "lg-nn-live")} aria-label={WORD}>
            {WORD}
          </span>
        </span>
        {ok ? (
          <span className="lg-nn-swing" aria-hidden>
            <i className="lg-nn-chain" />
            <i className="lg-nn-chain" />
            <span className="lg-nn-tag">যাচাইকৃত খবর</span>
          </span>
        ) : null}
      </span>
      <span className="lg-nn-reflect" style={{ width: w * 0.9, height: h * 0.5 }} aria-hidden>
        <span style={{ fontSize: px }}>{WORD}</span>
      </span>
    </span>
  );
}

/* ───────── 9 · HOLOGRAM — projector beam ───────── */

export function Hologram({ px, animate }: EngineProps) {
  const ok = useMotionOk(animate);
  const w = Math.round(px * 3.6);
  const h = Math.round(px * 2.5);
  return (
    <span className="lg-hl" style={{ width: w, height: h }}>
      <span aria-hidden className="lg-hl-beam" />
      <span className={clsx("lg-hl-float", !ok && "[animation:none]")}>
        <span className={clsx("lg-hl-word", !ok && "[animation:none]")} style={{ fontSize: px }}>
          {WORD}
        </span>
        {ok ? (
          <>
            <span aria-hidden className="lg-hl-slice" data-s="a" style={{ fontSize: px }}>{WORD}</span>
            <span aria-hidden className="lg-hl-slice" data-s="b" style={{ fontSize: px }}>{WORD}</span>
          </>
        ) : null}
        <span aria-hidden className="lg-hl-lines" />
      </span>
      <span aria-hidden className="lg-hl-base">
        <i />
        <i />
      </span>
      {ok ? <span aria-hidden className="lg-hl-sweep" /> : null}
    </span>
  );
}

/* ───────── 10 · BOOT — pipeline start-up log ───────── */

const BOOT_LINES = [
  "$ hoichoi boot --feed",
  "[ ok ] collector      playwright shot",
  "[ ok ] duplicate gate sha-256 × simhash",
  "[ ok ] fact-gate      threshold 0.90",
  "[ ok ] isr deploy     ~8s",
];
const BOOT_MAX = BOOT_LINES.length + 2;

export function Boot({ px, animate }: EngineProps) {
  const ok = useMotionOk(animate);
  const [n, setN] = useState(BOOT_MAX);

  useEffect(() => {
    if (!ok) return;
    const timers: number[] = [];
    const run = () => {
      setN(0);
      for (let i = 1; i <= BOOT_MAX; i += 1) {
        timers.push(window.setTimeout(() => setN(i), i * 420));
      }
      timers.push(window.setTimeout(run, BOOT_MAX * 420 + 9500));
    };
    timers.push(window.setTimeout(run, 300));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [ok]);

  const lines = Math.min(n, BOOT_LINES.length);
  const revealed = n >= BOOT_LINES.length + 1;
  const pct = Math.round((Math.min(n, BOOT_MAX) / BOOT_MAX) * 100);

  return (
    <span className="lg-bt inline-flex flex-col" style={{ minWidth: Math.round(px * 6.2) }}>
      <span className="lg-bt-head">
        <i />
        <i />
        <i />
        <span className="mono-label ml-2">hoichoi@newsroom</span>
        <span className="mono-label ml-auto">{pct}%</span>
      </span>
      <span className="lg-bt-body">
        <span className="lg-bt-log">
          {BOOT_LINES.slice(0, lines).map((l) => (
            <span key={l} className={l.startsWith("[") ? "lg-bt-ok" : undefined}>
              {l}
            </span>
          ))}
          {!revealed ? <span className="lg-bt-caret">▊</span> : null}
        </span>
        <span className="lg-bt-word" style={{ fontSize: px }} aria-label={WORD}>
          <span aria-hidden className="lg-bt-ghost">{WORD}</span>
          <span
            aria-hidden
            className="lg-bt-reveal"
            style={{ width: revealed ? "100%" : "0%" }}
          >
            {WORD}
          </span>
        </span>
      </span>
      <span className="lg-bt-bar">
        <i style={{ width: `${pct}%` }} />
      </span>
    </span>
  );
}

/* ───────── 11 · LED — dot-matrix on canvas ───────── */

export function Led({ px, animate }: EngineProps) {
  const ok = useMotionOk(animate);
  const ref = useRef<HTMLCanvasElement>(null);
  const W = Math.round(px * 3.5);
  const H = Math.round(px * 1.7);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pitch = Math.max(2.8, px / 12);
    const cols = Math.floor(W / pitch);
    const rows = Math.floor(H / pitch);
    const r = pitch * 0.36;
    let cells: { x: number; y: number; a: number }[] = [];
    let bg: HTMLCanvasElement | null = null;
    let raf = 0;
    let alive = true;

    const buildBackground = () => {
      const c = document.createElement("canvas");
      c.width = W * dpr;
      c.height = H * dpr;
      const g = c.getContext("2d");
      if (!g) return null;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = "rgba(255,255,255,0.07)";
      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
          g.beginPath();
          g.arc(x * pitch + pitch / 2, y * pitch + pitch / 2, r * 0.8, 0, Math.PI * 2);
          g.fill();
        }
      }
      return c;
    };

    // Sample a high-resolution render of the word down to LED cells, keeping coverage as brightness.
    const sample = () => {
      const s = 5;
      const off = document.createElement("canvas");
      off.width = cols * s;
      off.height = rows * s;
      const o = off.getContext("2d");
      if (!o) return;
      o.clearRect(0, 0, off.width, off.height);
      o.fillStyle = "#fff";
      o.textAlign = "center";
      o.textBaseline = "middle";
      o.font = `700 ${rows * s * 0.72}px "Tiro Bangla","Hind Siliguri","Noto Sans Bengali",serif`;
      o.fillText(WORD, off.width / 2, off.height * 0.54);
      const data = o.getImageData(0, 0, off.width, off.height).data;
      const out: { x: number; y: number; a: number }[] = [];
      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
          let sum = 0;
          for (let yy = 0; yy < s; yy += 1) {
            for (let xx = 0; xx < s; xx += 1) {
              sum += data[(((y * s + yy) * off.width) + (x * s + xx)) * 4 + 3] ?? 0;
            }
          }
          const cov = sum / (s * s * 255);
          if (cov > 0.32) out.push({ x, y, a: Math.min(1, cov * 1.25) });
        }
      }
      cells = out;
    };

    const accent = () => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#ff5c38";

    const draw = (t: number) => {
      if (!alive) return;
      ctx.clearRect(0, 0, W, H);
      if (bg) ctx.drawImage(bg, 0, 0, W, H);
      const col = accent();
      const bandX = ((t * 0.00045) % 1.5 - 0.25) * cols;
      const wave = t * 0.0032;
      for (const c of cells) {
        const px0 = c.x * pitch + pitch / 2;
        const py0 = c.y * pitch + pitch / 2;
        const swell = ok ? 0.62 + 0.38 * Math.sin(c.x * 0.3 - wave + c.y * 0.18) : 1;
        ctx.globalAlpha = Math.max(0.25, c.a * swell);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(px0, py0, r, 0, Math.PI * 2);
        ctx.fill();
        if (ok) {
          const d = (c.x - bandX) / (cols * 0.085);
          const glow = Math.exp(-d * d);
          if (glow > 0.05) {
            ctx.globalAlpha = glow * c.a;
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(px0, py0, r * 1.08, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.globalAlpha = 1;
      if (ok) raf = requestAnimationFrame(draw);
    };

    const start = () => {
      bg = buildBackground();
      sample();
      raf = requestAnimationFrame(draw);
    };

    // The word must be rendered with the real display face, so wait for it.
    const fonts = document.fonts;
    if (fonts?.load) {
      fonts
        .load('700 40px "Tiro Bangla"', WORD)
        .catch(() => undefined)
        .finally(() => alive && start());
    } else {
      start();
    }

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [ok, px, W, H]);

  return (
    <span className="lg-led inline-block">
      <span className="lg-led-panel">
        <canvas ref={ref} style={{ width: W, height: H, display: "block" }} aria-label={WORD} role="img" />
      </span>
    </span>
  );
}
