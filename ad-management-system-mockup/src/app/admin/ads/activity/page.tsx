import { desc } from "drizzle-orm";
import { db } from "@/db";
import { activity } from "@/db/schema";
import { ConsoleShell, ADMIN_NAV, SectionCard, Stat } from "@/components/console/Shell";

export const dynamic = "force-dynamic";

export default async function ActivityLog() {
  const rows = await db.select().from(activity).orderBy(desc(activity.id)).limit(100);
  const auto = rows.filter((r) => r.actor === "system");
  const manual = rows.filter((r) => r.actor !== "system");

  return (
    <ConsoleShell
      kind="admin"
      nav={ADMIN_NAV}
      active="/admin/ads/activity"
      title="অ্যাক্টিভিটি ও অডিট ট্রেইল"
      subtitle="প্রতিটি স্বয়ংক্রিয় ঘটনা (পেমেন্ট, গো-লাইভ, অনুবাদ, মেয়াদ শেষ) এবং অ্যাডমিনের প্রতিটি ম্যানুয়াল হস্তক্ষেপ এখানে নথিভুক্ত।"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="মোট ইভেন্ট" value={String(rows.length)} />
        <Stat label="স্বয়ংক্রিয়" value={String(auto.length)} sub="সিস্টেম কর্তৃক" accent="#5f8f0e" />
        <Stat label="ম্যানুয়াল" value={String(manual.length)} sub="অ্যাডমিন কর্তৃক" accent="#d2202c" />
      </div>

      <div className="mt-6">
        <SectionCard title="টাইমলাইন">
          <ol className="relative space-y-0 border-l-2 border-ink/15 pl-5">
            {rows.map((r) => {
              const isAuto = r.actor === "system";
              return (
                <li key={r.id} className="relative pb-5">
                  <span
                    className="absolute top-1.5 -left-[25px] h-2.5 w-2.5 rotate-45"
                    style={{ background: isAuto ? "#5f8f0e" : "#d2202c" }}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`c-pill ${isAuto ? "st-active" : "st-expired"}`}>
                      {isAuto ? "AUTO" : "MANUAL"}
                    </span>
                    <span className="font-mono-x text-[11px] font-bold text-ink">{r.action}</span>
                    <span className="font-mono-x text-[11px] text-alizarin">{r.subject}</span>
                    <span className="ml-auto font-mono-x text-[9.5px] tracking-[0.14em] text-ink-soft uppercase">
                      {r.createdAt.toISOString().slice(0, 16).replace("T", " ")} · {r.actor}
                    </span>
                  </div>
                  <p className="mt-1 text-[12.5px] text-ink-soft">{r.detail}</p>
                </li>
              );
            })}
          </ol>
        </SectionCard>
      </div>
    </ConsoleShell>
  );
}
