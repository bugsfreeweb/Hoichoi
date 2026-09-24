import { useMemo, useState, useEffect } from "react";
import { Pause, Play, Plus, Radio, Search, Trash2, TriangleAlert, Inbox, RefreshCw } from "lucide-react";
import { agoBn, toBn } from "../lib/format";
import {
  deskAddSource,
  deskRemoveSource,
  deskToggleSource,
  deskCategories,
  deskSourceErrors,
  deskSourceErrorSet,
  type DeskSource,
  type DeskSourceError,
} from "../lib/tauri";
import { getRunEnv } from "../lib/vault";

const KIND_BN: Record<string, string> = { page: "পেজ", group: "গ্রুপ" };
const STATUS_BN: Record<string, string> = {
  watching: "পর্যবেক্ষণ",
  paused: "বিরতি",
  error: "ত্রুটি",
};

function fbUrl(fbId: string): string {
  const t = fbId.trim();
  if (/^https?:\/\//.test(t)) return t;
  if (/^\d+$/.test(t)) return `https://facebook.com/profile.php?id=${t}`;
  return `https://facebook.com/${t}`;
}

export default function Watchlist({
  sources,
  refresh,
}: {
  sources: DeskSource[];
  refresh: () => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | "page" | "group">("all");
  const [form, setForm] = useState({
    name: "",
    fbId: "",
    kind: "page" as "page" | "group",
    categories: [] as string[],
    allCategories: false,
  });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [categories, setCategories] = useState<Array<{ slug: string; displayNameBn: string; displayNameEn: string }>>([]);

  useEffect(() => {
    (async () => {
      try {
        const env = await getRunEnv();
        const cats = await deskCategories(env);
        setCategories(cats);
      } catch {
        /* ignore */
      }
    })();
    void loadErrors();
  }, []);

  const [sourceErrors, setSourceErrors] = useState<DeskSourceError[]>([]);
  const [errBusy, setErrBusy] = useState(false);

  const loadErrors = async () => {
    setErrBusy(true);
    try {
      const errs = await deskSourceErrors(await getRunEnv());
      setSourceErrors(errs.filter((e) => e.status === "open"));
    } catch {
      /* ignore */
    } finally {
      setErrBusy(false);
    }
  };

  const ignoreError = async (e: DeskSourceError) => {
    setErrBusy(true);
    try {
      const src = sources.find((s) => s.id === e.source_id);
      await deskSourceErrorSet(await getRunEnv(), e.id, "dismiss");
      if (src && (!src.is_active || src.health === 0)) {
        await deskToggleSource(await getRunEnv(), src.id).catch(() => {});
      }
      await refresh();
      await loadErrors();
    } catch {
      /* ignore */
    } finally {
      setErrBusy(false);
    }
  };

  const shown = useMemo(
    () =>
      sources.filter((s) => {
        const matchQ =
          q.trim() === "" ||
          s.page_name.toLowerCase().includes(q.trim().toLowerCase()) ||
          String(s.fb_id ?? "").toLowerCase().includes(q.trim().toLowerCase());
        const matchK = kind === "all" || s.kind === kind;
        return matchQ && matchK;
      }),
    [sources, q, kind],
  );

  const toggle = async (s: DeskSource) => {
    setBusy(s.id);
    setErr(null);
    try {
      await deskToggleSource(await getRunEnv(), s.id);
      await refresh();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (s: DeskSource) => {
    if (!window.confirm(`সোর্স " ${s.page_name} " মুছে ফেলবেন? পরের স্ক্র্যাপে আর দেখা হবে না।`)) return;
    setBusy(s.id);
    setErr(null);
    try {
      await deskRemoveSource(await getRunEnv(), s.id);
      await refresh();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(null);
    }
  };

  const add = async () => {
    if (!form.name.trim() || !form.fbId.trim()) return;
    setErr(null);
    const target =
      form.allCategories && categories.length
        ? categories.map((c) => c.slug)
        : form.categories.length
          ? form.categories
          : categories.length
            ? [categories[0].slug]
            : [];
    try {
      await deskAddSource(await getRunEnv(), {
        pageUrl: fbUrl(form.fbId),
        pageName: form.name.trim(),
        kind: form.kind,
        categories: target,
        fbId: form.fbId.trim(),
        topics: "নতুন",
      });
      setForm({ name: "", fbId: "", kind: "page", categories: [], allCategories: false });
      setOpen(false);
      await refresh();
    } catch (e) {
      setErr(String(e));
    }
  };

  function toggleCategory(slug: string) {
    setForm((f) => ({
      ...f,
      allCategories: false,
      categories: f.categories.includes(slug)
        ? f.categories.filter((c) => c !== slug)
        : [...f.categories, slug],
    }));
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--ds-bd)] px-5 py-3.5">
        <p className="font-serif-bn text-[17px] font-bold text-[var(--ds-t1)]">ওয়াচলিস্ট</p>
        <span className="font-mono-x text-[9.5px] tracking-[0.2em] text-[var(--ds-t5)] uppercase">
          PUBLIC PAGES · GROUPS · GRAPH READ
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-[var(--ds-bd-2)] bg-[var(--ds-kb)] px-3 py-1.5">
            <Search size={12} className="text-[var(--ds-t4)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="পেজ / হ্যান্ডেল…"
              className="w-40 bg-transparent text-[12px] text-[var(--ds-t1)] outline-none placeholder:text-[var(--ds-t5)]"
            />
          </div>
          {(["all", "page", "group"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-medium ${
                kind === k
                  ? "bg-[var(--ds-active)] text-[var(--ds-active-tx)]"
                  : "text-[var(--ds-t4)] hover:bg-[var(--ds-kb8)]"
              }`}
            >
              {k === "all" ? "সব" : KIND_BN[k]}
            </button>
          ))}
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--ds-acc)] px-3 py-1.5 text-[11.5px] font-bold text-[var(--ds-active-tx)]"
          >
            <Plus size={13} /> সোর্স
          </button>
        </div>
      </div>

      {err && (
        <div className="border-b border-[var(--ds-bd)] bg-[var(--ds-rose-soft)] px-5 py-2 text-[11.5px] font-semibold text-[var(--ds-rose)]">
          ✕ {err}
        </div>
      )}

      {sourceErrors.length > 0 && (
        <div className="border-b border-[var(--ds-bd)] bg-[var(--ds-amber-soft)] px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="flex items-center gap-1.5 text-[12.5px] font-bold text-[var(--ds-amber)]">
              <Inbox size={13} /> সোর্স ত্রুটি ইনবক্স
              <span className="rounded-full bg-[var(--ds-amber-soft)] px-2 py-0.5 font-mono-x text-[10px] text-[var(--ds-amber)] ring-1 ring-[var(--ds-amber)]/30">
                {toBn(sourceErrors.length)}
              </span>
            </p>
            <button
              onClick={() => void loadErrors()}
              disabled={errBusy}
              className="ml-auto flex items-center gap-1.5 rounded-lg border border-[var(--ds-bd-2)] px-2.5 py-1 text-[10.5px] font-semibold text-[var(--ds-t3)]"
            >
              <RefreshCw size={11} className={errBusy ? "animate-spin" : ""} /> পুনরায় লোড
            </button>
          </div>
          <ul className="mt-2 space-y-1.5">
            {sourceErrors.map((e) => {
              const src = sources.find((s) => s.id === e.source_id);
              return (
                <li
                  key={e.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--ds-bd-2)] bg-[var(--ds-field)] px-3 py-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-semibold text-[var(--ds-t1)]">
                      {src?.page_name ?? e.source_id}
                    </span>
                    <span className="block truncate font-mono-x text-[10px] text-[var(--ds-rose)]">
                      {e.err_kind}: {e.message}
                    </span>
                    <span className="block font-mono-x text-[9.5px] text-[var(--ds-t5)]">
                      {toBn(e.count)}× · {agoBn(e.last_seen_at)}
                    </span>
                  </span>
                  <button
                    onClick={() => void ignoreError(e)}
                    disabled={errBusy}
                    className="rounded-lg bg-[var(--ds-rose-soft)] px-2.5 py-1 text-[10.5px] font-bold text-[var(--ds-rose)]"
                  >
                    সূচিকে ফিরিয়ে দিন
                  </button>
                  <button
                    onClick={async () => {
                      setErrBusy(true);
                      try {
                        await deskSourceErrorSet(await getRunEnv(), e.id, "dismiss");
                        await loadErrors();
                      } finally {
                        setErrBusy(false);
                      }
                    }}
                    disabled={errBusy}
                    className="rounded-lg border border-[var(--ds-bd-2)] px-2.5 py-1 text-[10.5px] font-semibold text-[var(--ds-t4)]"
                  >
                    উপেক্ষা করুন
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--ds-t5)]">
            scrape ব্যর্থ হলে সোর্সের হেলথ শূন্য হয় এবং এখানে ত্রুটি জমা হয়। সব ঠিক হলে রান শেষে
            সোর্সের ত্রুটিগুলো নিজে থেকে মুছে যায়।
          </p>
        </div>
      )}

      {open && (
        <div className="grid gap-2 border-b border-[var(--ds-bd)] bg-[var(--ds-kb)] px-5 py-3 sm:grid-cols-4">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="পেজের নাম"
            className="rounded-lg border border-[var(--ds-bd-2)] bg-[var(--ds-field)] px-3 py-2 text-[12px] text-[var(--ds-t1)] outline-none"
          />
          <input
            value={form.fbId}
            onChange={(e) => setForm({ ...form, fbId: e.target.value })}
            placeholder="Facebook ID / URL"
            className="rounded-lg border border-[var(--ds-bd-2)] bg-[var(--ds-field)] px-3 py-2 font-mono-x text-[12px] text-[var(--ds-t1)] outline-none"
          />
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--ds-bd-2)] bg-[var(--ds-field)] px-3 py-2">
            {categories.map((c) => (
              <button
                key={c.slug}
                onClick={() => toggleCategory(c.slug)}
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                  form.categories.includes(c.slug) || form.allCategories
                    ? "bg-[var(--ds-acc-soft)] text-[var(--ds-acc)]"
                    : "text-[var(--ds-t4)] hover:bg-[var(--ds-kb8)]"
                }`}
              >
                {c.displayNameBn}
              </button>
            ))}
            <label className="flex cursor-pointer items-center gap-1.5 text-[10.5px] font-bold text-[var(--ds-t2)]">
              <input
                type="checkbox"
                checked={form.allCategories}
                onChange={(e) => setForm((f) => ({ ...f, allCategories: e.target.checked, categories: [] }))}
                className="accent-[var(--ds-acc)]"
              />
              সব বিভাগ
            </label>
          </div>
          <select
            value={form.kind}
            onChange={(e) => setForm({ ...form, kind: e.target.value as "page" | "group" })}
            className="rounded-lg border border-[var(--ds-bd-2)] bg-[var(--ds-field)] px-3 py-2 text-[12px] text-[var(--ds-t1)] outline-none"
          >
            <option value="page">পেজ</option>
            <option value="group">গ্রুপ</option>
          </select>
          <button onClick={() => void add()} className="rounded-lg bg-[var(--ds-acc)] text-[12px] font-bold text-[var(--ds-active-tx)]">
            ওয়াচলিস্টে যোগ
          </button>
        </div>
      )}

      <div className="scroll-slim flex-1 overflow-auto">
        <table className="w-full min-w-[860px] text-left">
          <thead>
            <tr className="font-mono-x text-[9.5px] tracking-[0.18em] text-[var(--ds-t5)] uppercase">
              <th className="px-5 py-3 font-medium">সোর্স</th>
              <th className="px-3 py-3 font-medium">ধরন</th>
              <th className="px-3 py-3 font-medium">বিষয়</th>
              <th className="px-3 py-3 font-medium">শেষ চেক</th>
              <th className="px-3 py-3 font-medium">আজ</th>
              <th className="px-3 py-3 font-medium">হেলথ</th>
              <th className="px-5 py-3 text-right font-medium">স্ট্যাটাস</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--ds-row)]">
            {shown.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-14 text-center text-[12.5px] text-[var(--ds-t5)]">
                  কোনো সোর্স মিললো না — ফিল্টার বদলান বা নতুন সোর্স যোগ করুন।
                </td>
              </tr>
            )}
            {shown.map((s) => {
              const isError = s.health === 0;
              const st = isError ? "error" : s.is_active ? "watching" : "paused";
              const slugs = [...new Set(s.categories.length ? s.categories : s.category ? [s.category] : [])];
              const catName = (slug: string) =>
                categories.find((c) => c.slug === slug)?.displayNameBn ?? slug;
              return (
                <tr key={s.id} className="group hover:bg-[var(--ds-kb)]">
                  <td className="px-5 py-3.5">
                    <p className="text-[13px] font-semibold text-[var(--ds-t1)]">{s.page_name}</p>
                    <p className="font-mono-x text-[10px] text-[var(--ds-t5)]">
                      {s.fb_id ?? s.page_url}
                    </p>
                    {slugs.length > 0 && (
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {slugs.map((slug) => (
                          <span
                            key={slug}
                            className="rounded-full border border-[var(--ds-bd-2)] px-1.5 py-0.5 font-mono-x text-[8.5px] tracking-wide text-[var(--ds-t4)]"
                          >
                            {catName(slug)}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3.5 text-[12px] text-[var(--ds-t3)]">
                    {KIND_BN[s.kind]}
                  </td>
                  <td className="px-3 py-3.5 text-[11.5px] text-[var(--ds-t4)]">
                    {s.topics.length ? s.topics.join(", ") : "—"}
                  </td>
                  <td className="px-3 py-3.5 font-mono-x text-[11px] text-[var(--ds-t4)]">
                    {agoBn(s.last_scraped_at)}
                  </td>
                  <td className="px-3 py-3.5 font-mono-x text-[12px] text-[var(--ds-t2)]">
                    {toBn(s.posts_today)}
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="h-1 w-16 overflow-hidden rounded-full bg-[var(--ds-kb10)]">
                        <span
                          className={`block h-full ${
                            s.health > 80
                              ? "bg-[var(--ds-acc)]"
                              : s.health > 50
                                ? "bg-[var(--ds-amber)]"
                                : "bg-[var(--ds-rose)]"
                          }`}
                          style={{ width: `${Math.max(0, Math.min(100, s.health))}%` }}
                        />
                      </span>
                      <span className="font-mono-x text-[10px] text-[var(--ds-t4)]">
                        {toBn(s.health)}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      {st === "error" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ds-rose-soft)] px-2 py-1 text-[10px] font-semibold text-[var(--ds-rose)]">
                          <TriangleAlert size={10} /> {STATUS_BN.error}
                        </span>
                      )}
                      {st !== "error" && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${
                            st === "watching"
                              ? "bg-[var(--ds-acc-soft)] text-[var(--ds-acc)]"
                              : "bg-[var(--ds-kb10)] text-[var(--ds-t4)]"
                          }`}
                        >
                          <Radio size={10} /> {STATUS_BN[st]}
                        </span>
                      )}
                      <button
                        onClick={() => void toggle(s)}
                        disabled={busy === s.id || isError}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--ds-bd-2)] text-[var(--ds-t3)] hover:text-[var(--ds-t1)] disabled:opacity-40"
                        title={st === "watching" ? "বিরতি" : "চালু"}
                      >
                        {st === "watching" ? <Pause size={11} /> : <Play size={11} />}
                      </button>
                      <button
                        onClick={() => void remove(s)}
                        disabled={busy === s.id}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--ds-bd-2)] text-[var(--ds-t3)] hover:border-[var(--ds-rose-bd)] hover:text-[var(--ds-rose)] disabled:opacity-40"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}