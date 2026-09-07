export interface Stage {
  id: string;
  name: string;
  /** Zero-based order as returned/positioned by the GHL API - never hardcoded. */
  order: number;
}

/**
 * An opportunity after cleaning, source resolution, and monetary/timestamp normalization.
 * Contains no PII - safe to aggregate and safe if it ever needed to be returned as-is.
 */
export interface NormalizedOpportunity {
  id: string;
  contactId: string | null;
  stageId: string;
  status: string;
  source: string;
  monetaryValue: number;
  monetaryValueWasInvalid: boolean;
  createdAt: string | null;
  stageChangeTimestamp: string | null;
  /** True if lastStageChangeAt was unavailable and updatedAt was used as a proxy. */
  stageChangeIsProxy: boolean;
  isStaleOpen: boolean;
}

export interface ExclusionRecord {
  opportunityId: string;
  reasons: string[];
}

export interface DataQualitySummary {
  totalFetched: number;
  includedCount: number;
  excludedCount: number;
  excludedByReason: Record<string, number>;
  unattributedCount: number;
  invalidMonetaryValueCount: number;
  staleOpenCount: number;
  staleUsingProxyCount: number;
  staleThresholdDays: number;
  missingContactCount: number;
  unknownStageExcludedCount: number;
}
