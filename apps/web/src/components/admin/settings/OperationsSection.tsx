"use client";

import Link from "next/link";
import type { RecentPipelineRun } from "@hoichoi/db";
import { ManualRun } from "@/components/admin/ManualRun";
import LoginLogViewer from "@/components/admin/LoginLogViewer";
import { Section } from "./ui";
import type { MaintenanceInbox } from "./state";

function toBn(v: number | string): string {
  return String(v).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)] ?? d);
}

export function OperationsSection({
  initialRuns,
  inbox,
}: {
  initialRuns: RecentPipelineRun[];
  inbox: MaintenanceInbox | null;
}) {
  return (
    <div className="space-y-6">
      <Section
        kicker="Pipeline control"
        title="পাইপলাইন"
        hint="GitHub Actions cron প্রতি ৮ ঘণ্টায় চলে। নিচের বাটনটি সরাসরি GitHub-এ একটি রান ট্রিগার করে — সার্ভারে GH_TRIGGER_TOKEN ও GH_REPO সেট থাকতে হয়।"
      >
        <ManualRun initialRuns={initialRuns} />
        <p className="border-t border-ink/15 pt-4 text-[12px] text-ink-soft">
          সেটআপ নিয়ে বিস্তারিত জানতে{" "}
          <Link href="/admin/setup" className="font-bold text-alizarin underline underline-offset-2">
            সেটআপ গাইড
          </Link>{" "}
          দেখুন — প্রতিটি সিক্রেট কোথা থেকে পাবেন তা ধাপে ধাপে দেখানো আছে।
        </p>
      </Section>

      <Section
        kicker="Maintenance inbox"
        title="রক্ষণাবেক্ষণ ইনবক্স"
        hint="মেইনটেন্যান্স মোড চলাকালীন ভিজিটররা যে ইমেইল রেখে যায় বা যোগাযোগ ফর্মে পাঠায় — সব এখানে হিসেবে। বার্তার বডি দেখতে /admin/comments-এর পাশে আলাদা কিউ নেই; সংখ্যাই যথেষ্ট।"
      >
        {inbox ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ["সাবস্ক্রাইবার", inbox.subscribers],
                ["আজ নতুন", inbox.newSubscribersToday],
                ["মোট বার্তা", inbox.messages],
                ["অপঠিত বার্তা", inbox.openMessages],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-lg border border-ink/15 bg-paper p-4">
                <p className="font-mono-x text-[9px] tracking-[0.18em] text-ink-soft uppercase">{label}</p>
                <p className="mt-1.5 font-serif-bn text-[28px] leading-none font-black">{toBn(value)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12.5px] text-ink-soft">ইনবক্স পড়া যায়নি — এখনো টেবিল তৈরি হয়নি।</p>
        )}
      </Section>

      <LoginLogViewer />
    </div>
  );
}