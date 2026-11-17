import { BackupManager } from "@/components/admin/BackupManager";
import { MediaReconcilePanel } from "@/components/admin/MediaReconcilePanel";
import { PageHeading } from "@/components/admin/ui/PageHeader";

export const dynamic = "force-dynamic";

export default function AdminBackupPage() {
  return (
    <div>
      <PageHeading
        emoji="💾"
        kicker="DATA CONTROL"
        title="ব্যাকআপ, রিস্তোর ও রিসেট"
        description="কনটেন্ট ব্যাকআপ ডাউনলোড / পুনরুদ্ধার করুন, মিডিয়া রিকনসাইল করুন, অথবা পুরো সিস্টেম fresh-install অবস্থায় ফিরিয়ে আনুন।"
      />
      <div className="grid gap-5">
        <BackupManager />
        <MediaReconcilePanel />
      </div>
    </div>
  );
}
