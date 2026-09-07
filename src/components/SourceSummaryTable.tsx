"use client";

import { useMemo, useState } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import type { SourceSummaryRow } from "@/lib/domain/dashboardTypes";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/ui/format";
import { Card, SectionHeading } from "./ui/Card";
import { EmptyState } from "./ui/States";

type SortKey = keyof Pick<
  SourceSummaryRow,
  "source" | "leads" | "won" | "leadToWonRatePct" | "closedRevenue" | "avgWonValue"
>;

const COLUMNS: { key: SortKey; label: string; align: "left" | "right" }[] = [
  { key: "source", label: "Source", align: "left" },
  { key: "leads", label: "Leads", align: "right" },
  { key: "won", label: "Won opportunities", align: "right" },
  { key: "leadToWonRatePct", label: "Lead-to-won rate", align: "right" },
  { key: "closedRevenue", label: "Closed revenue", align: "right" },
  { key: "avgWonValue", label: "Avg. won value", align: "right" },
];

export function SourceSummaryTable({ rows }: { rows: SourceSummaryRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("leads");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const aNum = av === null ? -Infinity : av;
      const bNum = bv === null ? -Infinity : bv;
      if (typeof aNum === "string" || typeof bNum === "string") {
        return sortDir === "asc"
          ? String(aNum).localeCompare(String(bNum))
          : String(bNum).localeCompare(String(aNum));
      }
      return sortDir === "asc" ? (aNum as number) - (bNum as number) : (bNum as number) - (aNum as number);
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <Card className="p-5">
      <SectionHeading
        title="Source Performance Summary"
        description="Click a column heading to sort. Cost-per-lead and ROAS aren't shown - advertising-spend data isn't available in GoHighLevel."
      />
      {rows.length === 0 ? (
        <EmptyState message="No valid leads were found for the selected date range." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <caption className="sr-only">Source performance summary, sortable by column</caption>
            <thead>
              <tr className="border-b border-black/[.1] text-ink-secondary">
                {COLUMNS.map((col) => (
                  <th key={col.key} scope="col" className={`py-2 px-3 font-medium ${col.align === "right" ? "text-right" : "text-left"}`}>
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={`inline-flex items-center gap-1 hover:text-ink ${col.align === "right" ? "flex-row-reverse" : ""}`}
                      aria-label={`Sort by ${col.label}`}
                    >
                      {col.label}
                      <SortIcon active={sortKey === col.key} dir={sortDir} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.source} className="border-b border-black/[.05]">
                  <th scope="row" className="py-2 px-3 text-left font-medium text-ink whitespace-nowrap">
                    {row.source}
                  </th>
                  <td className="py-2 px-3 text-right tabular-nums text-ink-secondary">{formatNumber(row.leads)}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-ink-secondary">{formatNumber(row.won)}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-ink-secondary">
                    {formatPercent(row.leadToWonRatePct, 1)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-ink-secondary">
                    {formatCurrency(row.closedRevenue)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-ink-secondary">
                    {row.avgWonValue === null ? "N/A" : formatCurrency(row.avgWonValue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ArrowUpDown className="h-3.5 w-3.5 text-ink-muted" aria-hidden="true" />;
  return dir === "asc" ? (
    <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
  ) : (
    <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
  );
}
