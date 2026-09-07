"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList } from "recharts";
import type { SourceRevenue } from "@/lib/domain/dashboardTypes";
import { colorForSource } from "@/lib/domain/colors";
import { formatCurrency } from "@/lib/ui/format";
import { Card, SectionHeading } from "./ui/Card";
import { EmptyState } from "./ui/States";

const ROW_HEIGHT = 40;
const BASE_HEIGHT = 40;

export function RevenueChart({
  data,
  colorMap,
}: {
  data: SourceRevenue[];
  colorMap: Map<string, string>;
}) {
  const height = BASE_HEIGHT + data.length * ROW_HEIGHT;

  return (
    <Card className="p-5">
      <SectionHeading
        title="Closed Revenue"
        description="Sum of won opportunities' value by source. Open and lost opportunities are not counted."
      />
      {data.length === 0 ? (
        <EmptyState message="No won opportunities were found for the selected date range." />
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-12">
          <div className="overflow-x-auto">
            <div style={{ minWidth: 560 }}>
              <BarChart
                width={720}
                height={height}
                data={data}
                layout="vertical"
                margin={{ top: 8, right: 48, left: 8, bottom: 8 }}
                accessibilityLayer
              >
                <CartesianGrid horizontal={false} stroke="var(--gridline)" strokeOpacity={0.5} />
                <XAxis
                  type="number"
                  tick={{ fill: "var(--ink-secondary)", fontSize: 12 }}
                  stroke="var(--axis-line)"
                  tickFormatter={(v: number) => formatCurrency(v)}
                />
                <YAxis
                  type="category"
                  dataKey="source"
                  tick={{ fill: "var(--ink-secondary)", fontSize: 12 }}
                  stroke="var(--axis-line)"
                  width={130}
                />
                <Tooltip
                  cursor={{ fill: "rgba(11,11,11,0.04)" }}
                  formatter={(value) => [formatCurrency(Number(value ?? 0)), "Closed revenue"]}
                />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                  {data.map((entry) => (
                    <Cell key={entry.source} fill={colorForSource(entry.source, colorMap)} />
                  ))}
                  <LabelList
                    dataKey="revenue"
                    position="right"
                    formatter={(v) => formatCurrency(Number(v ?? 0))}
                    fill="var(--ink-secondary)"
                    fontSize={12}
                  />
                </Bar>
              </BarChart>
            </div>
          </div>

          <RevenueTable data={data} colorMap={colorMap} />
        </div>
      )}
    </Card>
  );
}

function RevenueTable({ data, colorMap }: { data: SourceRevenue[]; colorMap: Map<string, string> }) {
  const total = data.reduce((sum, d) => sum + d.revenue, 0);

  return (
    <table className="lg:w-72 shrink-0 border-collapse text-sm self-start">
      <caption className="sr-only">Closed revenue by source</caption>
      <thead>
        <tr className="border-b border-black/[.1] text-ink-secondary">
          <th scope="col" className="py-1.5 text-left font-medium">
            Source
          </th>
          <th scope="col" className="py-1.5 text-center font-medium">
            Revenue
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-black/[.06]">
        {data.map((entry) => (
          <tr key={entry.source}>
            <td className="py-1.5">
              <span className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2.5 w-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: colorForSource(entry.source, colorMap) }}
                  aria-hidden="true"
                />
                <span className="truncate text-ink-secondary">{entry.source}</span>
              </span>
            </td>
            <td className="py-1.5 text-center font-semibold tabular-nums text-ink">
              {formatCurrency(entry.revenue)}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t border-black/[.1] font-semibold text-ink">
          <td className="pt-2">Total</td>
          <td className="pt-2 text-center tabular-nums">{formatCurrency(total)}</td>
        </tr>
      </tfoot>
    </table>
  );
}
