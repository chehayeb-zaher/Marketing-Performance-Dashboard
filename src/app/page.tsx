"use client";

import { useMemo, useState } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import {
  DEFAULT_REPORT_RANGE,
  exclusiveEndToInclusiveDate,
  inclusiveDateToExclusiveEnd,
} from "@/lib/reportDateRange";
import { buildSourceColorMap } from "@/lib/domain/colors";
import { DashboardHeader, type DateRangeInclusive } from "@/components/DashboardHeader";
import { LeadVolumeChart } from "@/components/LeadVolumeChart";
import { PipelineDistributionSection } from "@/components/PipelineDistributionSection";
import { ConversionSection } from "@/components/ConversionSection";
import { RevenueChart } from "@/components/RevenueChart";
import { SourceSummaryTable } from "@/components/SourceSummaryTable";
import { Section } from "@/components/ui/Card";
import { LoadingState, ErrorState } from "@/components/ui/States";

const DEFAULT_RANGE: DateRangeInclusive = {
  start: DEFAULT_REPORT_RANGE.start,
  endInclusive: exclusiveEndToInclusiveDate(DEFAULT_REPORT_RANGE.endExclusive),
};

export default function DashboardPage() {
  const [range, setRange] = useState<DateRangeInclusive>(DEFAULT_RANGE);

  const apiEnd = inclusiveDateToExclusiveEnd(range.endInclusive);
  const { data, error, isLoading, isValidating, refresh } = useDashboardData({
    start: range.start,
    end: apiEnd,
  });

  const colorMap = useMemo(() => {
    if (!data) return new Map<string, string>();
    return buildSourceColorMap(data.stageDistribution.sources);
  }, [data]);

  const sourceOrder = useMemo(() => data?.leadVolumeBySource.map((s) => s.source) ?? [], [data]);

  const isDefaultRange = range.start === DEFAULT_RANGE.start && range.endInclusive === DEFAULT_RANGE.endInclusive;

  const status = error && data ? "stale-error" : isLoading ? "loading" : "live";

  return (
    <div className="min-h-full flex flex-col">
      <DashboardHeader
        pipelineName={data?.meta.pipeline.name}
        range={range}
        onRangeChange={setRange}
        onResetDefault={() => setRange(DEFAULT_RANGE)}
        isDefaultRange={isDefaultRange}
        status={status}
        lastUpdatedIso={data?.meta.generatedAt}
        isValidating={isValidating}
        onRefresh={refresh}
        errorMessage={error?.message}
      />

      <main className="flex-1">
        {!data && isLoading && (
          <Section>
            <LoadingState />
          </Section>
        )}

        {!data && error && (
          <Section>
            <ErrorState message={error.message} onRetry={refresh} />
          </Section>
        )}

        {data && (
          <>
            <Section className="pb-0">
              <LeadVolumeChart data={data.leadVolumeBySource} colorMap={colorMap} />
            </Section>

            <Section className="pb-0">
              <PipelineDistributionSection distribution={data.stageDistribution} colorMap={colorMap} />
            </Section>

            <Section className="pb-0">
              <ConversionSection
                conversionBySource={data.conversionBySource}
                colorMap={colorMap}
                sourceOrder={sourceOrder}
              />
            </Section>

            <Section className="pb-0">
              <RevenueChart data={data.revenueBySource} colorMap={colorMap} />
            </Section>

            <Section>
              <SourceSummaryTable rows={data.sourceSummary} />
            </Section>
          </>
        )}
      </main>
    </div>
  );
}
