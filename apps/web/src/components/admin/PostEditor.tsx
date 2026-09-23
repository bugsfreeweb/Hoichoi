"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Post, PostStatus, CaseStatus, CategorySlug } from "@hoichoi/shared-types";

const CATEGORY_LABELS: Record<CategorySlug, string> = {
  "child-sexual-abuse": "শিশু যৌন নির্যাতন",
  "extramarital-crime": "অবৈধ সম্পর্ক ও ব্ল্যাকমেইল",
  "missing-children": "নিখোঁজ শিশু",
};

interface CatOption {
  slug: CategorySlug;
  label: string;
}

const CASE_LABELS: Array<{ value: CaseStatus; label: string }> = [
  { value: "active", label: "চলমান (active)" },
  { value: "found", label: "উদ্ধার (found)" },
  { value: "unresolved", label: "অমীমাংসিত (unresolved)" },
  { value: "false-alarm", label: "ভুয়া খবর (false-alarm)" },
  { value: "unknown", label: "অজানা (unknown)" },
];

const STATUS_LABELS: Record<PostStatus, string> = {
  pending_review: "⏳ pending_review",
  approved: "🟦 approved",
  rejected: "❌ rejected",
  published: "🟢 published (দৃশ্যমান)",
  removed: "⚪ removed (লুকানো)",
};

const field =
  "mt-1 w-full border border-ink/30 bg-paper px-3 py-2 text-[13px] focus:outline-none";
const btnPrimary =
  "border-2 border-ink bg-ink px-6 py-2.5 text-[13px] font-bold text-paper transition hover:bg-alizarin disabled:opacity-50";
const btnLime =
  "border-2 border-ink bg-lime px-4 py-2.5 text-[13px] font-bold text-ink transition hover:bg-paper disabled:opacity-50";
const btnGhost =
  "border border-ink/40 px-4 py-2.5 text-[13px] font-bold text-ink transition hover:border-alizarin hover:text-alizarin disabled:opacity-50";

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function PostEditor({ post }: { post: Post }) {
  const router = useRouter();
  const [title, setTitle] = useState(post.title_bn);
  const [body, setBody] = useState(post.body_bn);
  const [summary, setSummary] = useState(post.summary_bn ?? "");
  const [category, setCategory] = useState<CategorySlug>(post.category);
  const [caseStatus, setCaseStatus] = useState<CaseStatus | "">(post.case_status ?? "");
  const [publishedAt, setPublishedAt] = useState(toLocalInput(post.published_at));
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [catOptions, setCatOptions] = useState<CatOption[] | null>(null);

  // Dynamic categories come from the config table so admins can recategorize a
  // post into any custom section, not just the three built-in slugs.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/categories", { cache: "no-store" });
        const j = (await res.json()) as {
          categories?: Array<{ slug: string; display_name_bn: string }>;
        };
        const opts = (j.categories ?? []).map((c) => ({
          slug: c.slug as CategorySlug,
          label: CATEGORY_LABELS[c.slug as CategorySlug] ?? c.display_name_bn ?? c.slug,
        }));
        if (!opts.some((o) => o.slug === post.category)) {
          opts.unshift({
            slug: post.category,
            label: CATEGORY_LABELS[post.category] ?? post.category,
          });
        }
        setCatOptions(opts);
      } catch {
        setCatOptions([
          { slug: post.category, label: CATEGORY_LABELS[post.category] ?? post.category },
        ]);
      }
    })();
  }, [post.category]);

  const save = async () => {
    setBusy("save");
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title_bn: title,
          body_bn: body,
          summary_bn: summary,
          category,
          case_status: caseStatus || null,
          published_at: fromLocalInput(publishedAt),
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? `HTTP ${res.status}`);
      }
      window.location.reload();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(null);
    }
  };

  const toggleVisible = async () => {
    const next: PostStatus = post.status === "published" ? "removed" : "published";
    setBusy(`tog-${next}`);
    setErr(null);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMsg(next === "published" ? "পোস্টটি এখন পাবলিক দেখা যাবে।" : "পোস্টটি লুকানো হলো।");
      window.location.reload();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(null);
    }
  };

  const destroy = async () => {
    if (!window.confirm("পোস্টটি স্থায়ীভাবে মুছে ফেলবেন? একবার মুছলে ফেরানো যাবে না।")) return;
    setBusy("delete");
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      router.replace("/admin/posts");
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono-x text-[10px] tracking-[0.24em] text-alizarin uppercase">✏️ POST EDITOR</p>
          <h1 className="mt-1 max-w-xl font-serif-bn text-[28px] font-black leading-tight text-ink">{post.title_bn}</h1>
        </div>
        <span className="rounded-full border border-ink/20 bg-paper-deep px-3 py-1 font-mono-x text-[10px] font-bold uppercase tracking-wide text-ink-soft">
          {STATUS_LABELS[post.status]}
        </span>
      </div>

      <p className="mt-2 font-mono-x text-[11px] text-ink-soft">
        slug: <span className="text-ink">{post.slug}</span> · শিরোনাম বদলালেও URL অপরিবর্তিত থাকে।
      </p>

      {msg && <p className="mt-4 border border-cat-teal bg-cat-teal/10 px-3 py-2 text-[12.5px] font-bold text-ink">✓ {msg}</p>}
      {err && <p className="mt-4 border border-alizarin bg-alizarin/10 px-3 py-2 text-[12.5px] font-bold text-ink">✕ {err}</p>}

      <div className="mt-5 space-y-4 border border-ink/20 bg-paper-deep p-5">
        <Field label="শিরোনাম (title_bn)">
          <textarea className={field} rows={2} value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>

        <Field label="বিবরণ / বডি (body_bn)">
          <textarea className={field} rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>

        <Field label="সারাংশ (summary_bn — খালি = নেই)">
          <textarea className={field} rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="ক্যাটাগরি">
            <select className={field} value={category} onChange={(e) => setCategory(e.target.value as CategorySlug)}>
              {(catOptions ?? [{ slug: post.category, label: CATEGORY_LABELS[post.category] ?? post.category }]).map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="কেস স্ট্যাটাস">
            <select className={field} value={caseStatus} onChange={(e) => setCaseStatus(e.target.value as CaseStatus | "")}>
              <option value="">— নেই —</option>
              {CASE_LABELS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="প্রকাশের তারিখ/সময়">
            <input
              className={field}
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
            />
          </Field>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button className={btnPrimary} onClick={() => void save()} disabled={busy !== null}>
          💾 সংরক্ষণ (save)
        </button>
        <button className={btnLime} onClick={() => void toggleVisible()} disabled={busy !== null}>
          {post.status === "published" ? "🙈 লুকাও (hide)" : "👁 দেখাও (show/publish)"}
        </button>
        <button className={btnGhost} onClick={() => void destroy()} disabled={busy !== null}>
          🗑 মুছে ফেল (delete)
        </button>
        <button className={`${btnGhost} ml-auto`} onClick={() => router.push("/admin/posts")}>
          ← সব পোস্ট
        </button>
      </div>
      {busy === "save" && <p className="mt-3 font-mono-x text-[11px] text-ink-soft">সংরক্ষণ হচ্ছে…</p>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">{label}</span>
      {children}
    </label>
  );
}