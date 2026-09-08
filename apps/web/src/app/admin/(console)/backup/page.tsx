import { BackupManager } from "@/components/admin/BackupManager";

export const dynamic = "force-dynamic";

export default function AdminBackupPage() {
  return (
    <div>
      <header>
        <p className="font-mono-x text-[10px] tracking-[0.24em] text-alizarin uppercase">💾 DATA CONTROL</p>
        <h1 className="mt-1 font-serif-bn text-[34px] font-black text-ink">ব্যাকআপ, রিস্টোর ও রিসেট</h1>
        <p className="mt-1 text-[12.5px] text-ink-soft">
          কনটেন্ট ব্যাকআপ ডাউনলোড / পুনরুদ্ধার করুন, বা পুরো সিস্টেম fresh-install অবস্থায় ফিরিয়ে আনুন।
        </p>
      </header>
      <BackupManager />
    </div>
  );
}