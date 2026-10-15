"use client";

import { Sparkline } from "@/components/ui/primitives";
import { bn } from "@/lib/format";

export {
  CountUp,
  LiveClock,
  Marquee,
  Scramble,
  TypeWriter,
  Magnetic,
  Reveal,
  Stagger,
  StaggerItem,
  Spotlight,
  ScrollProgress,
  CompareSlider,
} from "@/components/ui/motion";

/** Sparkline with an optional label / value header. */
export function SparklineWrap({
  label,
  value,
  data,
  color,
  bare = false,
}: {
  label?: string;
  value?: number;
  data: number[];
  color: string;
  bare?: boolean;
}) {
  if (bare) return <Sparkline data={data} color={color} className="h-full w-full" height={40} width={200} />;
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5 transition-colors hover:border-white/16">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] text-mist-300">{label}</span>
        <span className="font-latin text-lg font-bold" style={{ color }}>
          {value !== undefined ? bn(value) : "—"}
        </span>
      </div>
      <div className="mt-2 h-9">
        <Sparkline data={data} color={color} className="h-9 w-full" height={36} width={240} />
      </div>
    </div>
  );
}
