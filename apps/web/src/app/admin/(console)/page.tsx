import { buildAdminDashboard } from "@/lib/admin-dashboard";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import type { DashRange } from "@hoichoi/dash";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rangeParam } = await searchParams;
  const range: DashRange =
    rangeParam === "24h" || rangeParam === "7d" ? rangeParam : "all";

  const { model } = await buildAdminDashboard(range);

  return <AdminDashboard model={model} />;
}
