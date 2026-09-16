/* Faux "Facebook screenshot" card — the archived original post the desktop
   collector captured before rewriting. Matches mockup/src/components/fb-post.tsx
   using inline SVGs (web app avoids lucide-react). */

export function FbPost({
  author,
  sourceName,
  text,
  time,
  hash,
}: {
  author: string;
  sourceName: string;
  text: string;
  time: string;
  hash: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-ink/25 bg-white text-[#1c1e21]">
      {/* screenshot archive ribbon */}
      <div className="flex items-center justify-between border-b border-black/10 bg-black/[0.035] px-3.5 py-2">
        <span className="flex items-center gap-1.5 font-mono-x text-[10px] tracking-[0.18em] uppercase opacity-70">
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
          স্ক্রিনশট · আর্কাইভড
        </span>
        <span className="font-mono-x text-[10px] opacity-50">#{hash.slice(0, 8)}</span>
      </div>

      <div className="p-4">
        {/* header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-fb to-[#0a4fab] font-sans text-[13px] font-bold text-white">
              f
            </div>
            <div>
              <p className="text-[13px] leading-tight font-semibold">
                {author} <span className="font-normal opacity-60">· ফলো করুন</span>
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] opacity-55">
                {time} ·{" "}
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                <span className="font-sans">{sourceName}</span>
              </p>
            </div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-40"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
        </div>

        {/* raw text */}
        <p className="mt-3 text-[13.5px] leading-relaxed whitespace-pre-line">{text}</p>

        {/* reactions */}
        <div className="mt-3 flex items-center justify-between border-t border-black/10 pt-2.5 text-[11px] opacity-65">
          <span className="flex items-center gap-1.5">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-fb">
              <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="#fff" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>
            </span>
            ২.১ হাজার
          </span>
          <span>৪৮৬ কমেন্ট · ১৯৩ শেয়ার</span>
        </div>

        <div className="mt-1.5 flex items-center justify-between border-t border-black/10 pt-2 text-[11.5px] font-medium opacity-75">
          <span className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>
            লাইক
          </span>
          <span className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            কমেন্ট
          </span>
          <span className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98"/><path d="m15.41 6.51-6.82 3.98"/></svg>
            শেয়ার
          </span>
        </div>
      </div>
    </div>
  );
}