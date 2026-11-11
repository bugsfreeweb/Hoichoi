"use client";

import { useActionState } from "react";
import { emailAdminLoginCode, type RecoveryState } from "@/app/admin/(auth)/recovery-actions";
import { emailAdvertiserReset, type ResetState } from "@/app/portal/recovery-actions";

/**
 * One form, two account kinds.
 *
 * Both flows share the same copy and validation; only the server action and the
 * success wording differ. Keeping one component means the "ইমেইল পাঠান" button
 * behaves identically in the admin and advertiser gates.
 */
export function RecoveryForm({ kind }: { kind: "admin" | "advertiser" }) {
  const action = kind === "admin" ? emailAdminLoginCode : emailAdvertiserReset;
  const [state, formAction, pending] = useActionState<
    RecoveryState | ResetState,
    FormData
  >(action as never, null);
  const field = "mt-1 w-full border border-ink/25 bg-paper px-3 py-2.5 text-[14px] text-ink outline-none focus:border-alizarin";

  return (
    <form action={formAction} className="grid gap-4">
      <label>
        <span className="field-label">অ্যাকাউন্টের ইমেইল *</span>
        <input name="email" type="email" required autoFocus autoComplete="email" maxLength={254} className={field} />
      </label>
      {state?.error && (
        <p role="alert" className="border border-alizarin/30 bg-alizarin/10 px-3 py-2 text-[12px] font-semibold text-alizarin">
          {state.error}
        </p>
      )}
      {state?.notice && (
        <p role="status" className="border border-lime/30 bg-lime/10 px-3 py-2 text-[12px] font-semibold text-ink">
          {state.notice}
        </p>
      )}
      {"devLink" in (state ?? {}) && (state as RecoveryState)?.devLink && (
        <p className="border border-amberx/40 bg-amberx/10 px-3 py-2 font-mono-x text-[11px] text-ink">
          মেইল কনফিগার না থাকায় এখানে দেখানো হচ্ছে — {(state as RecoveryState)!.devLink}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="bg-ink px-4 py-3 text-[13px] font-bold text-paper transition-colors hover:bg-alizarin disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "পাঠানো হচ্ছে…" : kind === "admin" ? "লগইন কোড ইমেইলে পাঠান" : "রিসেট লিংক পাঠান"}
      </button>
      <p className="text-[11px] leading-relaxed text-ink-soft">
        {kind === "admin"
          ? "অ্যাডমিন কনসোল ওয়ান-টাইম কোড দিয়ে লগইন করে — তাই রিসেটের বদলে নতুন কোড পাঠানো হয়। কোড ১০ মিনিটের মধ্যে একবারই ব্যবহার করা যাবে।"
          : "ইমেইল না পেলে স্প্যাম ফোল্ডার দেখুন। বারবার চেষ্টা করলে আগের লিংক বাতিল হয়ে যায়।"}
      </p>
    </form>
  );
}
