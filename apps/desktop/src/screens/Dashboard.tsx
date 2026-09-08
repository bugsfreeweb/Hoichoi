import { startPipeline, openAdmin } from "../lib/tauri";
import { getEnvFromVault, type CredentialName } from "../lib/vault";

export default function Dashboard({
  configured,
  refresh,
}: {
  configured: Partial<Record<CredentialName, boolean>>;
  refresh: () => Promise<void>;
}) {
  const count = Object.values(configured).filter(Boolean).length;
  const total = Object.keys(configured).length;

  const runNow = async () => {
    await startPipeline(await getEnvFromVault());
    await refresh();
  };

  return (
    <div className="mx-auto max-w-3xl p-8">
      <p className="panel-title">Dashboard</p>
      <h2 className="mt-1 font-serif-bn text-[30px] font-black">ড্যাশবোর্ড</h2>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="panel">
          <p className="panel-title">Keychain</p>
          <p className="mt-2 font-mono text-[28px] font-bold">
            {count}
            <span className="text-[14px] text-ink-soft">/{total}</span>
          </p>
          <p className="text-[11px] text-ink-soft">credentials in Stronghold</p>
        </div>
        <div className="panel">
          <p className="panel-title">Pipeline</p>
          <p className="mt-2 font-mono text-[28px] font-bold">2h</p>
          <p className="text-[11px] text-ink-soft">GitHub Actions cron</p>
        </div>
        <div className="panel">
          <p className="panel-title">Window</p>
          <p className="mt-2 font-mono text-[28px] font-bold">7d</p>
          <p className="text-[11px] text-ink-soft">public + 30d archive</p>
        </div>
      </div>

      <div className="panel mt-4">
        <p className="panel-title">Quick actions</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn" onClick={() => void runNow()}>▶ Run pipeline now</button>
          <button
            className="btn-ghost"
            onClick={() => void openAdmin("http://localhost:3070/admin")}
          >
            Open web admin
          </button>
        </div>
        <p className="mt-3 text-[11.5px] text-ink-soft">
          সাম্প্রতিক কীগুলো স্বয়ংক্রিয়ভাবে Stronghold থেকে রূপান্তরিত হয়; value কখনো দেখানো হয় না।
        </p>
      </div>

      <div className="panel mt-4">
        <p className="panel-title">Source of truth</p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          সোর্স ম্যানেজমেন্ট, মডারেশন কু, সাবমিশন, আর্কাইভ — সব অ্যাডমিন কাজ ওয়েব ডেস্কে হয়।{" "}
          <button className="font-bold text-ink underline" onClick={() => void openAdmin("http://localhost:3070/admin")}>
            localhost:3070/admin
          </button>{" "}
          এ চলে।
        </p>
      </div>
    </div>
  );
}