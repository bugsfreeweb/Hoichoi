const STEPS: Array<{ title: string; sub: string; n: string; icon?: React.ReactNode }> = [
  {
    title: "ফেসবুক সোর্স",
    sub: "WATCHLIST · PAGES/GROUPS",
    n: "০১",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c8f65d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    ),
  },
  {
    title: "ডেস্কটপ কালেক্টর",
    sub: "TAURI · PLAYWRIGHT SHOT",
    n: "০২",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c8f65d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M10 4v4"/><path d="M2 8h20"/><path d="M6 4v4"/></svg>
    ),
  },
  {
    title: "ডুপ্লিকেট ইঞ্জিন",
    sub: "pHash + COSINE EMBED",
    n: "০৩",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c8f65d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M9 6.8a6 6 0 0 1 9 5.2v2"/></svg>
    ),
  },
  {
    title: "এআই পুনর্লিখন",
    sub: "BENGALI STYLE LLM",
    n: "০৪",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c8f65d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/><path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2"/></svg>
    ),
  },
  {
    title: "স্ক্র্যাপার সার্ভার",
    sub: "HOSTED · CRON 2H",
    n: "০৫",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c8f65d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6a9 9 0 0 0-9 9V3"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/></svg>
    ),
  },
  {
    title: "Vercel লাইভ",
    sub: "AUTO DEPLOY · ISR",
    n: "০৬",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#c8f65d" stroke="#c8f65d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13.73 4a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/></svg>
    ),
  },
];

const GATES = ["ফ্যাক্ট-গেট যাচাই", "হ্যাশ মিলানো", "শৈলী পুনর্লিখন"];

export function PipelineDiagram() {
  return (
    <section className="border-t-2 border-white/10 bg-night text-white">
      <div className="mx-auto max-w-site px-4 py-14 md:px-8 md:py-18">
        <div className="mb-10 text-center">
          <p className="font-mono-x text-[10.5px] tracking-[0.26em] text-lime uppercase">▚ SYSTEM BLUEPRINT · খোলামেলা</p>
          <h2 className="mt-2 font-serif-bn text-[34px] font-black md:text-[44px]">ফেসবুক থেকে হৈচৈ পর্যন্ত — ছয় ধাপ</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {STEPS.map((s) => (
            <div key={s.n} className="group relative border border-white/12 bg-white/[0.04] p-5 transition-colors duration-300 hover:border-lime/60 hover:bg-white/[0.07]">
              <div className="transition-transform duration-300 group-hover:-translate-y-1">{s.icon}</div>
              <p className="mt-4 font-serif-bn text-[15.5px] font-bold">{s.title}</p>
              <p className="mt-1.5 font-mono-x text-[9px] tracking-[0.14em] text-white/40">{s.sub}</p>
              <span className="absolute top-3 right-3 font-mono-x text-[10px] text-white/25">{s.n}</span>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 font-sans-bn">
          {GATES.map((g) => (
            <span key={g} className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-ink/30 bg-paper px-3 py-1 text-[10.5px] font-semibold text-ink">
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#d2202c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>
              {g}
            </span>
          ))}
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-alizarin text-white shadow-[0_8px_24px_rgba(210,32,44,0.35)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8L22 12L18 16"/><path d="M2 12H22"/></svg>
          </span>
        </div>
      </div>
    </section>
  );
}