import Link from "next/link";
import { CATEGORY_MAP, type Post } from "@/lib/site-data";

export default function PostCard({ post, delay = 0 }: { post: Post; delay?: number }) {
  const cat = CATEGORY_MAP[post.category];
  return (
    <div className="grid-pop" style={{ animationDelay: `${delay}ms` }}>
      <Link className="group block" href={`/post/${post.slug}`}>
        <div className="frame-press relative overflow-hidden">
          <div className="aspect-[16/9.5] overflow-hidden bg-paper-deep">
            <div className="flex h-full items-center justify-center px-6">
              <p className="text-center font-serif-bn text-[15px] leading-relaxed font-bold text-ink/40">
                {post.dek.slice(0, 90)}…
              </p>
            </div>
          </div>
          <span className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-ink/80 px-3 py-1.5 font-mono-x text-[9.5px] tracking-[0.16em] text-paper uppercase backdrop-blur-sm">
            <svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            SOURCE · {post.source}
          </span>
          <span className="absolute top-3 left-3 flex items-center gap-1.5 bg-alizarin px-2.5 py-1 text-[10px] font-bold text-white">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5l13 7.5-13 7.5z" /></svg>
            FACT-CHECKED
          </span>
        </div>

        <p className="mt-3 flex items-center justify-between text-[10.5px] text-ink-soft/80">
          <span>পুনর্লিখন · প্রতীকী</span>
          <span className="font-mono-x tracking-wide">SHOT_{post.shot} · PLAYWRIGHT</span>
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <span
            className="flex items-center gap-1.5 px-3 py-1 text-[11.5px] font-bold"
            style={{ background: cat?.color ?? "#1a140d", color: "#fff" }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5l13 7.5-13 7.5z" /></svg>
            {cat?.name ?? post.category}
          </span>
          <span className="flex items-center gap-1 text-[12px] text-ink-soft">
            <svg width="11.5" height="11.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {post.source}
          </span>
        </div>

        <h3 className="link-sweep mt-4 inline font-serif-bn text-[22px] leading-[1.35] font-extrabold text-ink">
          {post.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-[14px] leading-relaxed text-ink-soft">{post.dek}</p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2 bg-ink px-5 py-2.5 text-[13px] font-bold text-paper transition-colors duration-300 group-hover:bg-alizarin">
            পুরোটা পড়ুন
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:translate-x-1">
              <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
            </svg>
          </span>
          <span className="flex items-center gap-1.5 font-mono-x text-[10.5px] text-ink-soft">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 9h16" /><path d="M4 15h16" /><path d="M10 3 8 21" /><path d="M16 3l-2 18" />
            </svg>
            {post.hash}
          </span>
          <span className="flex items-center gap-1.5 text-[11.5px] text-ink-soft">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2" /><path d="M10 2h4" />
            </svg>
            {post.readMin} মিনিট
          </span>
        </div>
      </Link>
    </div>
  );
}
