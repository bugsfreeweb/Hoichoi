import Link from "next/link";
import { ArrowUpRight, Radio } from "lucide-react";
import {
  getLiveEventCards,
  getLiveEventFeed,
  listLiveEvents,
  type LiveThemeKey,
} from "@hoichoi/db";
import type { LiveEventSettings } from "@hoichoi/shared-types";
import LiveProvider from "@/components/live/LiveProvider";
import LiveTemplate from "@/components/live-templates/LiveTemplate";

export async function LiveEventSection({
  enabled,
  settings,
}: {
  enabled: boolean;
  settings: LiveEventSettings;
}) {
  if (!enabled) return null;
  const [events, cards] = await Promise.all([listLiveEvents(), getLiveEventCards()]);
  const event =
    events.find((item) => item.featured && item.status !== "ended")
    ?? events.find((item) => item.status === "live")
    ?? events.find((item) => item.status === "scheduled")
    ?? events.find((item) => item.featured)
    ?? events[0];
  if (!event) return null;
  const feed = await getLiveEventFeed(event.slug, "", {
    refreshSeconds: settings.refresh_seconds,
    floatingPlayer: settings.floating_player,
  });
  if (!feed) return null;
  const template = (event.template === "auto" ? settings.default_theme : event.template) as LiveThemeKey;

  return (
    <section className="border-y border-ink/15 bg-paper-deep/30 py-7">
      <header className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 md:px-8">
        <div className="flex items-center gap-2">
          <Radio size={15} className="text-alizarin" />
          <p className="font-mono-x text-[10px] tracking-[0.2em] text-alizarin uppercase">হৈচৈ লাইভ · আসল ইভেন্ট</p>
        </div>
        <Link href="/live" className="inline-flex items-center gap-1 text-[12px] font-bold text-ink-soft hover:text-alizarin">
          সব লাইভ ইভেন্ট <ArrowUpRight size={13} />
        </Link>
      </header>
      <LiveProvider key={feed.event.id} initial={feed}>
        <LiveTemplate template={template} others={cards} />
      </LiveProvider>
    </section>
  );
}
