import "server-only";
import { getPipelineByName, getPipelineById, getOrderedStages } from "../ghl/pipelines";
import { getAllOpportunities } from "../ghl/opportunities";
import { getContactsByIds } from "../ghl/contacts";
import { getGhlEnv } from "../ghl/env";
import { toUtcInstantRange, type ReportDateRange } from "../reportDateRange";
import { transformAndClean } from "./transform";
import {
  computeLeadVolumeBySource,
  computeStageDistribution,
  computeConversionBySource,
  computeRevenueBySource,
  computeSourceSummary,
} from "./aggregate";
import type { Stage } from "./types";
import type { DashboardData } from "./dashboardTypes";

const DEFAULT_PIPELINE_NAME = "Sales Pipeline";

export interface BuildDashboardParams {
  range: ReportDateRange;
  pipelineId?: string;
}

/**
 * End-to-end server-side pipeline: fetch pipeline/stages/opportunities/contacts from GHL,
 * clean and normalize, then aggregate. Returns only aggregated, PII-free data - never
 * raw opportunity/contact records.
 */
export async function buildDashboardData(params: BuildDashboardParams): Promise<DashboardData> {
  const env = getGhlEnv();

  const pipeline = params.pipelineId
    ? await getPipelineById(params.pipelineId)
    : await getPipelineByName(DEFAULT_PIPELINE_NAME);

  const orderedStages = getOrderedStages(pipeline);
  const stages: Stage[] = orderedStages.map((s, idx) => ({
    id: s.id,
    name: s.name,
    order: s.position ?? idx,
  }));
  const knownStageIds = new Set(stages.map((s) => s.id));

  const utcRange = toUtcInstantRange(params.range, env.REPORT_TIMEZONE);
  const rawOpportunities = await getAllOpportunities(pipeline.id, utcRange);

  const contactIds = rawOpportunities.map((o) => o.contactId).filter((id): id is string => Boolean(id));
  const contactsById = await getContactsByIds(contactIds);

  const { included, dataQuality } = transformAndClean(rawOpportunities, contactsById, knownStageIds);

  return {
    meta: {
      pipeline: { id: pipeline.id, name: pipeline.name },
      stages,
      range: {
        start: params.range.start,
        endExclusive: params.range.endExclusive,
        timezone: env.REPORT_TIMEZONE,
      },
      generatedAt: new Date().toISOString(),
    },
    leadVolumeBySource: computeLeadVolumeBySource(included),
    stageDistribution: computeStageDistribution(included, stages),
    conversionBySource: computeConversionBySource(included, stages),
    revenueBySource: computeRevenueBySource(included),
    sourceSummary: computeSourceSummary(included),
    dataQuality,
  };
}
