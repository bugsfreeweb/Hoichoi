"use client";

import type { EventCard, TemplateKey } from "@/lib/live-types";
import StageTemplate from "./StageTemplate";
import BroadsheetTemplate from "./BroadsheetTemplate";
import ScoreboardTemplate from "./ScoreboardTemplate";
import TimelineTemplate from "./TimelineTemplate";
import CompactTemplate from "./CompactTemplate";
import StudioTemplate from "./StudioTemplate";

export default function LiveTemplate({ template, others }: { template: TemplateKey; others?: EventCard[] }) {
  switch (template) {
    case "broadsheet":
      return <BroadsheetTemplate />;
    case "scoreboard":
      return <ScoreboardTemplate />;
    case "timeline":
      return <TimelineTemplate />;
    case "compact":
      return <CompactTemplate others={others} />;
    case "studio":
      return <StudioTemplate />;
    default:
      return <StageTemplate />;
  }
}
