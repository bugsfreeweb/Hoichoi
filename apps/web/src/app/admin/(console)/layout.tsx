import { requirePageUser } from "@/lib/auth";
import { getSettings, parseAppConfig } from "@hoichoi/db";
import { AdminShell } from "@/components/admin/AdminShell";

/**
 * The console's shell, with the admin-owned sidebar template.
 *
 * The style is read here (a server component) instead of being fetched in the
 * browser, so the first paint already has the right panel — a client fetch would
 * show the default template and then swap, which is a visible flash on every
 * navigation. A settings read that fails is not a reason to lose the console:
 * `parseAppConfig` falls back to the default template.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();
  const settings = await getSettings().catch(() => null);
  const cfg = parseAppConfig(settings?.app_config_json ?? null);
  return (
    <AdminShell user={user} sidebarStyle={cfg.admin_sidebar_style}>
      {children}
    </AdminShell>
  );
}
