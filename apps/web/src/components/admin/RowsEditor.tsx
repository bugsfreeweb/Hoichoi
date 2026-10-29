"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

type Column = {
  key: string;
  label: string;
  placeholder?: string;
  type?: "text" | "color" | "select";
  width?: string;
  options?: { value: string; label: string }[];
};

export function RowsEditor({
  name,
  addLabel,
  max = 12,
  initial = [],
  columns,
}: {
  name: string;
  addLabel: string;
  max?: number;
  initial?: Record<string, string>[];
  columns: Column[];
}) {
  const [rows, setRows] = useState<Record<string, string>[]>(
    initial.length ? initial : [Object.fromEntries(columns.map((column) => [column.key, ""]))],
  );

  function update(index: number, key: string, value: string) {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
  }

  function add() {
    if (rows.length >= max) return;
    setRows((current) => [...current, Object.fromEntries(columns.map((column) => [column.key, ""]))]);
  }

  function remove(index: number) {
    setRows((current) => (current.length <= 1 ? current : current.filter((_, rowIndex) => rowIndex !== index)));
  }

  const serialized = rows
    .map((row) => columns.map((column) => row[column.key] ?? "").join(" | "))
    .join("\n");

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={serialized} />
      {rows.map((row, index) => (
        <div key={index} className="grid gap-2 border border-ink/12 bg-paper p-3 md:grid-cols-[repeat(auto-fit,minmax(120px,1fr))_auto]">
          {columns.map((column) => (
            <label key={column.key} className="block">
              <span className="field-label">{column.label}</span>
              {column.type === "color" ? (
                <input
                  type="color"
                  value={row[column.key] || "#d2202c"}
                  onChange={(event) => update(index, column.key, event.target.value)}
                  className="field !h-[42px] !p-1"
                />
              ) : column.type === "select" ? (
                <select
                  value={row[column.key] ?? ""}
                  onChange={(event) => update(index, column.key, event.target.value)}
                  className="field"
                >
                  {column.options?.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={row[column.key] ?? ""}
                  onChange={(event) => update(index, column.key, event.target.value)}
                  className="field"
                  placeholder={column.placeholder}
                />
              )}
            </label>
          ))}
          <button
            type="button"
            onClick={() => remove(index)}
            className="mt-5 flex h-10 w-10 items-center justify-center border border-alizarin/30 text-alizarin hover:bg-alizarin hover:text-white md:mt-0 md:self-end"
            aria-label="মুছুন"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        disabled={rows.length >= max}
        className="inline-flex items-center gap-1.5 border border-ink/20 px-3 py-2 text-[11.5px] font-bold text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus size={13} /> {addLabel}
      </button>
    </div>
  );
}