"use client";

import { FunnelChart, Funnel, LabelList, Tooltip, ResponsiveContainer } from "recharts";
import type { ConversionStep } from "@/lib/domain/dashboardTypes";
import { colorForSource } from "@/lib/domain/colors";
import { formatNumber, formatPercent } from "@/lib/ui/format";
import { Card, SectionHeading } from "./ui/Card";
import { EmptyState } from "./ui/States";

const FUNNEL_HEIGHT = 280;
// Extra horizontal gap between the widest part of the funnel and where the stage-name
// label starts, so the label doesn't feel like it's touching the shape.
const LABEL_OFFSET = 18;

/** Renders the stage name as a single line (never wrapped), offset right of the funnel edge. */
function FunnelStageLabel(props: {
  x?: string | number;
  y?: string | number;
  width?: string | number;
  height?: string | number;
  value?: unknown;
}) {
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0);
  const width = Number(props.width ?? 0);
  const height = Number(props.height ?? 0);
  return (
    <text
      x={x + width + LABEL_OFFSET}
      y={y + height / 2}
      dy={4}
      fontSize={11}
      fill="var(--ink-secondary)"
      textAnchor="start"
    >
      {props.value as string}
    </text>
  );
}

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
        title="Stage-to-Stage Conversion"
        description="Each funnel infers stages reached from a lead's CURRENT position."
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

// Floor a segment's visual width at this fraction of the funnel's widest stage so the
// smallest counts (often the last stage) aren't tapered down to an unreadable sliver -
// the true value is still shown by the label, only the shape's width is padded.
const MIN_SEGMENT_WIDTH_FRACTION = 0.16;

function SourceFunnel({ source, steps, color }: { source: string; steps: ConversionStep[]; color: string }) {
  const maxReached = Math.max(...steps.map((step) => step.reached), 1);
  const data = steps.map((step) => ({
    name: step.stageName,
    value: step.reached,
    displayWidth: Math.max(step.reached, maxReached * MIN_SEGMENT_WIDTH_FRACTION),
    pct: step.conversionFromPrevPct,
  }));

  return (
    <div className="rounded-lg border border-black/[.08] p-3">
      <h3 className="mb-2 text-sm font-semibold text-ink truncate" title={source}>
        {source}
      </h3>
      <ResponsiveContainer width="100%" height={FUNNEL_HEIGHT}>
        <FunnelChart accessibilityLayer margin={{ top: 8, right: 150, bottom: 8, left: 8 }}>
          <Tooltip
            formatter={(_value, _name, item) => {
              const payload = item?.payload as { value: number; pct: number | null } | undefined;
              return [
                `${formatNumber(payload?.value ?? 0)} reached (${formatPercent(payload?.pct ?? null)} from previous)`,
                "",
              ];
            }}
          />
          <Funnel dataKey="displayWidth" data={data} isAnimationActive={false} fill={color} stroke="var(--surface-1)" strokeWidth={2}>
            <LabelList position="right" dataKey="name" content={FunnelStageLabel} />
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
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">Stage-to-stage conversion percentage by source</caption>
        <colgroup>
          <col className="w-32" />
          {transitions.map((t) => (
            <col key={t.index} className="min-w-[92px]" />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b border-black/[.1] text-ink-secondary">
            <th scope="col" className="py-2 pr-2 text-left font-medium sticky left-0 bg-surface-1">
              Source
            </th>
            {transitions.map((t) => (
              <th key={t.index} scope="col" className="py-2 px-1 text-center font-medium leading-tight break-words">
                {t.from}
                <br />→ {t.to}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sources.map((source) => (
            <tr key={source} className="border-b border-black/[.05]">
              <th scope="row" className="py-2 pr-2 text-left font-medium text-ink leading-tight sticky left-0 bg-surface-1">
                {source}
              </th>
              {conversionBySource[source].slice(1).map((step, i) => (
                <td key={i} className="py-2 px-1 text-center tabular-nums text-ink-secondary">
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
