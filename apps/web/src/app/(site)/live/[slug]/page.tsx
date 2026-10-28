import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLiveEventCards, getLiveEventFeed, getSettings, parseAppConfig } from "@hoichoi/db";
import LiveProvider from "@/components/live/LiveProvider";
import LivePageBody from "@/components/live/LivePageBody";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [settings, feed] = await Promise.all([getSettings(), getLiveEventFeed(slug)]);
  if (!feed || !parseAppConfig(settings.app_config_json).show_live_events) return { title: "লাইভ পাওয়া যায়নি" };
  return {
    title: feed.event.title,
    description: feed.event.summary || undefined,
    openGraph: {
      title: feed.event.title,
      description: feed.event.summary || undefined,
      images: feed.event.coverImage ? [feed.event.coverImage] : undefined,
    },
  };
}

export default async function LiveEventPage({ params }: Props) {
  const { slug } = await params;
  const [settings, cards] = await Promise.all([getSettings(), getLiveEventCards()]);
  const config = parseAppConfig(settings.app_config_json);
  if (!config.show_live_events) notFound();
  const feed = await getLiveEventFeed(slug, "", {
    refreshSeconds: config.live_events.refresh_seconds,
    floatingPlayer: config.live_events.floating_player,
  });
  if (!feed) notFound();
  return (
    <LiveProvider key={feed.event.id} initial={feed}>
      <LivePageBody others={cards} />
    </LiveProvider>
  );
}
