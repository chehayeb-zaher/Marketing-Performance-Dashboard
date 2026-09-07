import { SOURCE_ALIASES } from "@/config/sourceAliases";
import { UNATTRIBUTED_SOURCE } from "./constants";

export { UNATTRIBUTED_SOURCE };

export function sourceKey(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Applies the source precedence rule: opportunity source, then contact source, then
 * null (meaning "Unattributed"). Returns the winning *raw* (trimmed) string, not yet
 * canonicalized - canonicalization needs to see all winning sources across the dataset
 * first so it can group case/spacing variants together.
 */
export function resolveWinningRawSource(
  opportunitySource: string | null | undefined,
  contactSource: string | null | undefined,
): string | null {
  const opportunityTrimmed = (opportunitySource ?? "").trim();
  if (opportunityTrimmed) return opportunityTrimmed;

  const contactTrimmed = (contactSource ?? "").trim();
  if (contactTrimmed) return contactTrimmed;

  return null;
}

/**
 * Builds a canonical display name for each distinct (trimmed, lowercase) source key seen
 * in the dataset. A manual alias (src/config/sourceAliases.ts) wins if one exists;
 * otherwise the most frequently occurring raw casing/spacing variant for that key is used,
 * so well-formatted source names (e.g. "LinkedIn Outreach") aren't mangled by a naive
 * title-case transform when the data is already consistent. Ties break alphabetically for
 * determinism.
 */
export function buildSourceCanonicalMap(winningRawSources: string[]): Map<string, string> {
  const variantCounts = new Map<string, Map<string, number>>();

  for (const raw of winningRawSources) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = sourceKey(trimmed);
    const variants = variantCounts.get(key) ?? new Map<string, number>();
    variants.set(trimmed, (variants.get(trimmed) ?? 0) + 1);
    variantCounts.set(key, variants);
  }

  const canonical = new Map<string, string>();
  for (const [key, variants] of variantCounts) {
    const alias = SOURCE_ALIASES[key];
    if (alias) {
      canonical.set(key, alias);
      continue;
    }

    let best: string | null = null;
    let bestCount = -1;
    for (const [variant, count] of variants) {
      if (count > bestCount || (count === bestCount && best !== null && variant < best)) {
        best = variant;
        bestCount = count;
      }
    }
    canonical.set(key, best as string);
  }

  return canonical;
}

/** Resolves the final canonical, display-ready source name for one record. */
export function resolveCanonicalSource(
  winningRawSource: string | null,
  canonicalMap: Map<string, string>,
): string {
  if (!winningRawSource) return UNATTRIBUTED_SOURCE;
  const key = sourceKey(winningRawSource);
  return SOURCE_ALIASES[key] ?? canonicalMap.get(key) ?? winningRawSource;
}
