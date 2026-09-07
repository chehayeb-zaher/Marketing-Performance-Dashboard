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

  // A full /contacts/{id} fetch is only needed when the opportunity's own `source` is
  // blank (contact.source is the fallback) or the embedded contact summary is entirely
  // missing (need its tags for cleaning). Every opportunities/search result already
  // embeds contact.tags, so most opportunities need no extra request at all - this is
  // the difference between ~3 GHL requests and ~1 per lead for pipelines with hundreds
  // of opportunities, which otherwise risks hitting GHL's 100-req/10s rate limit and the
  // hosting platform's function timeout.
  const contactIdsNeedingFetch = rawOpportunities
    .filter((o) => o.contactId && (o.contact === undefined || !(o.source && o.source.trim())))
    .map((o) => o.contactId as string);
  const contactsById = await getContactsByIds(contactIdsNeedingFetch);

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
