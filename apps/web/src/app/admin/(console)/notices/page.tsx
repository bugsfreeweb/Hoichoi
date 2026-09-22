import { listNotices } from "@hoichoi/db";
import { AdminNotices } from "@/components/admin/AdminNotices";

export const dynamic = "force-dynamic";

export default async function AdminNoticesPage() {
  const notices = await listNotices({ limit: 200 });
  return <AdminNotices initial={notices} />;
}