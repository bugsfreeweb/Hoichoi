import { PageHeading } from "@/components/admin/ui/PageHeader";
import { aiTaskSummary, listAdminActionsPage, listAiTaskRuns, listDeletions, listPipelineRunsPage } from "@hoichoi/db";
import LoginLogViewer from "@/components/admin/LoginLogViewer";
import { Paginator } from "@/components/admin/Paginator";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ runsPage?: string; actionsPage?: string; action?: string; actor?: string }>;
}) {
  const { runsPage: runsParam, actionsPage: actionsParam, action: actionFilter, actor: actorFilter } = await searchParams;
  // Each list paginates on its own `page` param. They used to share one, so
  // paging the run history scrolled the audit log too and the two sections
  // fought over the same number.
  const [runs, actions, deletions, aiRuns, aiStats] = await Promise.all([
    listPipelineRunsPage(Number(runsParam ?? 1), PAGE_SIZE),
    listAdminActionsPage(Number(actionsParam ?? 1), PAGE_SIZE, {
      action: actionFilter,
      actor: actorFilter,
    }),
    listDeletions(20),
    listAiTaskRuns(12),
    aiTaskSummary(),
  ]);

  return (
    <div>
      <PageHeading emoji="📜" kicker="AUDIT + RUN HISTORY" title="লগ" description="প্রতিটি অ্যাডমিন কাজ, পাইপলাইন রান ও সোর্স-এরর এক জায়গায় — কে কী করল, কখন, ফলাফল কী।" />
      <div className="mt-6 grid gap-10">
        <section>
          <SectionTitle>পাইপলাইন রান</SectionTitle>
          <div className="mt-3 space-y-2.5">
            {runs.rows.length === 0 && <Empty />}
            {runs.rows.map((r) => (
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
          <Paginator
            page={runs.page}
            pageSize={runs.pageSize}
            total={runs.total}
            basePath="/admin/logs"
            paramName="runsPage"
            extraParams={actionsParam ? { actionsPage: actionsParam } : {}}
          />
        </section>
        <section>
          <SectionTitle>অ্যাডমিন অ্যাকশন (অডিট লগ)</SectionTitle>
          <p className="mt-1 font-mono-x text-[10.5px] text-ink-soft">
            প্রতিটি এন্ট্রিতে কে (ইমেইল ও ভূমিকা), কী কাজ, কোন বস্তু এবং কখন — লেখা থাকে।
          </p>
          <form action="/admin/logs" method="get" className="mt-3 flex flex-wrap items-end gap-2">
            <label className="font-mono-x text-[10.5px] text-ink-soft">
              অ্যাকশন
              <input
                name="action"
                defaultValue={actionFilter ?? ""}
                placeholder="provider.update"
                className="mt-1 block w-48 border border-ink/25 bg-paper px-2 py-1 font-mono-x text-[11px] text-ink"
              />
            </label>
            <label className="font-mono-x text-[10.5px] text-ink-soft">
              অ্যাডমিন ইমেইল
              <input
                name="actor"
                defaultValue={actorFilter ?? ""}
                placeholder="admin@hoichoi.io"
                className="mt-1 block w-52 border border-ink/25 bg-paper px-2 py-1 font-mono-x text-[11px] text-ink"
              />
            </label>
            <button type="submit" className="border border-ink/25 bg-ink px-3 py-1.5 font-mono-x text-[10.5px] font-bold text-paper">
              ফিল্টার
            </button>
            {(actionFilter || actorFilter) && (
              <a href="/admin/logs" className="font-mono-x text-[10.5px] font-bold text-alizarin underline">
                ফিল্টার সরান
              </a>
            )}
          </form>
          <div className="mt-3 space-y-1.5">
            {actions.rows.length === 0 && <Empty />}
            {actions.rows.map((a) => {
              const details = parseDetails(a.details);
              return (
                <div key={String(a.id)} className="flex flex-wrap items-start justify-between gap-3 border border-ink/20 bg-paper-deep px-4 py-2">
                  <div className="min-w-0">
                    <p className="font-mono-x text-[11.5px] text-ink">
                      <span className="font-bold">{String(a.action)}</span>
                      {" · "}
                      {a.target_table ? (
                        <span className="text-ink-soft">
                          {String(a.target_table)}
                          {a.target_id ? `/${String(a.target_id).slice(0, 18)}` : ""}
                        </span>
                      ) : null}
                    </p>
                    {details.summary && (
                      <p className="mt-0.5 font-sans-bn text-[12px] text-ink">{details.summary}</p>
                    )}
                    <p className="mt-0.5 font-mono-x text-[10.5px] text-ink-soft">
                      {a.actor_email ? String(a.actor_email) : "—"}
                      {a.actor_role ? ` · ${String(a.actor_role)}` : ""}
                      {a.ip_hash ? " · আইপি হ্যাশড" : ""}
                    </p>
                  </div>
                  <span className="font-mono-x text-[10.5px] whitespace-nowrap text-ink-soft">{new Date(String(a.created_at)).toLocaleString("bn-BD")}</span>
                </div>
              );
            })}
          </div>
          <Paginator
            page={actions.page}
            pageSize={actions.pageSize}
            total={actions.total}
            basePath="/admin/logs"
            paramName="actionsPage"
            extraParams={{
              ...(runsParam ? { runsPage: runsParam } : {}),
              ...(actionFilter ? { action: actionFilter } : {}),
              ...(actorFilter ? { actor: actorFilter } : {}),
            }}
          />
        </section>
        <section>
          <SectionTitle>মুছে ফেলার খাতা</SectionTitle>
          <p className="mt-1 font-mono-x text-[11px] text-ink-soft">
            মুছে ফেলা কিছু ফেরানো যায় না — কিন্তু কী গেল, কেন, কে বলল, তা থেকে যায়। শেষ ২০টি।
          </p>
          <div className="mt-3 space-y-2">
            {deletions.length === 0 && <Empty />}
            {deletions.map((d) => (
              <div key={d.id} className="border border-ink/20 bg-paper-deep px-4 py-2">
                <p className="font-mono-x text-[11.5px] text-ink">
                  <span className="font-bold">{d.entityType}</span>
                  <span className="text-ink-soft">/{d.entityId.slice(0, 18)}</span>
                  {d.detail && typeof d.detail.title_bn === "string" ? ` · ${d.detail.title_bn}` : ""}
                </p>
                <p className="mt-0.5 font-mono-x text-[10.5px] text-ink-soft">
                  {d.actor ?? "—"} · {d.reason ?? "কারণ নেই"} · {new Date(d.createdAt).toLocaleString("bn-BD")}
                </p>
              </div>
            ))}
          </div>
        </section>
        <section>
          <SectionTitle>AI ব্যবহার</SectionTitle>
          <p className="mt-1 font-mono-x text-[11px] text-ink-soft">
            ৩০ দিনে {aiStats.calls}টি কল · {aiStats.failures}টি ব্যর্থ · মোট {aiStats.totalChars.toLocaleString("bn-BD")} অক্ষর
            {aiStats.medianMs > 0 ? ` · মধ্যক ${Math.round(aiStats.medianMs / 100) / 10}s` : ""}
          </p>
          <div className="mt-3 space-y-2">
            {aiRuns.length === 0 && <Empty />}
            {aiRuns.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 border border-ink/20 bg-paper-deep px-4 py-2">
                <div>
                  <p className="font-mono-x text-[11.5px] text-ink">
                    <span className="font-bold">{r.task}</span>
                    <span className="text-ink-soft">
                      {" · "}
                      {r.provider} · {r.ok ? "ok" : r.errorKind ?? "failed"}
                    </span>
                  </p>
                  <p className="mt-0.5 font-mono-x text-[10.5px] text-ink-soft">
                    {r.inputChars} অক্ষর → {r.outputChars} · {r.latencyMs}ms{r.actor ? ` · ${r.actor}` : ""}
                  </p>
                </div>
                <span className="font-mono-x text-[10.5px] whitespace-nowrap text-ink-soft">
                  {new Date(r.createdAt).toLocaleString("bn-BD")}
                </span>
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

/** `details` holds `{ summary, ...metadata }`; older rows hold ad-hoc JSON. */
function parseDetails(raw: unknown): { summary?: string } {
  if (typeof raw !== "string" || !raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return typeof parsed.summary === "string" ? { summary: parsed.summary } : {};
  } catch {
    return {};
  }
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