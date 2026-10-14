import { trafficSnapshot } from "@hoichoi/db";
import { TrafficAnalytics } from "@/components/admin/TrafficAnalytics";

export const dynamic = "force-dynamic";

/**
 * First-party traffic analytics — the five admin analytics groups: live
 * visitors, most-read content, comments, page-view/OS/browser mix, and ads.
 * Hydrated server-side for a fast first paint, then range-switchable client-side.
 */
export default async function AdminTrafficPage() {
  const initial = await trafficSnapshot("24h").catch(() => null);
  return (
    <div>
      <header>
        <p className="font-mono-x text-[10px] tracking-[0.24em] text-alizarin uppercase">
          📈 FIRST-PARTY · COOKIE-LESS
        </p>
        <h1 className="mt-1 font-serif-bn text-[34px] font-black text-ink">ট্রাফিক অ্যানালিটিক্স</h1>
      </header>
      <p className="mt-2 max-w-2xl text-[12.5px] text-ink-soft">
        কোন পোস্ট কে পড়ছে, কোথা থেকে আসছে, কোন ডিভাইসে, আর বিজ্ঞাপন কেমন দেখছে — সব প্রথম-পক্ষীয়
        ট্র্যাকিং থেকে। কুকি নেই; প্রতিদিন ঘুরে যাওয়া হ্যাশ দিয়ে ইউনিক ভিজিটর গোনা হয়।
      </p>
      <div className="mt-6">
        <TrafficAnalytics initial={initial} />
      </div>
    </div>
  );
}
