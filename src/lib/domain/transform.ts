import type { GhlOpportunity, GhlContact } from "../ghl/schemas";
import type { NormalizedOpportunity, ExclusionRecord, DataQualitySummary } from "./types";
import { matchedExclusionTags } from "./cleaning";
import { parseMonetaryValue } from "./money";
import {
  resolveWinningRawSource,
  buildSourceCanonicalMap,
  resolveCanonicalSource,
  UNATTRIBUTED_SOURCE,
} from "./sourceNormalization";
import { STALE_OPEN_THRESHOLD_DAYS } from "./constants";

export interface TransformResult {
  included: NormalizedOpportunity[];
  excluded: ExclusionRecord[];
  dataQuality: DataQualitySummary;
}

/**
 * Cleans, normalizes, and flags every raw opportunity. Exclusion is tag-based only
 * (never inferred from contact names). An opportunity whose current stage id isn't one
 * of the pipeline's known stages is also excluded (defensively) so that "every stage
 * total sums to total included leads" always holds even against unexpected API data.
 */
export function transformAndClean(
  rawOpportunities: GhlOpportunity[],
  contactsById: Map<string, GhlContact>,
  knownStageIds: Set<string>,
  now: Date = new Date(),
): TransformResult {
  const excluded: ExclusionRecord[] = [];
  const passed: { raw: GhlOpportunity; contact: GhlContact | undefined }[] = [];

  let missingContactCount = 0;
  let unknownStageExcludedCount = 0;

  for (const raw of rawOpportunities) {
    const contact = raw.contactId ? contactsById.get(raw.contactId) : undefined;
    if (!contact) missingContactCount += 1;

    const reasons: string[] = [];

    const matchedTags = matchedExclusionTags(contact?.tags ?? []);
    if (matchedTags.length > 0) {
      reasons.push(...matchedTags.map((tag) => `excluded tag: ${tag}`));
    }

    const stageId = raw.pipelineStageId ?? "";
    if (!knownStageIds.has(stageId)) {
      reasons.push("missing/invalid pipeline stage");
      unknownStageExcludedCount += 1;
    }

    if (reasons.length > 0) {
      excluded.push({ opportunityId: raw.id, reasons });
      continue;
    }

    passed.push({ raw, contact });
  }

  const winningRawSources = passed
    .map(({ raw, contact }) => resolveWinningRawSource(raw.source, contact?.source))
    .filter((s): s is string => s !== null);
  const canonicalMap = buildSourceCanonicalMap(winningRawSources);

  let invalidMonetaryValueCount = 0;
  let unattributedCount = 0;
  let staleOpenCount = 0;
  let staleUsingProxyCount = 0;
  const staleThresholdMs = STALE_OPEN_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;

  const included: NormalizedOpportunity[] = passed.map(({ raw, contact }) => {
    const winningRaw = resolveWinningRawSource(raw.source, contact?.source);
    const source = resolveCanonicalSource(winningRaw, canonicalMap);
    if (source === UNATTRIBUTED_SOURCE) unattributedCount += 1;

    const { value: monetaryValue, wasInvalid } = parseMonetaryValue(raw.monetaryValue);
    if (wasInvalid) invalidMonetaryValueCount += 1;

    const stageChangeIsProxy = !raw.lastStageChangeAt;
    const stageChangeTimestamp = raw.lastStageChangeAt ?? raw.updatedAt ?? null;

    let isStaleOpen = false;
    if (raw.status === "open" && stageChangeTimestamp) {
      const ageMs = now.getTime() - Date.parse(stageChangeTimestamp);
      if (Number.isFinite(ageMs) && ageMs > staleThresholdMs) {
        isStaleOpen = true;
        if (stageChangeIsProxy) staleUsingProxyCount += 1;
      }
    }
    if (isStaleOpen) staleOpenCount += 1;

    return {
      id: raw.id,
      contactId: raw.contactId ?? null,
      stageId: raw.pipelineStageId ?? "",
      status: raw.status ?? "unknown",
      source,
      monetaryValue,
      monetaryValueWasInvalid: wasInvalid,
      createdAt: raw.createdAt ?? null,
      stageChangeTimestamp,
      stageChangeIsProxy,
      isStaleOpen,
    };
  });

  const excludedByReason: Record<string, number> = {};
  for (const record of excluded) {
    for (const reason of record.reasons) {
      excludedByReason[reason] = (excludedByReason[reason] ?? 0) + 1;
    }
  }

  const dataQuality: DataQualitySummary = {
    totalFetched: rawOpportunities.length,
    includedCount: included.length,
    excludedCount: excluded.length,
    excludedByReason,
    unattributedCount,
    invalidMonetaryValueCount,
    staleOpenCount,
    staleUsingProxyCount,
    staleThresholdDays: STALE_OPEN_THRESHOLD_DAYS,
    missingContactCount,
    unknownStageExcludedCount,
  };

  return { included, excluded, dataQuality };
}
