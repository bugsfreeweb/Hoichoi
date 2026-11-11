"use client";

import { useActionState } from "react";
import type { ResetState } from "@/app/portal/recovery-actions";

/**
 * New-password form.
 *
 * The action is passed in as a prop because the same form serves the portal
 * (advertiser) and is the model for any future principal; the token travels in
 * a hidden field so it survives the action round trip.
 */
export function ResetPasswordForm({
  action,
  token,
  submitLabel = "পাসওয়ার্ড বদলান",
}: {
  action: (state: ResetState, formData: FormData) => Promise<ResetState>;
  token: string;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const field = "mt-1 w-full border border-ink/25 bg-paper px-3 py-2.5 text-[14px] text-ink outline-none focus:border-alizarin";
  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="token" value={token} />
      <label>
        <span className="field-label">নতুন পাসওয়ার্ড *</span>
        <input name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" className={field} />
        <span className="mt-1 block text-[10.5px] text-ink-soft">অন্তত ৮টি অক্ষর।</span>
      </label>
      <label>
        <span className="field-label">পাসওয়ার্ড নিশ্চিত করুন *</span>
        <input name="confirmPassword" type="password" required minLength={8} maxLength={128} autoComplete="new-password" className={field} />
      </label>
      {state?.error && (
        <p role="alert" className="border border-alizarin/30 bg-alizarin/10 px-3 py-2 text-[12px] font-semibold text-alizarin">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="bg-ink px-4 py-3 text-[13px] font-bold text-paper transition-colors hover:bg-alizarin disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "সংরক্ষণ হচ্ছে…" : submitLabel}
      </button>
    </form>
  );
}
