import { Megaphone } from "lucide-react";

export default function Ticker({ items }: { items: string[] }) {
  const list = items.length > 0 ? items : ["ফিড পরীক্ষা চলছে — নতুন আইটেম শীঘ্রই আসছে"];
  const doubled = [...list, ...list];

  return (
    <div className="overflow-hidden border-b border-ink bg-ink text-paper">
      <div className="flex items-stretch">
        <div className="z-10 flex shrink-0 items-center gap-2 bg-alizarin px-4 py-2">
          <Megaphone size={13} strokeWidth={2.4} />
          <span className="font-serif-bn text-[12.5px] font-bold tracking-wide">
            জরুরি আপডেট
          </span>
        </div>
        <div className="relative flex flex-1 items-center overflow-hidden">
          <div className="ticker-track items-center">
            {doubled.map((t, i) => (
              <span
                key={i}
                className="flex items-center gap-3 whitespace-nowrap px-5 text-[13px] text-paper/85"
              >
                <span className="h-1 w-1 rotate-45 bg-alizarin" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
