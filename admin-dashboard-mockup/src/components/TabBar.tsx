import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "../utils/cn";

export type TabItem<T extends string> = {
  id: T;
  bn: string;
  en: string;
  icon: string;
  badge?: string | number;
};

/** Horizontal tab strip with a sliding amber indicator. */
export function TabBar<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: TabItem<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  const refs = useRef<Partial<Record<T, HTMLButtonElement | null>>>({});
  const [ind, setInd] = useState({ left: 0, width: 0, ready: false });

  useLayoutEffect(() => {
    const measure = () => {
      const el = refs.current[value];
      if (el) setInd({ left: el.offsetLeft, width: el.offsetWidth, ready: true });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [value]);

  return (
    <div className="no-scrollbar relative flex gap-1 overflow-x-auto">
      <span
        className="absolute bottom-0 h-[2px] rounded-full bg-amber-brand shadow-[0_0_14px_#f5a524] transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)]"
        style={{ left: ind.left, width: ind.width, opacity: ind.ready ? 1 : 0 }}
      />
      {tabs.map((t, idx) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[t.id] = el;
            }}
            onClick={() => onChange(t.id)}
            className={cn(
              "group relative flex shrink-0 items-center gap-2.5 rounded-t-xl px-3.5 pb-3 pt-2 transition-colors duration-300",
              active ? "text-white" : "text-white/45 hover:bg-white/[0.03] hover:text-white/80",
            )}
          >
            <span
              className={cn(
                "grid h-7 w-7 place-items-center rounded-lg text-[13px] transition-all duration-300",
                active ? "scale-110 bg-amber-brand/15 text-amber-brand" : "bg-white/[0.04] group-hover:scale-110",
              )}
            >
              {t.icon}
            </span>
            <span className="flex flex-col items-start leading-none">
              <span className="bn text-[12.5px] font-semibold">{t.bn}</span>
              <span className="mono mt-1 text-[8.5px] uppercase tracking-[0.16em] text-white/30">{t.en}</span>
            </span>
            <kbd className="mono ml-1 hidden rounded border border-white/10 px-1 text-[8.5px] text-white/25 2xl:inline">{idx + 1}</kbd>
            {t.badge !== undefined && (
              <span className="mono rounded-full bg-rose-brand/20 px-1.5 py-[1px] text-[9px] font-semibold text-rose-300">{t.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
