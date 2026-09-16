import { listReaderReports } from "@hoichoi/db";
import { ReportRow } from "@/components/admin/ReportRow";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const reports = await listReaderReports();
  const open = reports.filter((r) => r.status === "open");
  const done = reports.filter((r) => r.status !== "open");

  return (
    <div>
      <header>
        <p className="font-mono-x text-[10px] tracking-[0.24em] text-alizarin uppercase">
          🚩 READER REPORTS QUEUE
        </p>
        <h1 className="mt-1 font-serif-bn text-[34px] font-black text-ink">পাঠকের রিপোর্ট</h1>
      </header>
      <div className="mt-6 grid gap-10">
        <section>
          <QueueTitle count={open.length} label="খোলা" />
          <div className="mt-3 space-y-3">
            {open.length === 0 && <Empty />}
            {open.map((r) => (
              <ReportRow key={r.id} report={r} />
            ))}
          </div>
        </section>
        <section>
          <QueueTitle count={done.length} label="নিষ্পত্তি" />
          <div className="mt-3 space-y-3">
            {done.length === 0 && <Empty />}
            {done.map((r) => (
              <ReportRow key={r.id} report={r} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function QueueTitle({ count, label }: { count: number; label: string }) {
  return (
    <h2 className="flex items-center gap-2 font-sans-bn text-[16px] font-bold text-ink">
      <span className="h-2 w-2 bg-alizarin"></span> {label}
      <span className="rounded-full bg-ink px-2 py-0.5 font-mono-x text-[10px] text-paper">{count}</span>
    </h2>
  );
}

function Empty() {
  return <p className="border border-dashed border-ink/30 p-6 text-center text-[13px] text-ink-soft">কোনো রিপোর্ট নেই।</p>;
}