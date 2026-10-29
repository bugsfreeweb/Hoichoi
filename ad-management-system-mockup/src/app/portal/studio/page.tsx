import { eq } from "drizzle-orm";
import { db } from "@/db";
import { advertisers } from "@/db/schema";
import Link from "next/link";
import { ConsoleShell, CLIENT_NAV } from "@/components/console/Shell";
import CreativeStudio from "@/components/studio/CreativeStudio";
import { studioSubmit } from "@/lib/ads/actions";

export const dynamic = "force-dynamic";

export default async function ClientStudio({
  searchParams,
}: {
  searchParams: Promise<{ slot?: string; template?: string }>;
}) {
  const sp = await searchParams;
  const [me] = await db.select().from(advertisers).where(eq(advertisers.email, "tanvir@rang.example")).limit(1);

  return (
    <ConsoleShell
      kind="client"
      nav={CLIENT_NAV}
      active="/portal/studio"
      title="ক্রিয়েটিভ স্টুডিও"
      subtitle="রং, ফন্ট, টেক্সট স্টাইল, ছবির ফিল্টার আর অ্যানিমেশন — সব বদলান, প্রিভিউ সঙ্গে সঙ্গে আপডেট হয়।"
      actions={<Link href="/portal/builder" className="c-btn c-btn-ghost">⠿ ড্র্যাগ-ড্রপ লেআউটে যান</Link>}
    >
      <CreativeStudio
        mode="client"
        advertiserId={me?.id ?? 2}
        initialSlot={sp.slot}
        initialTemplate={sp.template}
        action={studioSubmit}
        submitLabel="সেভ করে পেমেন্টে যান →"
      />
    </ConsoleShell>
  );
}
