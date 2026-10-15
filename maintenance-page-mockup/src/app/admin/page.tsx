import type { Metadata } from "next";
import { isAuthed } from "@/lib/auth";
import { getSettings, getStats, listMessages, listSubscribers } from "@/lib/store";
import { AdminLogin } from "@/app/admin/AdminLogin";
import { AdminClient } from "@/app/admin/AdminClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "হৈচৈ ডেস্ক — রক্ষণাবেক্ষণ কন্ট্রোল রুম",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  if (!(await isAuthed())) return <AdminLogin />;

  const [settings, stats, subscribers, messages] = await Promise.all([
    getSettings(),
    getStats(),
    listSubscribers(),
    listMessages(),
  ]);

  return (
    <AdminClient initial={settings} stats={stats} subscribers={subscribers} messages={messages} />
  );
}
