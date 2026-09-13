const ICONS = {
  Rss: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11a9 9 0 0 1 9 9" />
      <path d="M4 4a16 16 0 0 1 16 16" />
      <circle cx="5" cy="19" r="1" />
    </svg>
  ),
  AppWindow: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M6 8h.01M10 8h.01" />
    </svg>
  ),
  Fingerprint: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 11a4 4 0 0 1 4 4v1" />
      <path d="M8 12a6 6 0 0 1 6-6" />
      <path d="M7 8a6 6 0 0 0-1 8c.5 1 1 2 1 4" />
      <path d="M15 16a2.5 2.5 0 0 1-2.5 2.5A4.4 4.4 0 0 1 9 18a7.6 7.6 0 0 1-1-3" />
      <path d="M7.6 17a5.4 5.4 0 0 0 .4 2.5" />
      <path d="M16 6a9 9 0 0 1 3 1" />
      <path d="M17.5 10.4a7.9 7.9 0 0 1 .5 4" />
    </svg>
  ),
  Sparkles: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.9 3.7c.3-1 .7-1.5 2.1-1.5S14.8 2.7 15 3.7c.2 1 .6 1.4 1.9 1.6 1 .2 1.4.4 1.4 1.7s-.4 1.5-1.4 1.7c-1.3.2-1.7.6-1.9 1.6-.3 1-.4 1.5-2 1.5s-1.7-.5-2-1.5c-.2-1-.6-1.4-1.9-1.6-1-.2-1.4-.4-1.4-1.7S5.1 5.5 6 5.3c1.3-.2 1.7-.6 1.9-1.6z" />
      <path d="M20 14a2 2 0 0 0-1.9-1.9c-1.3-.2-1.7-.6-1.9-1.9A2 2 0 0 0 14.3 8c1.3.2 1.7.6 1.9 1.9.2 1.3.6 1.7 1.9 1.9A2 2 0 0 0 20 14z" />
    </svg>
  ),
  GitBranch: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="6" r="3" />
      <path d="M9 6h3a6 6 0 0 1 6 6v3" />
      <path d="M9 18h3a6 6 0 0 0 6-6" />
    </svg>
  ),
  Triangle: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.73 4a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    </svg>
  ),
};

const NODES = [
  { icon: "Rss", t: "ফেসবুক ওয়াচলিস্ট", s: "১০ সোর্স · GRAPH READ" },
  { icon: "AppWindow", t: "ডেস্কটপ কালেক্টর", s: "PLAYWRIGHT SHOT" },
  { icon: "Fingerprint", t: "ডুপ্লিকেট গেট", s: "SHA-256 × SIMHASH" },
  { icon: "Sparkles", t: "পুনর্লিখন ডেস্ক", s: "LLM + FACT-GATE ০.৯০" },
  { icon: "GitBranch", t: "AI engine কমিট", s: "CONTENT/*.JSON" },
  { icon: "Triangle", t: "Web লাইভ", s: "ISR · ~৮ সে" },
];

export default function PulseFlow() {
  return (
    <div className="relative">
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
              {ICONS[n.icon as keyof typeof ICONS]}
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