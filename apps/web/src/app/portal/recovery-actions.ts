"use server";

import { redirect } from "next/navigation";
import { destroyAdClientSession } from "@/lib/ad-client-auth";
import { mailConfig } from "@/lib/mail";
import { consumePasswordReset, prunePasswordResets, requestPasswordReset } from "@/lib/password-reset";

export type ResetState = { error?: string; notice?: string } | null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Advertiser recovery: email a password reset link.
 *
 * Unknown addresses get the same message as known ones so this page cannot be
 * used to enumerate customers.
 */
export async function emailAdvertiserReset(
  _previous: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 254);
  if (!EMAIL_RE.test(email)) return { error: "সঠিক ইমেইল ঠিকানা দিন।" };

  await prunePasswordResets().catch(() => undefined);
  const result = await requestPasswordReset("advertiser", email);
  const notice = "যদি এই ইমেইলে অ্যাকাউন্ট থাকে, পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে। ৬০ মিনিটের মধ্যে ব্যবহার করুন।";
  if (!result.found) return { notice };
  if (!result.sent) {
    // Do not pretend the mail went out: the operator needs to know mail is not
    // wired up yet, and the visitor needs to know to contact support.
    return {
      error: mailConfig().configured
        ? "ইমেইল পাঠানো যায়নি — কিছুক্ষণ পর আবার চেষ্টা করুন।"
        : "সাইটে এখনো ইমেইল সেবা চালু হয়নি; প্রশাসকের সাথে যোগাযোগ করুন।",
      notice,
    };
  }
  return { notice };
}

/** Consume the token and set the new password, then force a fresh sign-in. */
export async function resetAdvertiserPassword(
  _previous: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "").slice(0, 128);
  const confirm = String(formData.get("confirmPassword") ?? "").slice(0, 128);
  if (password.length < 8) return { error: "পাসওয়ার্ডে অন্তত ৮টি অক্ষর থাকতে হবে।" };
  if (password !== confirm) return { error: "দুটি পাসওয়ার্ড মিলছে না।" };

  const result = await consumePasswordReset(token, password);
  if (!result.ok) return { error: result.error ?? "রিসেট ব্যর্থ হয়েছে।" };

  await destroyAdClientSession().catch(() => undefined);
  redirect("/portal/login?reset=1");
}
