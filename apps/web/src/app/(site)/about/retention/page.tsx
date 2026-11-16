import type { Metadata } from "next";
import Link from "next/link";
import { PageSection } from "@/components/PageSection";
import { getSettings } from "@/lib/settings";
import { toBn } from "@/lib/format";

export const metadata: Metadata = { title: "কত দিন কী থাকে — ধারণ নীতি" };

export const revalidate = 300;

/**
 * Retention policy — the page the audit asked for.
 *
 * The numbers on this page are read from the same `settings` row the archive
 * job reads (`archive_visible_days`, `archive_retention_days`). If an operator
 * changes the window in the console, this page changes with it: a retention
 * promise that is typed by hand goes stale the first time somebody edits a
 * setting, and a stale promise is worse than none.
 */
export default async function RetentionPolicyPage() {
  const settings = await getSettings().catch(() => null);
  const visible = settings?.archive_visible_days ?? 7;
  const retention = settings?.archive_retention_days ?? 30;

  return (
    <PageSection kicker="RETENTION" title="কত দিন কী থাকে">
      <p>
        এই ডেস্ক একটি নির্দিষ্ট জানালার জন্য সংবাদ রাখে — অনির্দিষ্টকালের আর্কাইভ নয়। নিচের সংখ্যাগুলো
        কোনো প্রতিশ্রুতির লেখা নয়, বরং <strong>সেটিংসের সেই একই মান</strong> যা আর্কাইভ জব পড়ে। তাই
        সময়সীমা বদলালে এই পাতাও বদলায়।
      </p>

      <h2>প্রতিবেদন</h2>
      <ul>
        <li>
          প্রকাশের পর <strong>{toBn(visible)} দিন</strong> প্রতিবেদনটি সাইটে ও তালিকায় দেখা যায়।
        </li>
        <li>
          এরপর সেটি স্বয়ংক্রিয়ভাবে আর্কাইভে চলে যায় — ঠিকানা আরও{" "}
          <strong>{toBn(Math.max(0, retention - visible))} দিন</strong> কাজ করে, কিন্তু হোমপেজ ও বিভাগের
          তালিকা থেকে সরে যায়।
        </li>
        <li>
          প্রকাশের <strong>{toBn(retention)} দিন</strong> পর প্রতিবেদনটি স্থায়ীভাবে মুছে যায়, আর মুছে
          ফেলার একটি রেকর্ড (কী গেল, কেন, কে বলল) থেকে যায়।
        </li>
      </ul>
      <p className="font-mono-x text-[12px] text-ink-soft">
        চালায়: <code>packages/db/src/archive.ts</code> · মুছে ফেলার খাতা:{" "}
        <code>packages/db/src/deletion-log.ts</code>
      </p>

      <h2>ব্যতিক্রম — আইনি ধারণ (legal hold)</h2>
      <p>
        কোনো প্রতিবেদনের বিরুদ্ধে অভিযোগ, মামলা বা তদন্ত চললে সেটি <strong>legal hold</strong>-এ রাখা
        যায়। তখন স্বয়ংক্রিয় মোছা বন্ধ থাকে, যতদিন না মানুষ সেটি ছেড়ে দেয়। নিখোঁজ-শিশু বিভাগের সক্রিয়
        কেস-ও স্থায়ীভাবে রাখা হয়, কারণ কেসটি তখনো জীবিত।
      </p>

      <h2>মিডিয়া ফাইল</h2>
      <ul>
        <li>
          প্রতিবেদনের সঙ্গে যুক্ত ছবি/ভিডিও প্রতিবেদনের সঙ্গেই মুছে যায়; স্টোরেজে অনাথ হয়ে থাকা ফাইল
          আলাদা যাচাইয়ের পর সরানো হয় — <strong>৬ ঘণ্টার সুরক্ষা-সীমার</strong> পরে, যাতে চলমান
          আপলোড কেটে না যায়।
        </li>
        <li>
          একটি ফাইল তখনই মুছে ফেলা হয় যখন প্রমাণ থাকে যে কোনো প্রতিবেদন সেটি আর ব্যবহার করছে না; প্রতিটি
          সিদ্ধান্তের রেকর্ড থাকে।
        </li>
      </ul>
      <p className="font-mono-x text-[12px] text-ink-soft">
        চালায়: <code>packages/db/src/media-reconcile.ts</code>
      </p>

      <h2>পাঠকের তথ্য</h2>
      <ul>
        <li>
          মন্তব্য, রিপোর্ট ও সাবমিশনে দেওয়া ইমেইল ও আইপি <strong>হ্যাশ</strong> আকারে রাখা হয় — কাঁচা
          ঠিকানা নয়। আইপি /২৪–/৬৪ পর্যন্ত ছোট করা হয়, তারপর হ্যাশ।
        </li>
        <li>
          একজন পাঠক নিজের সব ডেটা চাইতে বা মুছে ফেলতে পারেন; মুছলে সেই পাঠকের ব্যবহার করা প্রতিটি ইমেইল
          হ্যাশ ধরে খোঁজা হয়।
        </li>
      </ul>
      <p className="font-mono-x text-[12px] text-ink-soft">
        চালায়: <code>packages/db/src/guest.ts</code> · <code>apps/web/src/lib/guest.ts</code>
      </p>

      <h2>লগ</h2>
      <ul>
        <li>
          অ্যাডমিন কাজের অডিট লগ ও লগইন লগ <strong>মুছে ফেলা যায় না</strong> — কনসোল থেকে কোনো বাটন
          নেই। লগ থাকাই এর কাজ।
        </li>
        <li>
          CSP রিপোর্ট <strong>সংরক্ষণ করা হয় না</strong> — সেগুলোতে পাঠকের পাতার ঠিকানা থাকে।
        </li>
      </ul>
      <p className="font-mono-x text-[12px] text-ink-soft">
        চালায়: <code>apps/web/src/app/api/csp-report/route.ts</code> ·{" "}
        <code>packages/db/src/audit.ts</code>
      </p>

      <p>
        সংশোধন কীভাবে হয় তা <Link className="font-bold text-alizarin hover:underline" href="/about/corrections">সংশোধন নীতিতে</Link>, আর কোন
        ফাইল কোন নীতি চালায় তা <Link className="font-bold text-alizarin hover:underline" href="/about">আমাদের
        সম্পর্কে</Link> পাতায় আছে।
      </p>
    </PageSection>
  );
}