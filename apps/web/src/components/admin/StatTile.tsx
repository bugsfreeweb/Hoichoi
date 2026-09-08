export function StatTile({ label, value, accent }: { label: string; value: number; accent?: string }) {
  const bar = accent ?? "cat-blue";
  return (
    <div className="border border-ink/20 bg-paper-deep p-5">
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-2 font-grotesk text-4xl font-bold text-ink">{value.toLocaleString("bn")}</p>
      <div className={`mt-3 h-1 w-8 ${bar === "cat-teal" ? "bg-cat-teal" : bar === "alizarin" ? "bg-alizarin" : bar === "amberx" ? "bg-amberx" : "bg-cat-blue"}`} />
    </div>
  );
}