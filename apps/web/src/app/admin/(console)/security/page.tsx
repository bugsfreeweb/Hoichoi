import { PageHeading } from "@/components/admin/ui/PageHeader";
import SessionList from "@/components/admin/SessionList";
import { MfaPanel } from "@/components/admin/MfaPanel";
import { DeskDevicesPanel } from "@/components/admin/DeskDevicesPanel";
import { PrivacyTool } from "@/components/admin/PrivacyTool";
import CredentialList from "@/components/admin/CredentialList";
import LoginLogViewer from "@/components/admin/LoginLogViewer";
import SecurityAlertsPanel from "@/components/admin/SecurityAlertsPanel";
import { currentSession, requiresRole } from "@/lib/auth";
import { serverBi } from "@/lib/bi-server";

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
  const { b } = await serverBi();

  return (
    <div>
      <PageHeading
        emoji="🔐"
        kicker="CREDENTIALS + DEVICES"
        title={b("নিরাপত্তা", "Security")}
        description={b(
          "কোন ডিভাইসে কনসোল খোলা আছে, কখন শেষবার ব্যবহার হয়েছে, কত দিনে সেশন শেষ হবে — এবং যেকোনো ডিভাইস এক ক্লিকে বাতিল।",
          "Which devices have the console open, when each was last used, how many days remain before the session ends — and one-click revocation.",
        )}
      />

      <div className="mt-6 grid gap-10">
        {canSeeAll ? (
          <section id="code-alerts">
            <h2 className="font-mono-x text-[11px] font-bold uppercase tracking-[0.18em] text-ink-soft">
              {b("কোড-স্ক্যানিং অ্যালার্ট", "Code-scanning alerts")}
            </h2>
            <p className="mt-1 max-w-2xl font-mono-x text-[10.5px] leading-relaxed text-ink-soft">
              {b(
                "GitHub CodeQL যে সমস্যাগুলো এখনো খোলা দেখছে — প্রতিটি সারির পাশে ঠিক করার নির্দেশনা আছে, আর অ্যালার্টটি খুললে কোডের ঠিকানা ও পূর্ণ বিবরণ দেখা যাবে।",
                "What GitHub CodeQL still sees open — every row carries the fix, and opening the alert shows the exact file and full detail.",
              )}
            </p>
            <div className="mt-3">
              <SecurityAlertsPanel canSee={canSeeAll} />
            </div>
          </section>
        ) : null}

        <section>
          <h2 className="font-mono-x text-[11px] font-bold uppercase tracking-[0.18em] text-ink-soft">
            {b("দুই-ধাপ যাচাই (2FA)", "Two-step verification (2FA)")}
          </h2>
          <div className="mt-3">
            <MfaPanel />
          </div>
        </section>

        <section>
          <h2 className="font-mono-x text-[11px] font-bold uppercase tracking-[0.18em] text-ink-soft">
            {b("ডেস্কটপ ডিভাইস", "Desktop devices")}
          </h2>
          <div className="mt-3">{canSeeAll ? <DeskDevicesPanel /> : null}</div>
        </section>

        <section>
          <h2 className="font-mono-x text-[11px] font-bold uppercase tracking-[0.18em] text-ink-soft">
            {b("সেশন ও ডিভাইস", "Sessions & devices")}
          </h2>
          <div className="mt-3">
            <SessionList canSeeAll={canSeeAll} />
            {canSeeAll ? <PrivacyTool /> : null}
          </div>
        </section>

        <section>
          <h2 className="font-mono-x text-[11px] font-bold uppercase tracking-[0.18em] text-ink-soft">
            {b("ক্রেডেনশিয়ালের মেয়াদ", "Credential expiry")}
          </h2>
          <p className="mt-1 font-mono-x text-[10.5px] text-ink-soft">
            {b(
              "প্রোভাইডার কী, টোকেন বা স্টোরেজ সিক্রেটের মেয়াদ এখানে লিখে রাখুন — মেয়াদ শেষের ৭ দিন আগে ডেইলি চেক ইমেইল পাঠাবে। এখানে কোনো সিক্রেট সংরক্ষিত হয় না।",
              "Record when provider keys, tokens and storage secrets expire — a daily check emails seven days before. No secret is stored here.",
            )}
          </p>
          <div className="mt-3">
            <CredentialList canEdit={canSeeAll} />
          </div>
        </section>

        <section>
          <h2 className="font-mono-x text-[11px] font-bold uppercase tracking-[0.18em] text-ink-soft">
            {b("লগইন লগ", "Login log")}
          </h2>
          <p className="mt-1 font-mono-x text-[10.5px] text-ink-soft">
            {b(
              "সফল ও ব্যর্থ দুটোই রেকর্ড হয়। অচেনা ডিভাইস থেকে সফল লগইন দেখলে সাথে সাথে সেশন বাতিল করুন।",
              "Both successful and failed attempts are recorded. If you see a successful login from an unknown device, revoke that session immediately.",
            )}
          </p>
          <div className="mt-3">
            <LoginLogViewer />
          </div>
        </section>
      </div>
    </div>
  );
}
