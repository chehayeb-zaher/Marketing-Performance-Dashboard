"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import type { StageDistribution } from "@/lib/domain/dashboardTypes";
import { colorForSource } from "@/lib/domain/colors";
import { formatNumber } from "@/lib/ui/format";
import { Card, SectionHeading } from "./ui/Card";
import { EmptyState } from "./ui/States";
import { SourceLegend } from "./ui/SourceLegend";

const CHART_HEIGHT_PER_STAGE = 44;
const CHART_BASE_HEIGHT = 60;

export function PipelineDistributionSection({
  distribution,
  colorMap,
}: {
  distribution: StageDistribution;
  colorMap: Map<string, string>;
}) {
  const chartData = distribution.stages.map((stage) => ({
    stageName: stage.stageName,
    total: stage.total,
    ...stage.bySource,
  }));

  const height = CHART_BASE_HEIGHT + distribution.stages.length * CHART_HEIGHT_PER_STAGE;

  return (
    <Card className="p-5">
      <SectionHeading
        title="Where Leads Currently Sit in the Pipeline"
        description="Every included lead's current stage, broken down by source. Stage order matches the pipeline exactly as configured in GoHighLevel."
      />

      {distribution.grandTotal === 0 ? (
        <EmptyState message="No valid leads were found for the selected date range." />
      ) : (
        <>
          <SourceLegend sources={distribution.sources} colorMap={colorMap} />
          <div className="overflow-x-auto">
            <div style={{ minWidth: 640 }}>
              <BarChart
                width={720}
                height={height}
                data={chartData}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                accessibilityLayer
              >
                <CartesianGrid horizontal={false} stroke="var(--gridline)" />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fill: "var(--ink-secondary)", fontSize: 12 }}
                  stroke="var(--axis-line)"
                  label={{ value: "Opportunities", position: "insideBottom", offset: -4, fill: "var(--ink-secondary)" }}
                />
                <YAxis
                  type="category"
                  dataKey="stageName"
                  tick={{ fill: "var(--ink-secondary)", fontSize: 12 }}
                  stroke="var(--axis-line)"
                  width={130}
                />
                <Tooltip cursor={{ fill: "rgba(11,11,11,0.04)" }} formatter={(value) => formatNumber(Number(value ?? 0))} />
                {distribution.sources.map((source) => (
                  <Bar
                    key={source}
                    dataKey={source}
                    name={source}
                    stackId="stage"
                    fill={colorForSource(source, colorMap)}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </div>
          </div>

          <StageDistributionTable distribution={distribution} />
        </>
      )}
    </Card>
  );
}

function StageDistributionTable({ distribution }: { distribution: StageDistribution }) {
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <caption className="sr-only">Lead count by pipeline stage and source</caption>
        <thead>
          <tr className="border-b border-black/[.1] text-left text-ink-secondary">
            <th scope="col" className="py-2 pr-4 font-medium">
              Stage
            </th>
            {distribution.sources.map((source) => (
              <th key={source} scope="col" className="py-2 px-3 text-right font-medium whitespace-nowrap">
                {source}
              </th>
            ))}
            <th scope="col" className="py-2 pl-3 text-right font-semibold">
              Stage total
            </th>
          </tr>
        </thead>
        <tbody>
          {distribution.stages.map((stage) => (
            <tr key={stage.stageId} className="border-b border-black/[.05]">
              <th scope="row" className="py-2 pr-4 text-left font-medium text-ink whitespace-nowrap">
                {stage.stageName}
              </th>
              {distribution.sources.map((source) => (
                <td key={source} className="py-2 px-3 text-right tabular-nums text-ink-secondary">
                  {formatNumber(stage.bySource[source] ?? 0)}
                </td>
              ))}
              <td className="py-2 pl-3 text-right font-semibold tabular-nums text-ink">
                {formatNumber(stage.total)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className="py-2 pr-4 text-left font-semibold text-ink">
              Total
            </th>
            {distribution.sources.map((source) => (
              <td key={source} className="py-2 px-3 text-right font-semibold tabular-nums text-ink">
                {formatNumber(distribution.stages.reduce((sum, s) => sum + (s.bySource[source] ?? 0), 0))}
              </td>
            ))}
            <td className="py-2 pl-3 text-right font-bold tabular-nums text-ink">
              {formatNumber(distribution.grandTotal)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
