import Creative from "@/components/ads/Creative";
import { serveSlot } from "@/lib/ads/serve";
import { SLOT_MAP } from "@/lib/ads/slots";
import type { CreativeKind, PaletteKey } from "@/lib/ads/types";

/**
 * Admin-side mirror of what the public site renders for a slot right now.
 * Shows the booked creative, or the house-ad notice when the slot is empty.
 */
export default async function AdPreviewBox({ slotKey }: { slotKey: string }) {
  const slot = SLOT_MAP[slotKey];
  const served = await serveSlot(slotKey);

  if (!slot) return null;

  if (!served) {
    return (
      <div className="flex min-h-[110px] flex-col items-center justify-center gap-2 border border-dashed border-ink/35 bg-paper-deep/40 p-4 text-center">
        <span className="ad-chip flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[12px] font-black text-lime">
          হ
        </span>
        <p className="font-serif-bn text-[12.5px] font-extrabold text-ink">হাউস অ্যাড দেখানো হচ্ছে</p>
        <p className="font-mono-x text-[9px] tracking-[0.18em] text-ink-soft uppercase">
          “আপনার বিজ্ঞাপন এখানে”
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <span className="absolute top-1 right-1 z-10 border border-ink/30 bg-paper/90 px-1.5 py-0.5 font-mono-x text-[8px] tracking-[0.2em] text-ink-soft uppercase">
        {served.ref}
      </span>
      <Creative
        kind={served.kind as CreativeKind}
        palette={served.palette as PaletteKey}
        data={served.data}
        format={slot.format}
        style={served.style}
        layout={served.layout}
      />
    </div>
  );
}
