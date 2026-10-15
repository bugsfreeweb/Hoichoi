"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
} from "recharts";
import { useState, type ReactNode } from "react";
import clsx from "clsx";
import { bn } from "@/lib/format";

const AXIS = { stroke: "#3a4356", fontSize: 10, fontFamily: "JetBrains Mono, monospace" } as const;
const GRID = "rgba(255,255,255,0.055)";

function TipBox({ title, rows }: { title?: string; rows: { name: string; value: string; color: string }[] }) {
  return (
    <div className="min-w-[168px] rounded-lg border border-white/12 bg-ink-950/95 p-3 shadow-2xl backdrop-blur">
      {title ? <p className="mono-label mb-2 text-mist-400">{title}</p> : null}
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-[11px] text-mist-300">
              <span className="h-2 w-2 rounded-sm" style={{ background: r.color }} />
              {r.name}
            </span>
            <span className="font-latin text-[12px] font-semibold text-mist-100">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

type TipPayload = { name?: string; value?: number | string; color?: string; dataKey?: string | number };

function makeTip(unit = "", labelMap: Record<string, string> = {}) {
  return function Tip({ active, payload, label }: { active?: boolean; payload?: TipPayload[]; label?: string | number }) {
    if (!active || !payload?.length) return null;
    return (
      <TipBox
        title={String(label ?? "")}
        rows={payload.map((p) => ({
          name: labelMap[String(p.dataKey ?? p.name)] ?? String(p.name ?? ""),
          value: `${bn(Number(p.value ?? 0))}${unit}`,
          color: p.color ?? "var(--accent)",
        }))}
      />
    );
  };
}

export { default as ObsidianGraph } from "./ObsidianGraph";

export function ChartCard({
  title,
  sub,
  right,
  children,
  className,
  height = 260,
}: {
  title: string;
  sub?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  height?: number;
}) {
  return (
    <div className={clsx("surface relative overflow-hidden rounded-2xl p-5", className)}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="mono-label text-mist-400">{title}</p>
          {sub ? <p className="mt-1 text-[13px] text-mist-300">{sub}</p> : null}
        </div>
        {right}
      </div>
      <div style={{ height }} className="w-full">
        {children}
      </div>
    </div>
  );
}

/* ────────────── stacked area: collected vs published ────────────── */
export function SyncAreaChart({
  data,
  variant = "stacked",
  className,
  height = 300,
}: {
  data: { label: string; collected: number; published: number; dupes: number; comments: number }[];
  variant?: "stacked" | "smooth" | "stepped";
  className?: string;
  height?: number;
}) {
  const Tip = makeTip("");
  const type = variant === "stepped" ? "stepAfter" : variant === "smooth" ? "monotone" : "monotone";
  return (
    <div className={clsx("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="gCollected" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.55} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gPublished" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f5a524" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#f5a524" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gDupes" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#56c8ff" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#56c8ff" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={26} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={54} tickFormatter={(v: number) => bn(v)} />
          <Tooltip content={<Tip />} cursor={{ stroke: "rgba(255,255,255,0.22)", strokeDasharray: "4 4" }} />
          <Area
            type={type}
            dataKey="collected"
            name="সংগৃহীত"
            stroke="var(--accent)"
            strokeWidth={2}
            fill="url(#gCollected)"
            animationDuration={1400}
          />
          <Area
            type={type}
            dataKey="published"
            name="প্রকাশিত"
            stroke="#f5a524"
            strokeWidth={2}
            fill="url(#gPublished)"
            animationDuration={1700}
          />
          <Area
            type={type}
            dataKey="dupes"
            name="ডুপ্লিকেট"
            stroke="#56c8ff"
            strokeWidth={1.4}
            fill="url(#gDupes)"
            animationDuration={2000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ────────────── composed dashboard chart ────────────── */
export function ComposedInsightChart({
  data,
  className,
  height = 280,
}: {
  data: { label: string; collected: number; published: number; comments: number }[];
  className?: string;
  height?: number;
}) {
  const Tip = makeTip("");
  return (
    <div className={clsx("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="gBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.95} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.25} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={20} />
          <YAxis yAxisId="l" tick={AXIS} tickLine={false} axisLine={false} width={50} tickFormatter={(v: number) => bn(v)} />
          <YAxis yAxisId="r" orientation="right" tick={AXIS} tickLine={false} axisLine={false} width={34} />
          <Tooltip content={<Tip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
          <Legend
            wrapperStyle={{ fontFamily: "Hind Siliguri, sans-serif", fontSize: 11, color: "#a6b1c6", paddingTop: 8 }}
            iconType="circle"
            iconSize={7}
          />
          <Bar yAxisId="l" dataKey="collected" name="সংগৃহীত" fill="url(#gBar)" radius={[3, 3, 0, 0]} animationDuration={1200} />
          <Bar yAxisId="l" dataKey="published" name="প্রকাশিত" fill="#f5a524" radius={[3, 3, 0, 0]} animationDuration={1400} />
          <Line
            yAxisId="r"
            type="monotone"
            dataKey="comments"
            name="মন্তব্য"
            stroke="#a78bfa"
            strokeWidth={2}
            dot={false}
            animationDuration={1800}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ────────────── category bar ────────────── */
export function CategoryBarChart({
  data,
  className,
  height = 240,
  horizontal = false,
}: {
  data: { name: string; value: number; color: string }[];
  className?: string;
  height?: number;
  horizontal?: boolean;
}) {
  const Tip = makeTip(" টি");
  return (
    <div className={clsx("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={horizontal ? "vertical" : "horizontal"}
          margin={{ top: 6, right: 12, bottom: 0, left: horizontal ? 8 : -16 }}
        >
          <CartesianGrid stroke={GRID} vertical={horizontal} horizontal={!horizontal} />
          {horizontal ? (
            <>
              <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v: number) => bn(v)} />
              <YAxis type="category" dataKey="name" tick={{ ...AXIS, fontFamily: "Hind Siliguri, sans-serif", fontSize: 11 }} tickLine={false} axisLine={false} width={132} />
            </>
          ) : (
            <>
              <XAxis dataKey="name" tick={{ ...AXIS, fontFamily: "Hind Siliguri, sans-serif", fontSize: 10 }} tickLine={false} axisLine={false} interval={0} angle={-18} textAnchor="end" height={54} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} width={50} tickFormatter={(v: number) => bn(v)} />
            </>
          )}
          <Tooltip content={<Tip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
          <Bar dataKey="value" name="প্রতিবেদন" radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} animationDuration={1300}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ────────────── donut with live center ────────────── */
export function DonutChart({
  data,
  className,
  height = 250,
  inner = 62,
  outer = 88,
}: {
  data: { name: string; value: number; color: string }[];
  className?: string;
  height?: number;
  inner?: number;
  outer?: number;
}) {
  const [active, setActive] = useState<{ name: string; value: number; color: string } | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  const shown = active ?? { name: "মোট রেকর্ড", value: total, color: "var(--accent)" };
  return (
    <div className={clsx("relative w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            content={({ active: a, payload }) => {
              if (!a || !payload?.length) return null;
              const p = payload[0] as unknown as TipPayload;
              return <TipBox title={String(p.name)} rows={[{ name: "প্রতিবেদন", value: `${bn(Number(p.value))} টি`, color: String(p.color ?? "var(--accent)") }]} />;
            }}
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={`${inner}%`}
            outerRadius={`${outer}%`}
            paddingAngle={2.5}
            stroke="none"
            animationDuration={1300}
            onMouseEnter={(_, i) => setActive(data[i])}
            onMouseLeave={() => setActive(null)}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} className="cursor-pointer transition-opacity hover:opacity-85" />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="mono-label text-mist-400">{shown.name}</p>
        <p className="font-latin mt-1 text-3xl font-bold text-mist-100">{bn(shown.value)}</p>
        <p className="mono-label mt-1 text-mist-400/70">
          {Math.round((shown.value / total) * 100)}% OF FEED
        </p>
      </div>
    </div>
  );
}

/* ────────────── radar ────────────── */
export function FactRadarChart({
  data,
  className,
  height = 260,
  dual = true,
}: {
  data: { axis: string; A: number; B?: number }[];
  className?: string;
  height?: number;
  dual?: boolean;
}) {
  const Tip = makeTip(" স্কোর");
  return (
    <div className={clsx("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="74%">
          <PolarGrid stroke="rgba(255,255,255,0.11)" />
          <PolarAngleAxis dataKey="axis" tick={{ fill: "#a6b1c6", fontSize: 11, fontFamily: "Hind Siliguri, sans-serif" }} />
          <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
          <Tooltip content={<Tip />} />
          <Radar name="পুনর্লিখিত" dataKey="A" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.34} animationDuration={1400} />
          {dual ? (
            <Radar name="কাঁচা ফিড" dataKey="B" stroke="#56c8ff" fill="#56c8ff" fillOpacity={0.14} animationDuration={1700} />
          ) : null}
          <Legend wrapperStyle={{ fontFamily: "Hind Siliguri, sans-serif", fontSize: 11 }} iconType="circle" iconSize={7} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ────────────── radial gauges ────────────── */
export function RadialGauges({
  data,
  className,
  height = 240,
}: {
  data: { label: string; value: number; color: string; sub?: string }[];
  className?: string;
  height?: number;
}) {
  const chartData = data.map((d, i) => ({ ...d, fill: d.color, idx: i }));
  return (
    <div className={clsx("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="30%"
          outerRadius="100%"
          data={chartData}
          startAngle={210}
          endAngle={-30}
          barSize={11}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
          <RadialBar background={{ fill: "rgba(255,255,255,0.06)" }} dataKey="value" cornerRadius={8} animationDuration={1500} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0]?.payload as (typeof data)[number];
              return <TipBox title={p.label} rows={[{ name: "মান", value: `${bn(p.value)}%`, color: p.color }]} />;
            }}
          />
        </RadialBarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ────────────── treemap ────────────── */
export function TopicTreemap({
  data,
  className,
  height = 280,
}: {
  data: { name: string; size: number; color: string }[];
  className?: string;
  height?: number;
}) {
  return (
    <div className={clsx("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={data}
          dataKey="size"
          aspectRatio={4 / 3}
          stroke="#08090c"
          animationDuration={1200}
          content={({ x, y, width, height, name, color }: { x?: number; y?: number; width?: number; height?: number; name?: string; color?: string }) => {
            const w = width ?? 0;
            const h = height ?? 0;
            if (w < 4 || h < 4) return <g />;
            return (
              <g>
                <rect x={x} y={y} width={w} height={h} fill={color ?? "var(--accent)"} fillOpacity={0.42} stroke="#08090c" strokeWidth={2} rx={3} />
                {w > 62 && h > 30 ? (
                  <text x={(x ?? 0) + 8} y={(y ?? 0) + h / 2} fill="#eef1f7" fontSize={10.5} fontFamily="Hind Siliguri, sans-serif" dominantBaseline="middle">
                    {String(name ?? "").length > Math.floor(w / 9) ? `${String(name ?? "").slice(0, Math.max(4, Math.floor(w / 9)))}…` : String(name ?? "")}
                  </text>
                ) : null}
              </g>
            );
          }}
        >
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0]?.payload as { name?: string; size?: number; color?: string };
              return (
                <TipBox
                  title={String(p.name ?? "")}
                  rows={[{ name: "রেকর্ড", value: `${bn(Number(p.size ?? 0))} টি`, color: String(p.color ?? "var(--accent)") }]}
                />
              );
            }}
          />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}

/* ────────────── engagement (post page) ────────────── */
export function EngagementAreaChart({
  data,
  className,
  height = 230,
}: {
  data: { hour: string; views: number; shares: number; comments: number }[];
  className?: string;
  height?: number;
}) {
  const Tip = makeTip("");
  return (
    <div className={clsx("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.5} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="hour" tick={AXIS} tickLine={false} axisLine={false} minTickGap={26} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={54} tickFormatter={(v: number) => bn(v)} />
          <Tooltip content={<Tip />} cursor={{ stroke: "rgba(255,255,255,0.2)", strokeDasharray: "3 3" }} />
          <Area type="monotone" dataKey="views" name="ভিউ" stroke="var(--accent)" strokeWidth={2} fill="url(#gViews)" animationDuration={1400} />
          <Area type="monotone" dataKey="shares" name="শেয়ার" stroke="#56c8ff" strokeWidth={1.4} fill="transparent" animationDuration={1600} />
          <Area type="monotone" dataKey="comments" name="কমেন্ট" stroke="#f5a524" strokeWidth={1.4} fill="transparent" animationDuration={1800} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EngagementPie({
  data,
  className,
  height = 230,
}: {
  data: { name: string; value: number; color: string }[];
  className?: string;
  height?: number;
}) {
  const Tip = makeTip(" টি");
  return (
    <div className={clsx("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<Tip />} />
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="48%" outerRadius="80%" paddingAngle={3} stroke="none" animationDuration={1200}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Legend wrapperStyle={{ fontFamily: "Hind Siliguri, sans-serif", fontSize: 11 }} iconType="circle" iconSize={7} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RetentionBar({
  data,
  className,
  height = 230,
}: {
  data: { bucket: string; value: number }[];
  className?: string;
  height?: number;
}) {
  const Tip = makeTip("%");
  return (
    <div className={clsx("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -22 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="bucket" tick={{ ...AXIS, fontFamily: "Hind Siliguri, sans-serif", fontSize: 10 }} tickLine={false} axisLine={false} interval={0} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={50} tickFormatter={(v: number) => `${bn(v)}%`} />
          <Tooltip content={<Tip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
          <Bar dataKey="value" name="পাঠক টিকে আছে" radius={[4, 4, 0, 0]} animationDuration={1300}>
            {data.map((d, i) => (
              <Cell key={d.bucket} fill={i === 0 ? "var(--accent)" : `color-mix(in srgb, var(--accent) ${90 - i * 13}%, #10141e)`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SentimentRadar({
  data,
  className,
  height = 230,
}: {
  data: { axis: string; value: number }[];
  className?: string;
  height?: number;
}) {
  const Tip = makeTip(" স্কোর");
  return (
    <div className={clsx("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="rgba(255,255,255,0.11)" />
          <PolarAngleAxis dataKey="axis" tick={{ fill: "#a6b1c6", fontSize: 11, fontFamily: "Hind Siliguri, sans-serif" }} />
          <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
          <Tooltip content={<Tip />} />
          <Radar name="টোন" dataKey="value" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.32} animationDuration={1400} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
