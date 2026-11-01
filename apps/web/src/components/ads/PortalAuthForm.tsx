"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAdClient, registerAdClient } from "@/app/portal/actions";

export function PortalAuthForm({ mode }: { mode: "login" | "signup" }) {
  const action = mode === "signup" ? registerAdClient : loginAdClient;
  const [state, formAction, pending] = useActionState(action, null);
  const field = "mt-1 w-full border border-ink/25 bg-paper px-3 py-2.5 text-[14px] text-ink outline-none focus:border-alizarin";
  const signup = mode === "signup";

  return (
    <form action={formAction} className="grid gap-4">
      {signup && (
        <>
          <label>
            <span className="field-label">নাম *</span>
            <input name="name" required minLength={2} maxLength={120} autoComplete="name" className={field} />
          </label>
          <label>
            <span className="field-label">প্রতিষ্ঠান</span>
            <input name="company" maxLength={160} autoComplete="organization" className={field} />
          </label>
        </>
      )}
      <label>
        <span className="field-label">ইমেইল *</span>
        <input name="email" type="email" required maxLength={254} autoComplete="email" className={field} />
      </label>
      <label>
        <span className="field-label">পাসওয়ার্ড *</span>
        <input
          name="password"
          type="password"
          required
          minLength={12}
          maxLength={128}
          autoComplete={signup ? "new-password" : "current-password"}
          className={field}
        />
        {signup && <span className="mt-1 block text-[10.5px] text-ink-soft">অন্তত ১২টি অক্ষর।</span>}
      </label>
      {signup && (
        <label>
          <span className="field-label">পাসওয়ার্ড নিশ্চিত করুন *</span>
          <input
            name="confirmPassword"
            type="password"
            required
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
            className={field}
          />
        </label>
      )}
      {state?.error && <p role="alert" className="border border-alizarin/30 bg-alizarin/10 px-3 py-2 text-[12px] font-semibold text-alizarin">{state.error}</p>}
      {state?.notice && <p role="status" className="border border-lime/30 bg-lime/10 px-3 py-2 text-[12px] font-semibold text-ink">{state.notice}</p>}
      <button
        type="submit"
        disabled={pending}
        className="bg-ink px-4 py-3 text-[13px] font-bold text-paper transition-colors hover:bg-alizarin disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "অপেক্ষা করুন…" : signup ? "অ্যাকাউন্ট তৈরি করুন" : "ক্লায়েন্ট পোর্টালে প্রবেশ করুন"}
      </button>
      <p className="text-[11.5px] text-ink-soft">
        {signup ? (
          <>আগে থেকেই অ্যাকাউন্ট আছে? <Link href="/portal/login" className="font-bold text-alizarin hover:underline">লগইন করুন</Link></>
        ) : (
          <>নতুন ক্লায়েন্ট? <Link href="/portal/signup" className="font-bold text-alizarin hover:underline">অ্যাকাউন্ট তৈরি করুন</Link></>
        )}
      </p>
    </form>
  );
}
