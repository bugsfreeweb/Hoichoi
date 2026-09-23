import { recentPipelineRuns, getClient } from "@hoichoi/db";
import LoginLogViewer from "@/components/admin/LoginLogViewer";

export const dynamic = "force-dynamic";

export default async function AdminLogsPage() {
  const runs = await recentPipelineRuns(25);
  const client = getClient();
  const actions = await client.execute(
    "SELECT * FROM admin_actions ORDER BY created_at DESC LIMIT 40",
  );
  const actionRows = actions.rows.map((r) => r as Record<string, unknown>);

  return (
    <div>
      <PageHeading emoji="📜" kicker="AUDIT + RUN HISTORY" title="লগ" />
      <div className="mt-6 grid gap-10">
        <section>
          <SectionTitle>পাইপলাইন রান</SectionTitle>
          <div className="mt-3 space-y-2.5">
            {runs.length === 0 && <Empty />}
            {runs.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 border border-ink/20 bg-paper-deep px-4 py-3">
                <div>
                  <p className="font-mono-x text-[12px] font-bold text-ink">
                    {new Date(r.started_at).toLocaleString("bn-BD")}
                  </p>
                  <p className="font-mono-x text-[11px] text-ink-soft">
                    provider: {r.provider_used ?? "—"} · {r.finished_at ? `শেষ ${new Date(r.finished_at).toLocaleTimeString("bn-BD")}` : "চলমান"}
                  </p>
                  {r.error && <p className="mt-1 font-mono-x text-[11px] text-alizarin">{r.error}</p>}
                  {r.stats && (
                    <p className="mt-1 font-mono-x text-[10.5px] text-ink-soft">{JSON.stringify(r.stats)}</p>
                  )}
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </section>
        <section>
          <SectionTitle>অ্যাডমিন অ্যাকশন (অডিট লগ)</SectionTitle>
          <div className="mt-3 space-y-1.5">
            {actionRows.length === 0 && <Empty />}
            {actionRows.map((a) => (
              <div key={String(a.id)} className="flex items-center justify-between gap-3 border border-ink/20 bg-paper-deep px-4 py-2">
                <p className="font-mono-x text-[11.5px] text-ink">
                  <span className="font-bold">{String(a.action)}</span> · {String(a.target_table)}/{String(a.target_id)}
                </p>
                <span className="font-mono-x text-[10.5px] text-ink-soft">{new Date(String(a.created_at)).toLocaleString("bn-BD")}</span>
              </div>
            ))}
          </div>
        </section>
        <section>
          <SectionTitle>অ্যাডমিন লগইন লগ (কোন ইমেইল/আইপি থেকে ঢোকার চেষ্টা)</SectionTitle>
          <div className="mt-3">
            <LoginLogViewer />
          </div>
        </section>
      </div>
    </div>
  );
}

function PageHeading({ emoji, kicker, title }: { emoji: string; kicker: string; title: string }) {
  return (
    <header>
      <p className="font-mono-x text-[10px] tracking-[0.24em] text-alizarin uppercase">
        {emoji} {kicker}
      </p>
      <h1 className="mt-1 font-serif-bn text-[34px] font-black text-ink">{title}</h1>
    </header>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-sans-bn text-[16px] font-bold text-ink">{children}</h2>;
}

function Empty() {
  return <p className="border border-dashed border-ink/30 p-6 text-center text-[13px] text-ink-soft">কোনো এন্ট্রি নেই।</p>;
}

function StatusBadge({ status }: { status: string }) {
  const color = status === "completed" ? "bg-cat-teal" : status === "failed" ? "bg-alizarin" : "bg-amberx";
  return (
    <span className={`rounded-full ${color} px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-paper`}>
      {status}
    </span>
  );
}