import Link from "next/link";
import { peekPasswordReset } from "@/lib/password-reset";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { resetAdvertiserPassword } from "@/app/portal/recovery-actions";

export const metadata = { title: "নতুন পাসওয়ার্ড" };
export const dynamic = "force-dynamic";

export default async function AdClientResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  const state = await peekPasswordReset(token).catch(() => ({ ok: false, error: "লিংক যাচাই করা যায়নি।" } as const));
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-12">
      <section className="w-full max-w-md border border-ink/20 bg-paper p-6 shadow-[8px_8px_0_0_var(--color-ink)] md:p-8">
        <Link href="/portal/login" className="font-mono-x text-[9px] tracking-[0.18em] text-alizarin uppercase hover:underline">
          ← লগইনে ফিরুন
        </Link>
        <h1 className="mt-3 font-serif-bn text-[26px] font-black text-ink">নতুন পাসওয়ার্ড সেট করুন</h1>
        {!state.ok ? (
          <>
            <p className="mt-3 border border-alizarin/30 bg-alizarin/10 px-3 py-2 text-[12px] font-semibold text-alizarin">
              {state.error}
            </p>
            <Link
              href="/portal/forgot"
              className="mt-5 inline-block bg-ink px-4 py-3 text-[13px] font-bold text-paper hover:bg-alizarin"
            >
              নতুন লিংক চান
            </Link>
          </>
        ) : (
          <>
            <p className="mb-6 mt-1 text-[12px] text-ink-soft">
              {state.email} — পাসওয়ার্ড বদলালে সব পুরনো সেশন বন্ধ হয়ে যাবে এবং আবার লগইন করতে হবে।
            </p>
            <ResetPasswordForm action={resetAdvertiserPassword} token={token} />
          </>
        )}
      </section>
    </main>
  );
}
