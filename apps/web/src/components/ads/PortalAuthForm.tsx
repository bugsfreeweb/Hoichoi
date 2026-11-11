"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useState } from "react";
import { loginAdClient, registerAdClient } from "@/app/portal/actions";

export function PortalAuthForm({ mode }: { mode: "login" | "signup" }) {
  const action = mode === "signup" ? registerAdClient : loginAdClient;
  const [state, formAction, pending] = useActionState(action, null);
  const field = "mt-1 w-full border border-ink/25 bg-paper px-3 py-2.5 text-[14px] text-ink outline-none focus:border-alizarin";
  const signup = mode === "signup";
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

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
        <span className="relative block">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={signup ? 8 : undefined}
            maxLength={128}
            autoComplete={signup ? "new-password" : "current-password"}
            className={`${field} pr-16`}
          />
          <button type="button" aria-label={showPassword ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখান"} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-1 right-2 px-2 text-[10px] font-bold text-alizarin hover:underline">
            {showPassword ? "লুকান" : "দেখুন"}
          </button>
        </span>
        {signup && <span className="mt-1 block text-[10.5px] text-ink-soft">অন্তত ৮টি অক্ষর।</span>}
      </label>
      {signup && (
        <label>
          <span className="field-label">পাসওয়ার্ড নিশ্চিত করুন *</span>
          <span className="relative block">
            <input
              name="confirmPassword"
              type={showConfirmation ? "text" : "password"}
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              className={`${field} pr-16`}
            />
            <button type="button" aria-label={showConfirmation ? "নিশ্চিতকরণ পাসওয়ার্ড লুকান" : "নিশ্চিতকরণ পাসওয়ার্ড দেখান"} aria-pressed={showConfirmation} onClick={() => setShowConfirmation((value) => !value)} className="absolute inset-y-1 right-2 px-2 text-[10px] font-bold text-alizarin hover:underline">
              {showConfirmation ? "লুকান" : "দেখুন"}
            </button>
          </span>
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
      {!signup && (
        <p className="-mt-1 text-right">
          <Link href="/portal/forgot" className="font-mono-x text-[10px] tracking-[0.1em] text-ink-soft uppercase underline-offset-4 hover:text-alizarin hover:underline">
            পাসওয়ার্ড ভুলে গেছেন?
          </Link>
        </p>
      )}
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
