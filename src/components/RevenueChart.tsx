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
        title="Closed Revenue by Source"
        description="Sum of won opportunities' value by source. Open and lost opportunities are not counted."
      />
      {data.length === 0 ? (
        <EmptyState message="No won opportunities were found for the selected date range." />
      ) : (
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
              <CartesianGrid horizontal={false} stroke="var(--gridline)" />
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
      )}
    </Card>
  );
}
