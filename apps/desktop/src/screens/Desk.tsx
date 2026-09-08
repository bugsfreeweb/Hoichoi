import { useState } from "react";

const DEFAULT_URL = "http://localhost:3070/admin";

export default function Desk() {
  const [url, setUrl] = useState(DEFAULT_URL);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-ink/15 bg-paper-deep px-4 py-2">
        <input
          className="field flex-1 font-mono text-[12px]"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
        <button className="btn-ghost" onClick={() => setUrl(DEFAULT_URL)}>
          Reset
        </button>
      </div>
      <iframe src={url} className="flex-1 bg-white" title="Hoichoi web admin" />
    </div>
  );
}