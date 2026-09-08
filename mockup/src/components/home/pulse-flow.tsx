import {
  Rss,
  AppWindow,
  Fingerprint,
  Sparkles,
  GitBranch,
  Triangle,
} from "lucide-react";

const NODES = [
  { icon: Rss, t: "ফেসবুক ওয়াচলিস্ট", s: "১০ সোর্স · GRAPH READ" },
  { icon: AppWindow, t: "ডেস্কটপ কালেক্টর", s: "PLAYWRIGHT SHOT" },
  { icon: Fingerprint, t: "ডুপ্লিকেট গেট", s: "SHA-256 × SIMHASH" },
  { icon: Sparkles, t: "পুনর্লিখন ডেস্ক", s: "LLM + FACT-GATE ০.৯০" },
  { icon: GitBranch, t: "GitHub কমিট", s: "CONTENT/*.JSON" },
  { icon: Triangle, t: "Vercel লাইভ", s: "ISR · ~৮ সে" },
];

export default function PulseFlow() {
  return (
    <div className="relative">
      {/* traveling beam */}
      <div className="absolute top-[44px] right-4 left-4 hidden h-px overflow-visible bg-white/8 lg:block">
        <span className="travel-dot" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {NODES.map((n, i) => (
          <div
            key={n.t}
            className="node-glow panel relative rounded-xl p-5"
            style={{ animationDelay: `${i * 1.2}s` }}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-lime">
              <n.icon size={16} strokeWidth={1.9} />
            </span>
            <p className="mt-4 font-serif-bn text-[14.5px] font-bold text-white">
              {n.t}
            </p>
            <p className="mt-1 font-mono-x text-[8.5px] tracking-[0.16em] text-white/35 uppercase">
              {n.s}
            </p>
            <span className="absolute top-3 right-3 font-mono-x text-[10px] text-white/25">
              0{(i + 1).toString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
