"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Inbox, Mail, MailOpen, Reply, Search, Trash2, Users } from "lucide-react";
import Link from "next/link";
import type { Message, Subscriber } from "@/db/schema";
import { bnNum, loc } from "@/lib/types";
import { THEMES, themeName } from "@/lib/themes";
import { Card, Segmented } from "@/app/admin/ui";

function timeAgo(d: Date, bn: boolean) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return bn ? "এক্ষুনি" : "just now";
  if (mins < 60) return bn ? `${bnNum(mins, "bn")} মিনিট আগে` : `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return bn ? `${bnNum(hrs, "bn")} ঘণ্টা আগে` : `${hrs}h ago`;
  return bn ? `${bnNum(Math.round(hrs / 24), "bn")} দিন আগে` : `${Math.round(hrs / 24)}d ago`;
}

export function AudienceTab({
  subscribers,
  messages,
}: {
  subscribers: Subscriber[];
  messages: Message[];
}) {
  const [tab, setTab] = useState<"subscribers" | "messages">("subscribers");
  const [q, setQ] = useState("");
  const router = useRouter();
  const [locale] = useState<"bn" | "en">("bn");
  const bn = locale === "bn";
  void loc;

  const filteredSubs = useMemo(() => {
    const needle = q.toLowerCase();
    return subscribers.filter(
      (r) => !needle || r.email.toLowerCase().includes(needle) || (r.name ?? "").toLowerCase().includes(needle),
    );
  }, [subscribers, q]);

  async function removeSubscriber(id: number) {
    await fetch(`/api/subscribers?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function toggleMessage(m: Message) {
    await fetch("/api/messages", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: m.id, read: !m.read }),
    });
    router.refresh();
  }

  async function removeMessage(id: number) {
    await fetch(`/api/messages?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <Card
        title={bn ? "পাঠক" : "Audience"}
        desc={bn ? "রক্ষণাবেক্ষণ পেজ থেকে সরাসরি সংগৃহীত নিউজলেটার সাইন-আপ ও যোগাযোগ বার্তা।" : "Newsletter sign-ups and contact messages captured straight from the maintenance page."}
        actions={
          <div className="w-72">
            <Segmented
              size="sm"
              value={tab}
              onChange={setTab}
              options={[
                { id: "subscribers", label: `${bn ? "সাবস্ক্রাইবার" : "Subscribers"} (${bnNum(subscribers.length, locale)})` },
                { id: "messages", label: `${bn ? "বার্তা" : "Messages"} (${bnNum(messages.length, locale)})` },
              ]}
            />
          </div>
        }
      >
        {tab === "subscribers" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-56 flex-1">
                <Search size={15} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-[#6b6250]" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={bn ? "ইমেইল খুঁজুন…" : "Search emails…"}
                  className="font-sans-bn w-full rounded-lg border-2 border-[#1a140d]/15 bg-white py-2.5 pr-3 pl-10 text-sm outline-none placeholder:text-[#6b6250]/60 focus:border-[#1a140d]"
                />
              </div>
              <Link
                href="/api/subscribers/export"
                className="inline-flex items-center gap-2 rounded-lg border-2 border-[#1a140d]/15 bg-white px-4 py-2.5 text-sm font-bold text-[#1a140d] transition hover:border-[#1a140d]"
              >
                <Download size={15} /> Export CSV
              </Link>
            </div>

            {filteredSubs.length === 0 ? (
              <div className="grid place-items-center rounded-2xl border-2 border-dashed border-[#1a140d]/20 py-14 text-center">
                <Users size={22} className="text-[#6b6250]/50" />
                <p className="font-serif-bn mt-3 text-sm font-extrabold text-[#1a140d]">{bn ? "এখনও সাবস্ক্রাইবার নেই" : "No subscribers yet"}</p>
                <p className="mt-1 max-w-sm text-xs text-[#6b6250]">
                  {bn ? "ভিজিটর পেজ খুলে নোটিফাই-মি ফর্ম ব্যবহার করুন — সাইন-আপ এখানে সাথে সাথে দেখা যাবে।" : "Open the visitor page and use the notify-me form — sign-ups appear here instantly."}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border-2 border-[#1a140d]/12">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#1a140d] font-mono-x text-[10px] tracking-[0.18em] text-[#c8f65d] uppercase">
                    <tr>
                      <th className="px-4 py-2.5 font-bold">Email</th>
                      <th className="px-4 py-2.5 font-bold">{bn ? "ডিজাইন" : "Design"}</th>
                      <th className="px-4 py-2.5 font-bold">{bn ? "যোগ দিয়েছে" : "Signed up"}</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a140d]/8 bg-white">
                    {filteredSubs.map((r) => (
                      <tr key={r.id} className="transition hover:bg-[#f3eee1]/60">
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-2.5 font-bold text-[#1a140d]">
                            <Mail size={14} className="text-[#d2202c]" /> {r.email}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#6b6250]">
                          {THEMES.find((x) => x.id === r.theme) ? themeName(THEMES.find((x) => x.id === r.theme)!, locale) : (r.theme ?? "—")}
                        </td>
                        <td className="font-mono-x px-4 py-3 text-xs text-[#6b6250]">{timeAgo(r.createdAt, bn)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => removeSubscriber(r.id)}
                            className="rounded-lg p-2 text-[#6b6250]/50 transition hover:bg-[#d2202c]/10 hover:text-[#d2202c]"
                            title="Remove"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="grid place-items-center rounded-2xl border-2 border-dashed border-[#1a140d]/20 py-14 text-center">
                <Inbox size={22} className="text-[#6b6250]/50" />
                <p className="font-serif-bn mt-3 text-sm font-extrabold text-[#1a140d]">{bn ? "ইনবক্স খালি" : "Inbox is empty"}</p>
                <p className="mt-1 max-w-sm text-xs text-[#6b6250]">
                  {bn ? "রক্ষণাবেক্ষণ যোগাযোগ ফর্মে পাঠানো বার্তা এখানে জমা হয়।" : "Messages sent through the maintenance contact form land here."}
                </p>
              </div>
            ) : (
              messages.map((m) => (
                <article
                  key={m.id}
                  className={`rounded-2xl border-2 p-4 transition ${
                    m.read ? "border-[#1a140d]/12 bg-white" : "border-[#d2202c]/40 bg-[#d2202c]/[0.04]"
                  }`}
                >
                  <header className="flex flex-wrap items-center gap-3">
                    <span className="font-serif-bn grid h-9 w-9 place-items-center rounded-xl bg-[#1a140d] text-xs font-black text-[#c8f65d]">
                      {m.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="leading-tight">
                      <p className="text-sm font-bold text-[#1a140d]">{m.name}</p>
                      <p className="font-mono-x text-[11px] text-[#6b6250]">{m.email}</p>
                    </div>
                    <span className="font-mono-x ml-auto text-[11px] text-[#6b6250]">{timeAgo(m.createdAt, bn)}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => toggleMessage(m)}
                        className="rounded-lg border-2 border-[#1a140d]/12 bg-white p-2 text-[#6b6250] transition hover:border-[#1a140d] hover:text-[#1a140d]"
                        title={m.read ? "Mark unread" : "Mark read"}
                      >
                        {m.read ? <MailOpen size={14} /> : <Mail size={14} />}
                      </button>
                      <a
                        href={`mailto:${m.email}?subject=Re: your message`}
                        className="rounded-lg border-2 border-[#1a140d]/12 bg-white p-2 text-[#6b6250] transition hover:border-[#1a140d] hover:text-[#1a140d]"
                        title="Reply by email"
                      >
                        <Reply size={14} />
                      </a>
                      <button
                        onClick={() => removeMessage(m.id)}
                        className="rounded-lg border-2 border-[#1a140d]/12 bg-white p-2 text-[#6b6250]/50 transition hover:border-[#d2202c]/40 hover:bg-[#d2202c]/10 hover:text-[#d2202c]"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </header>
                  <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-[#1a140d]/70">{m.body}</p>
                </article>
              ))
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
