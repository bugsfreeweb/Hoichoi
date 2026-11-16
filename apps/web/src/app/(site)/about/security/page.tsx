import type { Metadata } from "next";
import Link from "next/link";
import { PageSection } from "@/components/PageSection";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "নিরাপত্তা ও দুর্বলতা জানানো",
  description:
    "হৈচৈ-এ নিরাপত্তা দুর্বলতা কীভাবে জানাবেন, কত সময়ে উত্তর পাবেন, আর আমরা ইতিমধ্যে কী প্রতিরক্ষা চালু রেখেছি।",
};

/**
 * Coordinated disclosure, in Bangla first.
 *
 * `SECURITY.md` in the repository is the norm for a developer, but a reader or a
 * researcher who finds a problem lands on the website, not on the repository. So
 * the same promises live here: an address, a response time, a scope, and an
 * explicit list of what is already defended.
 *
 * If the policy in `SECURITY.md` changes, this page changes with it.
 */
export default function SecurityPolicyPage() {
  return (
    <PageSection kicker="SECURITY & DISCLOSURE" title="নিরাপত্তা ও দুর্বলতা জানানো">
      <p>
        {BRAND.bn}-এর কোনো নিরাপত্তা সমস্যা খুঁজে পেলে <strong>পাবলিক ইস্যু খুলবেন না</strong>।
        সরাসরি লিখুন{" "}
        <a className="font-bold text-alizarin hover:underline" href="mailto:security@hoichoi.io">
          security@hoichoi.io
        </a>
        -এ, সাথে যা যা দরকার:
      </p>
      <ul>
        <li>কী পেয়েছেন এবং কোথায় (URL, এন্ডপয়েন্ট বা ফাইল),</li>
        <li>সবচেয়ে ছোট ধাপে কীভাবে পুনরুৎপাদন করা যায়,</li>
        <li>আক্রমণকারী আসলে কী পায়,</li>
        <li>কোনো পাঠকের তথ্য বা ক্রেডেনশিয়াল প্রকাশ পেয়েছে কি না।</li>
      </ul>

      <h2>আমরা কখন উত্তর দিই</h2>
      <ul>
        <li>
          <strong>৭২ ঘণ্টার</strong> মধ্যে অভিস্বীকৃতি (acknowledgement)।
        </li>
        <li>
          <strong>৭ দিনের</strong> মধ্যে প্রাথমিক মূল্যায়ন — সমস্যা কি, কতটা গুরুতর, কী করতে হবে।
        </li>
        <li>
          সমাধান লাগলে ঠিক করার সময় জানানো হবে; আমরা একমত না হলে কেন এটাকে দুর্বলতা মনে করছি না,
          সেটাও লিখে জানানো হবে।
        </li>
      </ul>

      <h2>যা পরীক্ষা করা যায়</h2>
      <p>
        পাবলিক সাইট ও তার API, অ্যাডমিন কনসোল, স্ক্র্যাপার পাইপলাইন, ডেস্কটপ অ্যাপ এবং রিলিজ
        আর্টিফ্যাক্ট। <strong>যা পরীক্ষা করবেন না:</strong> নিজের ডিভাইস ইতিমধ্যেই আক্রান্ত ধরে নিয়ে করা
        অনুসন্ধান, নিজের সেশন ঘুরিয়ে রেট-লিমিট এড়ানো, নন-প্রোডাকশন হোস্টে অনুপস্থিত হেডার, এবং
        সোশ্যাল ইঞ্জিনিয়ারিং।
      </p>

      <h2>আমরা ইতিমধ্যে যা করি</h2>
      <ul>
        <li>
          পাঠকের ফর্ম ইমেইল ও নেটওয়ার্কের <strong>HMAC হ্যাশ</strong> রাখে, কখনো কাঁচা ঠিকানা নয়; গেস্ট
          পরিচয় একটি অস্বচ্ছ কুকি আইডি (<code>packages/db/src/guest.ts</code>)।
        </li>
        <li>
          প্রতিটি অ্যাডমিন API রুট তার সর্বনিম্ন রোল ঘোষণা করে, আর অডিট সারি অভিনেতার স্ন্যাপশট রাখে।
        </li>
        <li>
          CSP প্রথমে <strong>report-only</strong> চলে, সচেতনভাবে <code>CSP_ENFORCE=true</code> দিয়ে
          চালু করা হয়; ভায়োলেশন কখনো সংরক্ষণ করা হয় না।
        </li>
        <li>যে এন্ডপয়েন্টের সিক্রেট দরকার, সেটি সিক্রেট সেট না থাকলে বন্ধ থাকে (503)।</li>
        <li>ক্রেডেনশিয়ালের মেয়াদ ট্র্যাক হয় — শুধু লেবেল ও তারিখ, কখনো সিক্রেট নয়।</li>
        <li>Dependabot, CodeQL এবং gitleaks এই রিপোজিটরিতে চলে।</li>
      </ul>

      <h2>স্বীকৃতি</h2>
      <p>
        অনুমতি থাকলে সমাধানের কমিটে রিপোর্টারের নাম রাখা হয়। আমরা অর্থপ্রদত্ত বাউন্টি চালাই না — কিন্তু
        সঠিক রিপোর্ট অস্বীকার করা হয় না।
      </p>

      <h2 lang="en">Security policy (English)</h2>
      <div lang="en">
        <p>
          Please do not open a public issue for a security problem. Email{" "}
          <a className="font-bold text-alizarin hover:underline" href="mailto:security@hoichoi.io">
            security@hoichoi.io
          </a>{" "}
          with what you found, the smallest reproduction, what an attacker gains, and whether reader
          data or a credential was exposed. You will get an acknowledgement within 72 hours and an
          assessment within 7 days.
        </p>
        <p>
          Read the repository&rsquo;s <code>SECURITY.md</code> for the same policy in full, including
          the out-of-scope list.
        </p>
      </div>

      <p className="mt-6">
        <Link className="font-bold text-alizarin hover:underline" href="/about">
          ← সব নীতি ও নীতির তালিকা
        </Link>
      </p>
    </PageSection>
  );
}
