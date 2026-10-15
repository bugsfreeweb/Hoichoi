export interface SubscribeResult {
  ok: boolean;
  already?: boolean;
  error?: string;
}

/** Posts an address to /api/subscribe and always resolves with a Bengali-friendly result. */
export async function subscribe(email: string, source: string): Promise<SubscribeResult> {
  try {
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, source }),
    });
    const data = (await res.json()) as SubscribeResult;
    return res.ok ? data : { ok: false, error: data.error ?? "সাবস্ক্রিপশন সম্পন্ন করা যায়নি" };
  } catch {
    return { ok: false, error: "সংযোগ ব্যর্থ — একটু পরে আবার চেষ্টা করুন" };
  }
}
