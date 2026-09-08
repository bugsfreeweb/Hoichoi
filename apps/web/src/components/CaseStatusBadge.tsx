import type { CaseStatus } from "@hoichoi/shared-types";

const LABELS: Record<string, { text: string; cls: string }> = {
  active: { text: "সক্রিয় নিখোঁজ মামলা", cls: "bg-lime text-ink" },
  found: { text: "শিশু উদ্ধার হয়েছে", cls: "bg-lime text-ink" },
  unresolved: { text: "অমীমাংসিত", cls: "bg-amberx text-ink" },
  "false-alarm": { text: "ভিত্তিহীন / গুজব", cls: "bg-paper-deep text-ink-soft" },
  unknown: { text: "অবস্থা অজানা", cls: "bg-paper-deep text-ink-soft" },
};

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  const cfg = LABELS[status] ?? LABELS.unknown!;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide ${cfg.cls}`}>
      {cfg.text}
    </span>
  );
}