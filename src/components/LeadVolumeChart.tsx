"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import type { SourceCount } from "@/lib/domain/dashboardTypes";
import { colorForSource } from "@/lib/domain/colors";
import { formatNumber } from "@/lib/ui/format";
import { Card, SectionHeading } from "./ui/Card";
import { EmptyState } from "./ui/States";

const BAR_WIDTH = 72;
const CHART_HEIGHT = 340;

export function LeadVolumeChart({
  data,
  colorMap,
}: {
  data: SourceCount[];
  colorMap: Map<string, string>;
}) {
  return (
    <Card className="p-5">
      <SectionHeading
        title="Lead Volume by Source"
        description="Every source that produced a valid lead in the selected period, sorted highest to lowest."
      />
      {data.length === 0 ? (
        <EmptyState message="No valid leads were found for the selected date range." />
      ) : (
        <div className="overflow-x-auto">
          <div style={{ minWidth: Math.max(560, data.length * BAR_WIDTH) }}>
            <BarChart
              width={Math.max(560, data.length * BAR_WIDTH)}
              height={CHART_HEIGHT}
              data={data}
              margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
              accessibilityLayer
            >
              <CartesianGrid vertical={false} stroke="var(--gridline)" />
              <XAxis
                dataKey="source"
                tick={{ fill: "var(--ink-secondary)", fontSize: 12 }}
                stroke="var(--axis-line)"
                interval={0}
                angle={-30}
                textAnchor="end"
                height={70}
              />
              <YAxis
                tick={{ fill: "var(--ink-secondary)", fontSize: 12 }}
                stroke="var(--axis-line)"
                allowDecimals={false}
                label={{ value: "Leads", angle: -90, position: "insideLeft", fill: "var(--ink-secondary)" }}
              />
              <Tooltip
                cursor={{ fill: "rgba(11,11,11,0.04)" }}
                formatter={(value) => [formatNumber(Number(value ?? 0)), "Leads"]}
                labelFormatter={(label) => String(label ?? "")}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Leads" isAnimationActive={false}>
                {data.map((entry) => (
                  <Cell
                    key={entry.source}
                    fill={colorForSource(entry.source, colorMap)}
                    aria-label={`${entry.source}: ${entry.count} leads`}
                  />
                ))}
              </Bar>
            </BarChart>
          </div>
        </div>
      )}
    </Card>
  );
}
