"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  ChevronRight,
  Maximize2,
  Minimize2,
  Network,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import clsx from "clsx";
import { playClick, playNodePing } from "@/lib/sound";
import { bn } from "@/lib/format";

export interface GraphNode {
  id: string;
  label: string;
  type: "core" | "category" | "story" | "pipeline" | "source";
  category?: string;
  factScore?: number;
  slug?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  connections: string[];
  records?: number;
}

const INITIAL_NODES: Omit<GraphNode, "vx" | "vy">[] = [
  // Core
  {
    id: "core",
    label: "হৈচৈ কোর নিউজরুম",
    type: "core",
    x: 400,
    y: 280,
    radius: 22,
    color: "#ff5c38",
    connections: ["cat-viral", "cat-crime", "cat-child", "cat-fraud", "cat-disaster", "pipe-llm", "pipe-human"],
    records: 412,
  },

  // Categories
  {
    id: "cat-viral",
    label: "ভাইরাল ফ্যাক্ট-চেক",
    type: "category",
    x: 230,
    y: 160,
    radius: 16,
    color: "#ff8a5c",
    connections: ["core", "story-mrbeast", "source-wildheart"],
    records: 94,
  },
  {
    id: "cat-crime",
    label: "অপরাধ অনুসন্ধান",
    type: "category",
    x: 580,
    y: 150,
    radius: 16,
    color: "#f5a524",
    connections: ["core", "story-mirpur", "source-dhaka"],
    records: 86,
  },
  {
    id: "cat-child",
    label: "শিশু সুরক্ষা",
    type: "category",
    x: 210,
    y: 380,
    radius: 16,
    color: "#56c8ff",
    connections: ["core", "story-rangpur", "story-sylhet", "source-rangpur", "source-sylhet"],
    records: 73,
  },
  {
    id: "cat-fraud",
    label: "প্রতারণা চক্র",
    type: "category",
    x: 570,
    y: 400,
    radius: 15,
    color: "#4ade80",
    connections: ["core", "story-bogura"],
    records: 48,
  },
  {
    id: "cat-disaster",
    label: "দুর্ঘটনা ও দুর্যোগ",
    type: "category",
    x: 400,
    y: 460,
    radius: 15,
    color: "#fb7185",
    connections: ["core", "story-ctg"],
    records: 39,
  },

  // Pipeline Engines
  {
    id: "pipe-shot",
    label: "Playwright স্ক্রিনশট",
    type: "pipeline",
    x: 120,
    y: 280,
    radius: 13,
    color: "#a78bfa",
    connections: ["pipe-hash", "source-wildheart", "source-rangpur"],
    records: 386,
  },
  {
    id: "pipe-hash",
    label: "SimHash ডুপ্লিকেট গেট",
    type: "pipeline",
    x: 250,
    y: 280,
    radius: 13,
    color: "#a78bfa",
    connections: ["pipe-shot", "pipe-llm", "core"],
    records: 291,
  },
  {
    id: "pipe-llm",
    label: "LLM ফ্যাক্ট-গেট ০.৯০",
    type: "pipeline",
    x: 500,
    y: 280,
    radius: 14,
    color: "#a78bfa",
    connections: ["pipe-hash", "pipe-human", "core"],
    records: 184,
  },
  {
    id: "pipe-human",
    label: "মানব সম্পাদকীয় ডেস্ক",
    type: "pipeline",
    x: 650,
    y: 280,
    radius: 14,
    color: "#a78bfa",
    connections: ["pipe-llm", "core"],
    records: 122,
  },

  // Stories (Live News Nodes)
  {
    id: "story-mrbeast",
    label: "MrBeast ৪ মিলিয়ন পেসো জয়",
    type: "story",
    slug: "mrbeast-4-35e7b1",
    category: "ভাইরাল যাচাই",
    factScore: 92,
    x: 120,
    y: 100,
    radius: 14,
    color: "#ff5c38",
    connections: ["cat-viral", "source-wildheart"],
    records: 48210,
  },
  {
    id: "story-rangpur",
    label: "রংপুর নিখোঁজ শিশু উদ্ধার তৎপরতা",
    type: "story",
    slug: "missing-child-rangpur-8d2c41",
    category: "নিখোঁজ শিশু",
    factScore: 88,
    x: 110,
    y: 450,
    radius: 14,
    color: "#56c8ff",
    connections: ["cat-child", "source-rangpur"],
    records: 31204,
  },
  {
    id: "story-mirpur",
    label: "মিরপুর অপরাধ তদন্ত ও আটক",
    type: "story",
    slug: "affair-crime-dhaka-b71f09",
    category: "পরকীয়া অপরাধ",
    factScore: 84,
    x: 700,
    y: 110,
    radius: 13,
    color: "#f5a524",
    connections: ["cat-crime", "source-dhaka"],
    records: 27410,
  },
  {
    id: "story-sylhet",
    label: "সিলেট শিশু সুরক্ষা মামলা",
    type: "story",
    slug: "child-protection-sylhet-c40a17",
    category: "শিশু নির্যাতন",
    factScore: 90,
    x: 290,
    y: 470,
    radius: 13,
    color: "#56c8ff",
    connections: ["cat-child", "source-sylhet"],
    records: 41820,
  },
  {
    id: "story-bogura",
    label: "বগুড়া চাকরি কেলেঙ্কারি চক্র",
    type: "story",
    slug: "fraud-bogura-job-scam-5a77d2",
    category: "অর্থ প্রতারণা",
    factScore: 82,
    x: 690,
    y: 470,
    radius: 13,
    color: "#4ade80",
    connections: ["cat-fraud"],
    records: 14280,
  },
  {
    id: "story-ctg",
    label: "চট্টগ্রাম দুর্ঘটনা রিপোর্ট",
    type: "story",
    slug: "chittagong-road-accident-e91b33",
    category: "সড়ক দুর্ঘটনা",
    factScore: 79,
    x: 480,
    y: 530,
    radius: 12,
    color: "#fb7185",
    connections: ["cat-disaster"],
    records: 18640,
  },

  // Sources
  {
    id: "source-wildheart",
    label: "Wild Heart পেজ",
    type: "source",
    x: 280,
    y: 60,
    radius: 11,
    color: "#38bdf8",
    connections: ["story-mrbeast", "pipe-shot"],
  },
  {
    id: "source-rangpur",
    label: "রংপুর সিটি ওয়াচ",
    type: "source",
    x: 60,
    y: 350,
    radius: 11,
    color: "#38bdf8",
    connections: ["story-rangpur", "pipe-shot"],
  },
  {
    id: "source-dhaka",
    label: "ঢাকা ক্রাইম ফিড",
    type: "source",
    x: 700,
    y: 220,
    radius: 11,
    color: "#38bdf8",
    connections: ["story-mirpur"],
  },
  {
    id: "source-sylhet",
    label: "সিলেট ওয়াচডগ",
    type: "source",
    x: 200,
    y: 530,
    radius: 11,
    color: "#38bdf8",
    connections: ["story-sylhet"],
  },
];

const W = 800;
const H = 560;
type Filter = "all" | "story" | "pipeline" | "category";

const isVisible = (n: GraphNode, f: Filter) =>
  f === "all" ||
  (f === "story" && (n.type === "story" || n.type === "core" || n.type === "source")) ||
  (f === "pipeline" && (n.type === "pipeline" || n.type === "core")) ||
  (f === "category" && (n.type === "category" || n.type === "core"));

const fresh = (): GraphNode[] => INITIAL_NODES.map((n) => ({ ...n, vx: 0, vy: 0 }));

export default function ObsidianGraph({ height = 480 }: { height?: number }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // simulation state lives in refs: it changes every frame and must not re-render React
  const nodesRef = useRef<GraphNode[]>(fresh());
  const filterRef = useRef<Filter>("all");
  const pausedRef = useRef(false);
  const hoverRef = useRef<GraphNode | null>(null);
  const selRef = useRef<GraphNode | null>(null);
  const dragRef = useRef<GraphNode | null>(null);
  const viewRef = useRef({ s: 1, ox: 0, oy: 0, w: 800, h: 560 });

  // only what the surrounding UI shows is React state
  const [filter, setFilterState] = useState<Filter>("all");
  const [paused, setPausedState] = useState(false);
  const [hovered, setHovered] = useState<GraphNode | null>(null);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [full, setFull] = useState(false);
  const [counts, setCounts] = useState({ nodes: INITIAL_NODES.length, edges: 0 });

  const setFilter = (f: Filter) => {
    filterRef.current = f;
    setFilterState(f);
  };

  useEffect(() => {
    const c = nodesRef.current.filter((n) => isVisible(n, filter));
    const ids = new Set(c.map((n) => n.id));
    let edges = 0;
    c.forEach((n) => n.connections.forEach((t) => ids.has(t) && n.id < t && (edges += 1)));
    setCounts({ nodes: c.length, edges });
  }, [filter]);

  // size the canvas to its container (crisp on retina) and keep the logical 800x560 space centred
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const fit = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      const s = Math.min(w / W, h / H);
      viewRef.current = { s, ox: (w - W * s) / 2, oy: (h - H * s) / 2, w, h };
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [full, height]);

  // one animation loop for the lifetime of the component
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let raf = 0;
    let t = 0;

    const frame = () => {
      t += 1;
      const nodes = nodesRef.current;
      const f = filterRef.current;
      const vis = nodes.filter((n) => isVisible(n, f));
      const byId = new Map(vis.map((n) => [n.id, n]));
      const edges: [GraphNode, GraphNode][] = [];
      vis.forEach((n) => n.connections.forEach((id) => {
        const o = byId.get(id);
        if (o && n.id < o.id) edges.push([n, o]);
      }));

      // ── physics ──
      if (!pausedRef.current) {
        for (const n of vis) {
          if (n === dragRef.current) continue;
          let fx = (W / 2 - n.x) * 0.0004;
          let fy = (H / 2 - n.y) * 0.0004;
          for (const o of vis) {
            if (o === n) continue;
            const dx = n.x - o.x;
            const dy = n.y - o.y;
            const d = Math.hypot(dx, dy) || 1;
            if (d < 120) {
              const k = ((120 - d) / d) * 0.018;
              fx += dx * k;
              fy += dy * k;
            }
          }
          n.vx = (n.vx + fx) * 0.86;
          n.vy = (n.vy + fy) * 0.86;
        }
        // links behave like soft springs, so dragging one node tugs its neighbours
        for (const [a, b] of edges) {
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 1;
          const k = (d - 150) * 0.0016;
          const ux = (dx / d) * k;
          const uy = (dy / d) * k;
          if (a !== dragRef.current) { a.vx += ux; a.vy += uy; }
          if (b !== dragRef.current) { b.vx -= ux; b.vy -= uy; }
        }
        for (const n of vis) {
          if (n === dragRef.current) continue;
          n.x = Math.max(30, Math.min(W - 30, n.x + n.vx));
          n.y = Math.max(30, Math.min(H - 40, n.y + n.vy));
        }
      }

      // ── draw ──
      const v = viewRef.current;
      const dpr = canvas.width / Math.max(1, v.w);
      const light = document.documentElement.dataset.theme === "light";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.strokeStyle = light ? "rgba(23,32,48,0.07)" : "rgba(255,255,255,0.035)";
      ctx.lineWidth = 1;
      for (let x = 0; x < v.w; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, v.h); ctx.stroke(); }
      for (let y = 0; y < v.h; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(v.w, y); ctx.stroke(); }

      ctx.setTransform(dpr * v.s, 0, 0, dpr * v.s, dpr * v.ox, dpr * v.oy);
      const focus = hoverRef.current ?? selRef.current;
      const near = focus ? new Set([focus.id, ...focus.connections]) : null;

      const flow = (t * 0.006) % 1;
      for (const [a, b] of edges) {
        const hot = !!focus && (a.id === focus.id || b.id === focus.id);
        const dim = !!focus && !hot;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.lineWidth = hot ? 2.2 : 1;
        ctx.strokeStyle = hot ? "rgba(255,92,56,0.9)" : light ? `rgba(23,32,48,${dim ? 0.08 : 0.22})` : `rgba(255,255,255,${dim ? 0.05 : 0.14})`;
        ctx.stroke();
        const k = (flow + ((a.x + b.y) % 7) / 7) % 1;
        ctx.beginPath();
        ctx.arc(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, hot ? 2.6 : 1.5, 0, Math.PI * 2);
        ctx.fillStyle = hot ? "#ff5c38" : "#22c55e";
        ctx.globalAlpha = dim ? 0.25 : 1;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      for (const n of vis) {
        const hot = hoverRef.current === n || selRef.current === n;
        const faded = !!near && !near.has(n.id);
        ctx.globalAlpha = faded ? 0.28 : 1;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius + (hot ? 8 : 4), 0, Math.PI * 2);
        ctx.fillStyle = `${n.color}${hot ? "44" : "1a"}`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.shadowColor = n.color;
        ctx.shadowBlur = hot ? 16 : 7;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.font = `${hot ? 600 : 500} ${hot ? 12 : 10.5}px "Hind Siliguri", sans-serif`;
        ctx.textAlign = "center";
        ctx.fillStyle = light ? "#18212f" : hot ? "#ffffff" : "rgba(220,230,245,0.88)";
        if (!light) { ctx.shadowColor = "#000"; ctx.shadowBlur = 4; }
        ctx.fillText(n.label, n.x, n.y + n.radius + 14);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const pick = useCallback((cx: number, cy: number): GraphNode | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const r = canvas.getBoundingClientRect();
    const v = viewRef.current;
    const lx = (cx - r.left - v.ox) / v.s;
    const ly = (cy - r.top - v.oy) / v.s;
    const vis = nodesRef.current.filter((n) => isVisible(n, filterRef.current));
    for (let i = vis.length - 1; i >= 0; i -= 1) {
      if (Math.hypot(vis[i].x - lx, vis[i].y - ly) <= vis[i].radius + 9) return vis[i];
    }
    return null;
  }, []);

  const toLogical = (cx: number, cy: number) => {
    const r = canvasRef.current!.getBoundingClientRect();
    const v = viewRef.current;
    return { x: (cx - r.left - v.ox) / v.s, y: (cy - r.top - v.oy) / v.s };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const hit = pick(e.clientX, e.clientY);
    if (!hit) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = hit;
    selRef.current = hit;
    setSelected(hit);
    playClick(920);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current) {
      const p = toLogical(e.clientX, e.clientY);
      dragRef.current.x = Math.max(30, Math.min(W - 30, p.x));
      dragRef.current.y = Math.max(30, Math.min(H - 40, p.y));
      dragRef.current.vx = 0;
      dragRef.current.vy = 0;
      return;
    }
    const hit = pick(e.clientX, e.clientY);
    if (hit?.id !== hoverRef.current?.id) {
      if (hit) playNodePing(750 + Math.random() * 200);
      hoverRef.current = hit;
      setHovered(hit);
    }
  };

  const release = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    dragRef.current = null;
  };

  const onLeave = () => {
    if (!dragRef.current) {
      hoverRef.current = null;
      setHovered(null);
    }
  };

  const reset = () => {
    playClick(640);
    nodesRef.current = fresh();
    hoverRef.current = null;
    selRef.current = null;
    setHovered(null);
    setSelected(null);
  };

  const active = hovered ?? selected;

  return (
    <div
      ref={wrapRef}
      className={clsx(
        "surface-hi relative overflow-hidden rounded-3xl border border-white/12 bg-ink-950 transition-[inset] ",
        full && "fixed inset-4 z-[95] shadow-2xl",
      )}
      style={{ height: full ? "calc(100vh - 2rem)" : height }}
    >
      <div className="absolute inset-x-0 top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-ink-950/85 px-5 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-xl text-ink-950 shadow-sm" style={{ background: "var(--accent)" }}>
            <Network className="h-4 w-4 stroke-[2.5]" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display-bn text-base text-mist-100">অবসিডিয়ান নলেজ গ্রাফ</h3>
              <span className="mono-label flex items-center gap-1 text-mint-400">
                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-current" />
                লাইভ নেটওয়ার্ক
              </span>
            </div>
            <p className="mono-label text-mist-400">{bn(counts.nodes)} নোড · {bn(counts.edges)} সংযোগ</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {([
            { id: "all", label: "সব নোড" },
            { id: "story", label: "সংবাদ নোড" },
            { id: "pipeline", label: "পাইপলাইন" },
            { id: "category", label: "বিভাগ" },
          ] as { id: Filter; label: string }[]).map((item) => (
            <button
              key={item.id}
              onClick={() => {
                playClick(720);
                setFilter(item.id);
              }}
              className={clsx("rounded-full px-3 py-1 text-[12px] font-medium transition-all", filter === item.id ? "font-bold text-ink-950" : "text-mist-400 hover:bg-white/5 hover:text-mist-100")}
              style={{ background: filter === item.id ? "var(--accent)" : undefined }}
            >
              {item.label}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-white/10" />
          <button
            onClick={() => {
              playClick(580);
              pausedRef.current = !pausedRef.current;
              setPausedState(pausedRef.current);
            }}
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-mist-300 hover:bg-white/5"
            title={paused ? "নড়াচড়া চালু করুন" : "নড়াচড়া থামান"}
            aria-label={paused ? "নড়াচড়া চালু করুন" : "নড়াচড়া থামান"}
          >
            <Activity className={clsx("h-3.5 w-3.5", !paused && "text-mint-400")} />
          </button>
          <button onClick={reset} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-mist-300 hover:bg-white/5" title="গ্রাফ রিসেট করুন" aria-label="গ্রাফ রিসেট করুন">
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              playClick(840);
              setFull((x) => !x);
            }}
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-mist-300 hover:bg-white/5"
            title={full ? "ফুলস্ক্রিন বন্ধ" : "ফুলস্ক্রিন মোড"}
            aria-label={full ? "ফুলস্ক্রিন বন্ধ" : "ফুলস্ক্রিন মোড"}
          >
            {full ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={release}
        onPointerCancel={release}
        onPointerLeave={onLeave}
        className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
        aria-label="সংবাদ ও পাইপলাইনের নলেজ গ্রাফ — নোড টেনে সরানো যায়"
      />

      <AnimatePresence>
        {active ? (
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="absolute bottom-4 left-4 right-4 z-20 mx-auto max-w-lg rounded-2xl border border-white/15 bg-ink-900/92 p-4 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl font-bold text-ink-950" style={{ background: active.color }}>
                  {active.type === "core" ? <Zap className="h-5 w-5" /> : active.type === "story" ? <Sparkles className="h-5 w-5" /> : <Network className="h-5 w-5" />}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="mono-label" style={{ color: active.color }}>
                      {active.type === "core" ? "কোর হাব" : active.type === "story" ? "সংবাদ নোড" : active.type === "pipeline" ? "ইঞ্জিন ধাপ" : active.type === "category" ? "বিভাগ" : "উৎস"}
                    </span>
                    {active.factScore ? (
                      <span className="mono-label flex items-center gap-1 text-mint-400">
                        <ShieldCheck className="h-3 w-3" /> ফ্যাক্ট {bn(active.factScore)}
                      </span>
                    ) : null}
                  </div>
                  <h4 className="font-display-bn text-lg text-mist-100">{active.label}</h4>
                  {active.records ? <p className="mono-label text-mist-400">{bn(active.records)} রেকর্ডের সঙ্গে সংযুক্ত</p> : null}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {active.slug ? (
                  <Link href={`/post/${active.slug}`} className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-semibold text-ink-950 transition-all hover:brightness-110" style={{ background: "var(--accent)" }}>
                    প্রতিবেদন দেখুন <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                ) : null}
                {selected && !hovered ? (
                  <button
                    onClick={() => {
                      selRef.current = null;
                      setSelected(null);
                    }}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-white/12 text-mist-300 hover:bg-white/5"
                    aria-label="নির্বাচন সরান"
                  >
                    ✕
                  </button>
                ) : null}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
