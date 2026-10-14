import { useMemo } from "react";
import { DashboardView, type DashActions } from "@hoichoi/dash";
import { buildDeskModel, viewForTarget } from "../lib/desk-model";
import type {
  DeskCategory,
  DeskQueueRow,
  DeskRadarSnapshot,
  DeskSource,
  DeskStats,
} from "../lib/tauri";
import type { View } from "../App";

/**
 * Desktop monitor. All data comes from the local runner via App's refresh loop;
 * this screen only reshapes it into the shared {@link DashboardView} model so the
 * desk and the web admin render the exact same five tabs.
 */
export default function Dashboard({
  sources,
  queueRows,
  statsData,
  radarData,
  cats,
  running,
  dbDriver,
  onOpen,
  onRun,
  onRefresh,
  refreshing,
}: {
  sources: DeskSource[];
  queueRows: DeskQueueRow[];
  statsData: DeskStats | null;
  radarData: DeskRadarSnapshot | null;
  cats?: DeskCategory[] | null;
  running: boolean;
  dbDriver: string;
  onOpen: (tab: View) => void;
  onRun: () => void;
  onRefresh: () => void;
  refreshing?: boolean;
}) {
  const model = useMemo(
    () => buildDeskModel({ statsData, sources, queueRows, radarData, cats: cats ?? null, running, dbDriver }),
    [statsData, sources, queueRows, radarData, cats, running, dbDriver],
  );

  const actions: DashActions = {
    onNavigate: (target) => onOpen(viewForTarget(target) as View),
    onRun,
    running,
    onRefresh,
    refreshing,
  };

  return (
    <div className="scroll-slim h-full overflow-auto">
      <DashboardView model={model} actions={actions} />
    </div>
  );
}
