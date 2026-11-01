import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPollBySlug, getPollResults, parseAppConfig, pollResultsVisible } from "@hoichoi/db";
import { PollWidget } from "@/components/polls/PollWidget";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [settings, poll] = await Promise.all([getSettings(), getPollBySlug(slug)]);
  if (!parseAppConfig(settings.app_config_json).show_live_polls) return { title: "পোল পাওয়া যায়নি" };
  return poll
    ? { title: `${poll.question} · লাইভ পোল`, description: poll.description || `${poll.topic} · পাঠকের মতামত` }
    : { title: "পোল পাওয়া যায়নি" };
}

export default async function PollDetailPage({ params }: Props) {
  const { slug } = await params;
  const [settings, poll] = await Promise.all([getSettings(), getPollBySlug(slug)]);
  if (!poll || !parseAppConfig(settings.app_config_json).show_live_polls) notFound();
  const results = pollResultsVisible(poll, false) ? await getPollResults(poll.id) : [];

  return (
    <main className="mx-auto max-w-site px-4 py-10 md:px-8 md:py-14">
      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-2 font-mono-x text-[9px] tracking-[0.15em] text-ink-soft uppercase">
        <Link href="/" className="hover:text-alizarin">হোম</Link><span>/</span><Link href="/poll" className="hover:text-alizarin">লাইভ পোল</Link><span>/</span><span>{poll.topic}</span>
      </nav>
      <PollWidget poll={poll} initialResults={results} />
      <Link href="/poll" className="mt-5 inline-flex text-[12px] font-bold text-alizarin hover:underline">← সব পোল</Link>
    </main>
  );
}
