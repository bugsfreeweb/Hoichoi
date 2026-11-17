import { PageHeading } from "@/components/admin/ui/PageHeader";
import { NotificationList } from "@/components/admin/NotificationList";
import { countUnreadNotifications, listNotifications } from "@hoichoi/db";

export const dynamic = "force-dynamic";

/**
 * The full alert list.
 *
 * Reached from the bell's "সব দেখুন". It reads the same table the bell polls, but
 * without the bell's eight-row ceiling, so "what happened overnight" is a page you
 * can scan rather than a dropdown you have to scroll.
 */
export default async function AdminNotificationsPage() {
  const [alerts, unread] = await Promise.all([
    listNotifications({ limit: 50 }),
    countUnreadNotifications().catch(() => 0),
  ]);

  return (
    <div className="pb-8">
      <PageHeading
        emoji="🔔"
        kicker="EVENT LOG · READ, EXPAND, CLEAR"
        title="নোটিফিকেশন"
        description="প্রোভাইডার কুলডাউন, ক্রেডেনশিয়ালের মেয়াদ, ব্যর্থ ক্রন — যেসব ঘটনা কিউ-তে দেখা যায় না।"
      />
      <NotificationList alerts={alerts} total={alerts.length} unread={unread} />
    </div>
  );
}
