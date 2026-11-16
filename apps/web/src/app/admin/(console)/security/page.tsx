import { PageHeading } from "@/components/admin/ui/PageHeader";
import SessionList from "@/components/admin/SessionList";
import { PrivacyTool } from "@/components/admin/PrivacyTool";
import CredentialList from "@/components/admin/CredentialList";
import LoginLogViewer from "@/components/admin/LoginLogViewer";
import { currentSession, requiresRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * নিরাপত্তা — সেশন, ডিভাইস ও লগইন লগ।
 *
 * The credential model is codes-only (no passwords), so this page is the
 * operator's view of "who can reach the console right now": every active
 * device, when it was last used, how many days remain before the 30-day
 * absolute expiry, and one-click revocation. Login history stays below it.
 */
export default async function AdminSecurityPage() {
  const session = await currentSession();
  const canSeeAll = requiresRole(session?.user ?? null, "admin");

  return (
    <div>
      <PageHeading
        emoji="🔐"
        kicker="CREDENTIALS + DEVICES"
        title="নিরাপত্তা"
        description="কোন ডিভাইসে কনসোল খোলা আছে, কখন শেষবার ব্যবহার হয়েছে, কত দিনে সেশন শেষ হবে — এবং যেকোনো ডিভাইস এক ক্লিকে বাতিল।"
      />

      <div className="mt-6 grid gap-10">
        <section>
          <h2 className="font-mono-x text-[11px] font-bold uppercase tracking-[0.18em] text-ink-soft">সেশন ও ডিভাইস</h2>
          <div className="mt-3">
            <SessionList canSeeAll={canSeeAll} />
            {canSeeAll ? <PrivacyTool /> : null}
          </div>
        </section>

        <section>
          <h2 className="font-mono-x text-[11px] font-bold uppercase tracking-[0.18em] text-ink-soft">ক্রেডেনশিয়ালের মেয়াদ</h2>
          <p className="mt-1 font-mono-x text-[10.5px] text-ink-soft">
            প্রোভাইডার কী, টোকেন বা স্টোরেজ সিক্রেটের মেয়াদ এখানে লিখে রাখুন — মেয়াদ শেষের ৭ দিন আগে
            ডেইলি চেক ইমেইল পাঠাবে। এখানে কোনো সিক্রেট সংরক্ষিত হয় না।
          </p>
          <div className="mt-3">
            <CredentialList canEdit={canSeeAll} />
          </div>
        </section>

        <section>
          <h2 className="font-mono-x text-[11px] font-bold uppercase tracking-[0.18em] text-ink-soft">লগইন লগ</h2>
          <p className="mt-1 font-mono-x text-[10.5px] text-ink-soft">
            সফল ও ব্যর্থ দুটোই রেকর্ড হয়। অচেনা ডিভাইস থেকে সফল লগইন দেখলে সাথে সাথে সেশন বাতিল করুন।
          </p>
          <div className="mt-3">
            <LoginLogViewer />
          </div>
        </section>
      </div>
    </div>
  );
}
