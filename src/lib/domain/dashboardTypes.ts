/**
 * Client-safe type definitions mirroring the /api/dashboard response shape.
 * Deliberately has no runtime imports from server-only modules (ghl/*, buildDashboard.ts)
 * so it can be imported from client components without pulling in anything server-only.
 */
import type { SourceCount, StageDistribution, ConversionStep, SourceRevenue, SourceSummaryRow } from "./aggregate";
import type { Stage, DataQualitySummary } from "./types";

export interface DashboardMeta {
  pipeline: { id: string; name: string };
  stages: Stage[];
  range: { start: string; endExclusive: string; timezone: string };
  generatedAt: string;
}

export interface DashboardData {
  meta: DashboardMeta;
  leadVolumeBySource: SourceCount[];
  stageDistribution: StageDistribution;
  conversionBySource: Record<string, ConversionStep[]>;
  revenueBySource: SourceRevenue[];
  sourceSummary: SourceSummaryRow[];
  dataQuality: DataQualitySummary;
}

export type { SourceCount, StageDistribution, ConversionStep, SourceRevenue, SourceSummaryRow, Stage, DataQualitySummary };
