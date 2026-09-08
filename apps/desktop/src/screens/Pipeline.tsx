import { useRef, useEffect } from "react";

export default function Pipeline({ logs }: { logs: string[] }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [logs]);

  return (
    <div className="flex h-full flex-col p-8">
      <p className="panel-title">Pipeline · live stdout</p>
      <div
        ref={box}
        className="mt-3 flex-1 overflow-auto bg-ink p-4 font-mono text-[12px] leading-relaxed text-lime"
      >
        {logs.length === 0 ? (
          <p className="text-ink-soft text-paper/40">
            এখনো কোনো রান হয়নি — sidebar থেকে "Run pipeline" টিপুন। হয়তো পোস্ট pending_review-এ ফেলবে।
          </p>
        ) : (
          logs.map((l, i) => (
            <div key={i}>
              <span className="text-paper/30">[{String(i).padStart(3, "0")}]</span> {l}
            </div>
          ))
        )}
      </div>
    </div>
  );
}