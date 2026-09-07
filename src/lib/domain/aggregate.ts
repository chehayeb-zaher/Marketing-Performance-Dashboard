import type { NormalizedOpportunity, Stage } from "./types";
import { WON_STATUS } from "./constants";

export interface SourceCount {
  source: string;
  count: number;
}

/** Lead volume by source, sorted numerically descending (ties broken alphabetically). */
export function computeLeadVolumeBySource(opportunities: NormalizedOpportunity[]): SourceCount[] {
  const counts = new Map<string, number>();
  for (const o of opportunities) counts.set(o.source, (counts.get(o.source) ?? 0) + 1);

  return [...counts.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source));
}

export interface StageDistributionStage {
  stageId: string;
  stageName: string;
  order: number;
  bySource: Record<string, number>;
  total: number;
}

export interface StageDistribution {
  /** Sources ordered by overall lead volume descending - use this order for stable chart colors/legends. */
  sources: string[];
  stages: StageDistributionStage[];
  grandTotal: number;
}

/** Stage x source distribution. Every opportunity is counted in exactly one stage bucket. */
export function computeStageDistribution(
  opportunities: NormalizedOpportunity[],
  stages: Stage[],
): StageDistribution {
  const sources = computeLeadVolumeBySource(opportunities).map((s) => s.source);
  const orderedStages = stages.slice().sort((a, b) => a.order - b.order);

  const buckets = new Map<string, Map<string, number>>();
  for (const stage of orderedStages) buckets.set(stage.id, new Map());

  for (const o of opportunities) {
    const bucket = buckets.get(o.stageId);
    if (!bucket) continue; // unknown stages are excluded upstream during cleaning
    bucket.set(o.source, (bucket.get(o.source) ?? 0) + 1);
  }

  const stageRows: StageDistributionStage[] = orderedStages.map((stage) => {
    const bucket = buckets.get(stage.id) ?? new Map<string, number>();
    const bySource: Record<string, number> = {};
    let total = 0;
    for (const source of sources) {
      const count = bucket.get(source) ?? 0;
      bySource[source] = count;
      total += count;
    }
    return { stageId: stage.id, stageName: stage.name, order: stage.order, bySource, total };
  });

  const grandTotal = stageRows.reduce((sum, s) => sum + s.total, 0);

  return { sources, stages: stageRows, grandTotal };
}

export interface ConversionStep {
  stageId: string;
  stageName: string;
  order: number;
  /** Count inferred to have reached this stage, based on current stage position. */
  reached: number;
  /** Percent converted from the previous stage's reached count, or null (N/A) if that count was zero. */
  conversionFromPrevPct: number | null;
}

/**
 * Stage-to-stage conversion per source, inferred from each opportunity's *current*
 * pipeline position: an opportunity at stage index N is treated as having reached stages
 * 0..N. This is an inference, not real stage-history tracking, and is labeled as such in
 * the UI. `reached` is non-increasing by construction as stage index grows.
 */
export function computeConversionBySource(
  opportunities: NormalizedOpportunity[],
  stages: Stage[],
): Record<string, ConversionStep[]> {
  const orderedStages = stages.slice().sort((a, b) => a.order - b.order);
  const stageIndexById = new Map(orderedStages.map((stage, index) => [stage.id, index]));

  const bySource = new Map<string, NormalizedOpportunity[]>();
  for (const o of opportunities) {
    const list = bySource.get(o.source) ?? [];
    list.push(o);
    bySource.set(o.source, list);
  }

  const result: Record<string, ConversionStep[]> = {};
  for (const [source, opps] of bySource) {
    const reached = orderedStages.map((_, idx) =>
      opps.filter((o) => {
        const currentIdx = stageIndexById.get(o.stageId);
        return currentIdx !== undefined && currentIdx >= idx;
      }).length,
    );

    result[source] = orderedStages.map((stage, idx) => ({
      stageId: stage.id,
      stageName: stage.name,
      order: stage.order,
      reached: reached[idx],
      conversionFromPrevPct:
        idx === 0 ? null : reached[idx - 1] === 0 ? null : (reached[idx] / reached[idx - 1]) * 100,
    }));
  }

  return result;
}

export interface SourceRevenue {
  source: string;
  revenue: number;
}

/** Closed revenue by source: only status === "won" opportunities count. Sorted numerically descending. */
export function computeRevenueBySource(opportunities: NormalizedOpportunity[]): SourceRevenue[] {
  const revenue = new Map<string, number>();
  for (const o of opportunities) {
    if (o.status !== WON_STATUS) continue;
    revenue.set(o.source, (revenue.get(o.source) ?? 0) + o.monetaryValue);
  }

  return [...revenue.entries()]
    .map(([source, total]) => ({ source, revenue: total }))
    .sort((a, b) => b.revenue - a.revenue || a.source.localeCompare(b.source));
}

export interface SourceSummaryRow {
  source: string;
  leads: number;
  won: number;
  leadToWonRatePct: number;
  closedRevenue: number;
  avgWonValue: number | null;
}

export function computeSourceSummary(opportunities: NormalizedOpportunity[]): SourceSummaryRow[] {
  const bySource = new Map<string, NormalizedOpportunity[]>();
  for (const o of opportunities) {
    const list = bySource.get(o.source) ?? [];
    list.push(o);
    bySource.set(o.source, list);
  }

  const rows: SourceSummaryRow[] = [];
  for (const [source, opps] of bySource) {
    const leads = opps.length;
    const wonOpps = opps.filter((o) => o.status === WON_STATUS);
    const won = wonOpps.length;
    const closedRevenue = wonOpps.reduce((sum, o) => sum + o.monetaryValue, 0);

    rows.push({
      source,
      leads,
      won,
      leadToWonRatePct: leads > 0 ? (won / leads) * 100 : 0,
      closedRevenue,
      avgWonValue: won > 0 ? closedRevenue / won : null,
    });
  }

  return rows.sort((a, b) => b.leads - a.leads || a.source.localeCompare(b.source));
}
