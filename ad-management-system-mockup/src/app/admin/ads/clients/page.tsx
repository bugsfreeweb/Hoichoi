import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { advertisers, bookings, payments } from "@/db/schema";
import { ConsoleShell, ADMIN_NAV, StatusPill, Money, Stat, SectionCard } from "@/components/console/Shell";
import { adminSetClientStatus, adminAddCredit } from "@/lib/ads/actions";

export const dynamic = "force-dynamic";

export default async function Clients() {
  const [accs, bks, pays] = await Promise.all([
    db.select().from(advertisers).orderBy(desc(advertisers.id)),
    db.select().from(bookings),
    db.select().from(payments),
  ]);

  const clients = accs.filter((a) => a.role === "client");

  return (
    <ConsoleShell
      kind="admin"
      nav={ADMIN_NAV}
      active="/admin/ads/clients"
      title="ক্লায়েন্ট ম্যানেজমেন্ট"
      subtitle="বিজ্ঞাপনদাতা অ্যাকাউন্ট অনুমোদন, ব্লক বা ক্রেডিট যোগ করুন। সাইন-আপ স্বয়ংক্রিয়, অনুমোদন ঐচ্ছিক।"
    >
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="মোট ক্লায়েন্ট" value={String(clients.length)} />
        <Stat label="অনুমোদিত" value={String(clients.filter((c) => c.status === "approved").length)} accent="#037c1b" />
        <Stat label="অপেক্ষমাণ" value={String(clients.filter((c) => c.status === "pending").length)} accent="#b45309" />
        <Stat label="মোট ক্রেডিট" value={`৳${clients.reduce((s, c) => s + c.creditBdt, 0).toLocaleString()}`} accent="#2563eb" />
      </div>

      <div className="mt-6 space-y-4">
        {clients.map((c) => {
          const myB = bks.filter((b) => b.advertiserId === c.id);
          const myP = pays.filter((p) => p.advertiserId === c.id && p.status === "paid");
          const spend = myP.reduce((s, p) => s + p.amountBdt, 0);
          const imp = myB.reduce((s, b) => s + b.impressions, 0);
          return (
            <article key={c.id} className="c-card">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/12 px-4 py-3">
                <div>
                  <p className="font-serif-bn text-[16px] font-black text-ink">
                    {c.company ?? c.name}
                    <span className="ml-2 font-mono-x text-[10px] font-medium text-ink-soft">#{c.id}</span>
                  </p>
                  <p className="font-mono-x text-[10px] tracking-[0.14em] text-ink-soft uppercase">
                    {c.name} · {c.email} · {c.phone ?? "—"} · {c.lang.toUpperCase()}
                  </p>
                </div>
                <StatusPill s={c.status} />
              </header>

              <div className="grid gap-4 p-4 lg:grid-cols-12">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] lg:col-span-6">
                  {[
                    ["বুকিং", String(myB.length)],
                    ["চলমান", String(myB.filter((b) => b.status === "active").length)],
                    ["ইম্প্রেশন", imp.toLocaleString()],
                    ["ঠিকানা", c.address ?? "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-ink/10 py-1">
                      <dt className="text-ink-soft">{k}</dt>
                      <dd className="font-semibold text-ink">{v}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between py-1">
                    <dt className="text-ink-soft">মোট খরচ</dt>
                    <dd className="font-black"><Money v={spend} /></dd>
                  </div>
                  <div className="flex justify-between py-1">
                    <dt className="text-ink-soft">ক্রেডিট</dt>
                    <dd className="font-black"><Money v={c.creditBdt} /></dd>
                  </div>
                </dl>

                <div className="flex flex-wrap items-end gap-3 lg:col-span-6">
                  {["approved", "pending", "blocked"].map((s) => (
                    <form key={s} action={adminSetClientStatus}>
                      <input type="hidden" name="advertiserId" value={c.id} />
                      <input type="hidden" name="status" value={s} />
                      <button className={`c-btn px-3 py-1.5 text-[11px] ${c.status === s ? "c-btn-lime" : "c-btn-ghost"}`}>
                        {s === "approved" ? "অনুমোদন" : s === "pending" ? "অপেক্ষমাণ" : "ব্লক"}
                      </button>
                    </form>
                  ))}

                  <form action={adminAddCredit} className="flex items-end gap-2">
                    <input type="hidden" name="advertiserId" value={c.id} />
                    <div>
                      <label className="c-label">ক্রেডিট যোগ (৳)</label>
                      <input className="c-input mt-1 w-32" type="number" name="amount" defaultValue={1000} />
                    </div>
                    <button className="c-btn px-3 py-2 text-[11px]">যোগ করুন</button>
                  </form>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-6">
        <SectionCard title="অ্যাডমিন অ্যাকাউন্ট">
          <div className="scroll-x">
            <table className="c-table">
              <thead><tr><th>নাম</th><th>ইমেইল</th><th>রোল</th><th>স্ট্যাটাস</th></tr></thead>
              <tbody>
                {accs.filter((a) => a.role === "admin").map((a) => (
                  <tr key={a.id}>
                    <td className="font-bold">{a.name}</td>
                    <td className="font-mono-x text-[11px]">{a.email}</td>
                    <td><span className="c-pill st-active">ADMIN</span></td>
                    <td><StatusPill s={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </ConsoleShell>
  );
}
