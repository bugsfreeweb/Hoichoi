import { getAdSlot } from "@hoichoi/db";
import { AdSlot } from "@/components/AdSlot";
import { PlatformAdSlot } from "@/components/ads/PlatformAdSlot";

type Props = {
  slotKey: string;
  variant: "leaderboard" | "rect" | "infeed" | "strip";
  html?: string | null;
};

export async function UnifiedAdPlacement({ slotKey, variant, html }: Props) {
  const slot = await getAdSlot(slotKey);
  const mode = slot?.deliveryMode ?? "both";
  const showHouse = mode === "both" || mode === "house";
  const showPlatform = mode === "both" || mode === "platform";

  return (
    <>
      {showHouse && <AdSlot variant={variant} html={html} />}
      {showPlatform && <PlatformAdSlot slotKey={slotKey} />}
    </>
  );
}
