import Link from "next/link";
import { breakingHeadlines } from "@hoichoi/db";

/** জরুরি টিকার — লুপ html-এ duplicate করে seamless scroll. */
export async function BreakingTicker() {
  let headlines = [] as Awaited<ReturnType<typeof breakingHeadlines>>;
  try {
    headlines = await breakingHeadlines(6);
  } catch {
    headlines = [];
  }

  const items = headlines.map((p) => p.title_bn);
  const list = items.length > 0 ? items : ["ফিড পরীক্ষা চলছে — নতুন আইটেম শীঘ্রই আসছে"];

  const Row = () => (
    <>
      {list.map((t, i) => (
        <span key={i} className="flex items-center gap-3 whitespace-nowrap px-5 text-[13px] text-bandline/85">
          <span className="h-1 w-1 rotate-45 bg-alizarin" />
          <Link href={headlines[i] ? `/post/${headlines[i]!.slug}` : "/"} className="hover:text-lime">
            {t}
          </Link>
        </span>
      ))}
    </>
  );

  return (
    <div className="ticker-wrap overflow-hidden border-b border-band bg-band text-bandline">
      <div className="flex items-stretch">
        <div className="z-10 flex shrink-0 items-center gap-2 bg-alizarin-deep px-4 py-2 text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/><path d="M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14"/><path d="M8 6v8"/></svg>
          <span className="font-serif-bn text-[12.5px] font-bold tracking-wide">জরুরি আপডেট</span>
        </div>
        <div className="relative flex flex-1 items-center overflow-hidden">
          <div className="ticker-track items-center" style={{ width: "max-content" }}>
            <Row />
            <Row />
          </div>
        </div>
      </div>
    </div>
  );
}