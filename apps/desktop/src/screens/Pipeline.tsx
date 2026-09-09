import { useRef, useEffect } from "react";
import { Radio, ScrollText } from "lucide-react";

const STAGE = /^(\[[A-Z]+\]|\[desk\])?\s*/;

export default function Pipeline({ logs }: { logs: string[] }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [logs]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/8 px-5 py-3.5">
        <p className="flex items-center gap-2 font-serif-bn text-[17px] font-bold text-white">
          <Radio size={16} className="text-white/50" />
          কালেক্টর
        </p>
        <span className="font-mono-x text-[9.5px] tracking-[0.2em] text-white/35 uppercase">
          PLAYWRIGHT · HASH · LLM · GIT
        </span>
        <span className="ml-auto flex items-center gap-1.5 font-mono-x text-[9px] tracking-[0.14em] text-lime uppercase">
          <ScrollText size={11} /> LIVE STDOUT
        </span>
      </div>

      <div ref={box} className="scroll-slim relative flex-1 overflow-auto bg-[#07090d] px-5 py-4 font-mono-x text-[12px] leading-[1.9]">
        {logs.length === 0 ? (
          <p className="text-white/30">
            এখনো কোনো রান হয়নি — sidebar থেকে "Run pipeline" টিপুন। হয়তো পোস্ট pending_review-এ
            ফেলবে, তারপর web desk-এ ঠিক করুন।
          </p>
        ) : (
          <ul>
            {logs.map((l, i) => {
              const m = l.match(STAGE);
              const stage = m?.[1] ?? "";
              const rest = l.slice(m?.[0].length ?? 0);
              return (
                <li key={i} className="flex gap-3">
                  <span className="w-[56px] shrink-0 text-white/30">{String(i).padStart(3, "0")}</span>
                  <span className="w-16 shrink-0 text-sky-300">{stage.replace(/[[\]]/g, "") || "•"}</span>
                  <span className="min-w-0 flex-1 break-words text-white/75">{rest}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}