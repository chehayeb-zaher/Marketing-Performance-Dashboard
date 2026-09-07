"use client";

import { FunnelChart, Funnel, LabelList, Tooltip, ResponsiveContainer } from "recharts";
import type { ConversionStep } from "@/lib/domain/dashboardTypes";
import { colorForSource } from "@/lib/domain/colors";
import { formatNumber, formatPercent } from "@/lib/ui/format";
import { Card, SectionHeading } from "./ui/Card";
import { EmptyState } from "./ui/States";

const FUNNEL_HEIGHT = 280;

export function ConversionSection({
  conversionBySource,
  colorMap,
  sourceOrder,
}: {
  conversionBySource: Record<string, ConversionStep[]>;
  colorMap: Map<string, string>;
  /** Stable display order for sources (lead-volume descending), consistent with other sections. */
  sourceOrder: string[];
}) {
  const sources = sourceOrder.filter((s) => conversionBySource[s]);

  return (
    <Card className="p-5">
      <SectionHeading
        title="Stage-to-Stage Conversion by Source"
        description={
          "Each funnel infers which stages a lead has reached from its CURRENT position in the pipeline " +
          "(a lead sitting at stage 4 is counted as having reached stages 1–4). This is an inference based on " +
          "current stage, not tracked stage-by-stage history."
        }
      />

      {sources.length === 0 ? (
        <EmptyState message="No valid leads were found for the selected date range." />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {sources.map((source) => (
              <SourceFunnel
                key={source}
                source={source}
                steps={conversionBySource[source]}
                color={colorForSource(source, colorMap)}
              />
            ))}
          </div>

          <ConversionComparisonTable conversionBySource={conversionBySource} sources={sources} />
        </>
      )}
    </Card>
  );
}

function SourceFunnel({ source, steps, color }: { source: string; steps: ConversionStep[]; color: string }) {
  const data = steps.map((step) => ({
    name: step.stageName,
    value: step.reached,
    pct: step.conversionFromPrevPct,
  }));

  return (
    <div className="rounded-lg border border-black/[.08] p-3">
      <h3 className="mb-2 text-sm font-semibold text-ink truncate" title={source}>
        {source}
      </h3>
      <ResponsiveContainer width="100%" height={FUNNEL_HEIGHT}>
        <FunnelChart accessibilityLayer margin={{ top: 8, right: 96, bottom: 8, left: 8 }}>
          <Tooltip
            formatter={(value, _name, item) => {
              const pct = (item?.payload as { pct: number | null } | undefined)?.pct ?? null;
              return [`${formatNumber(Number(value ?? 0))} reached (${formatPercent(pct)} from previous)`, ""];
            }}
          />
          <Funnel dataKey="value" data={data} isAnimationActive={false} fill={color} stroke="var(--surface-1)" strokeWidth={2}>
            <LabelList
              position="right"
              dataKey="name"
              fill="var(--ink-secondary)"
              stroke="none"
              fontSize={11}
            />
            <LabelList position="center" dataKey="value" fill="#fff" stroke="none" fontSize={11} fontWeight={600} />
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    </div>
  );
}

function ConversionComparisonTable({
  conversionBySource,
  sources,
}: {
  conversionBySource: Record<string, ConversionStep[]>;
  sources: string[];
}) {
  const stageNames = conversionBySource[sources[0]]?.map((s) => s.stageName) ?? [];
  const transitions = stageNames.slice(1).map((name, i) => ({ from: stageNames[i], to: name, index: i + 1 }));

  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full min-w-[840px] border-collapse text-sm">
        <caption className="sr-only">Stage-to-stage conversion percentage by source</caption>
        <thead>
          <tr className="border-b border-black/[.1] text-left text-ink-secondary">
            <th scope="col" className="py-2 pr-4 font-medium sticky left-0 bg-surface-1">
              Source
            </th>
            {transitions.map((t) => (
              <th key={t.index} scope="col" className="py-2 px-3 text-right font-medium whitespace-nowrap">
                {t.from} → {t.to}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sources.map((source) => (
            <tr key={source} className="border-b border-black/[.05]">
              <th scope="row" className="py-2 pr-4 text-left font-medium text-ink whitespace-nowrap sticky left-0 bg-surface-1">
                {source}
              </th>
              {conversionBySource[source].slice(1).map((step, i) => (
                <td key={i} className="py-2 px-3 text-right tabular-nums text-ink-secondary">
                  {formatPercent(step.conversionFromPrevPct)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
