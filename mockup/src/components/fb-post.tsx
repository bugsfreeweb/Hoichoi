import { Globe2, ThumbsUp, MessageCircle, Share2, Camera, MoreHorizontal } from "lucide-react";

/**
 * A faux "Facebook screenshot" card — represents the archived original post
 * that the desktop collector captured before rewriting.
 */
export default function FbPost({
  author,
  sourceName,
  text,
  time,
  hash,
  dark = false,
}: {
  author: string;
  sourceName: string;
  text: string;
  time: string;
  hash: string;
  dark?: boolean;
}) {
  const shell = dark
    ? "border-white/12 bg-[#181f2a] text-white/85"
    : "border-ink/25 bg-white text-[#1c1e21]";

  return (
    <div className={`relative overflow-hidden rounded-xl border ${shell}`}>
      {/* screenshot archive ribbon */}
      <div className="flex items-center justify-between border-b border-current/10 bg-black/[0.035] px-3.5 py-2">
        <span className="flex items-center gap-1.5 font-mono-x text-[10px] tracking-[0.18em] uppercase opacity-70">
          <Camera size={11} strokeWidth={2.2} />
          স্ক্রিনশট · আর্কাইভড
        </span>
        <span className="font-mono-x text-[10px] opacity-50">#{hash.slice(0, 8)}</span>
      </div>

      <div className="p-4">
        {/* header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-fb to-[#0a4fab] font-latin text-[13px] font-bold text-white">
              f
            </div>
            <div>
              <p className="text-[13px] leading-tight font-semibold">
                {author}{" "}
                <span className="font-normal opacity-60">· ফলো করুন</span>
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] opacity-55">
                {time} · <Globe2 size={10} /> · {sourceName}
              </p>
            </div>
          </div>
          <MoreHorizontal size={16} className="opacity-40" />
        </div>

        {/* raw text */}
        <p className="mt-3 text-[13.5px] leading-relaxed whitespace-pre-line">{text}</p>

        {/* reactions */}
        <div className="mt-3 flex items-center justify-between border-t border-current/10 pt-2.5 text-[11px] opacity-65">
          <span className="flex items-center gap-1.5">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-fb">
              <ThumbsUp size={9} className="fill-white text-white" />
            </span>
            ২.১ হাজার
          </span>
          <span>৪৮৬ কমেন্ট · ১৯৩ শেয়ার</span>
        </div>

        <div className="mt-1.5 flex items-center justify-between border-t border-current/10 pt-2 text-[11.5px] font-medium opacity-75">
          <span className="flex items-center gap-1.5">
            <ThumbsUp size={12} /> লাইক
          </span>
          <span className="flex items-center gap-1.5">
            <MessageCircle size={12} /> কমেন্ট
          </span>
          <span className="flex items-center gap-1.5">
            <Share2 size={12} /> শেয়ার
          </span>
        </div>
      </div>
    </div>
  );
}
