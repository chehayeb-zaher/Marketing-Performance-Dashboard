import { EXCLUSION_TAGS } from "./constants";

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

/**
 * Returns which of the fixed exclusion tags a contact carries (case-insensitively).
 * "dash-project" is intentionally never in EXCLUSION_TAGS, so it never appears here even
 * when present alongside a real exclusion tag - exclusion is driven solely by the actual
 * exclusion tags found, which is what makes "exclusion wins" the natural outcome.
 */
export function matchedExclusionTags(tags: string[]): string[] {
  const normalized = new Set(tags.map(normalizeTag));
  return EXCLUSION_TAGS.filter((exclusionTag) => normalized.has(exclusionTag));
}

export function isExcludedByTags(tags: string[]): boolean {
  return matchedExclusionTags(tags).length > 0;
}
