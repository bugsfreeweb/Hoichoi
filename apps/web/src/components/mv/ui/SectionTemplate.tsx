import type { ReactNode } from "react";
import { getVariantSkin } from "@/lib/mv/registry";

/** A shared presentation skin makes the fifth design choice visibly distinct even
 * when it reuses a section's existing content renderer. */
export default function SectionTemplate({
  sectionKey,
  variant,
  children,
}: {
  sectionKey: string;
  variant: string;
  children: ReactNode;
}) {
  const skin = getVariantSkin(sectionKey, variant);
  return (
    <div className="section-template" data-section={sectionKey} data-skin={skin}>
      {children}
    </div>
  );
}
