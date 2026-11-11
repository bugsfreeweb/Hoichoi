"use server";

import { createAdminLoginCode } from "@hoichoi/db";
import { getUserByEmail } from "@/lib/auth";
import { mailConfig, messageShell, sendMail, siteBaseUrl } from "@/lib/mail";


export type RecoveryState = { error?: string; notice?: string; devLink?: string } | null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Admin recovery: email a fresh one-time login code.
 *
 * The admin console signs in with codes, not passwords, so "forgot password"
 * for an admin really means "send me a code". The previous flow required the
 * desktop app to be open to mint one, which locked an operator out of the web
 * console whenever they were away from that machine.
 *
 * The response is identical for unknown addresses so this cannot be used to
 * enumerate admin emails.
 */
export async function emailAdminLoginCode(
  _previous: RecoveryState,
  formData: FormData,
): Promise<RecoveryState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 254);
  if (!EMAIL_RE.test(email)) return { error: "সঠিক ইমেইল ঠিকানা দিন।" };

  const user = await getUserByEmail(email);
  const generic = {
    notice: "যদি এই ইমেইলে অ্যাকাউন্ট থাকে, একটি ওয়ান-টাইম কোড পাঠানো হয়েছে। ১০ মিনিটের মধ্যে ব্যবহার করুন।",
  };
  if (!user) return generic;

  const { code } = await createAdminLoginCode({ email, label: "self-service email" });
  const { text, html } = messageShell(
    "অ্যাডমিন লগইন কোড",
    `আপনার অ্যাডমিন কোড: <b style="font-size:22px;letter-spacing:.24em">${code}</b><br>কোডটি ১০ মিনিটের মধ্যে একবারই ব্যবহার করা যাবে।`,
    `${siteBaseUrl()}/admin/login`,
    "লগইন পেজে যান",
  );
  const sent = await sendMail({
    to: user.email,
    subject: "হৈচৈ অ্যাডমিন লগইন কোড",
    // The plain-text part must not carry HTML entities from the styled body.
    text: text.replace(/<[^>]+>/g, ""),
    html,
  });
  if (!sent.ok) {
    return {
      ...generic,
      devLink: mailConfig().configured ? undefined : `কোড: ${code}`,
    };
  }
  return generic;
}

