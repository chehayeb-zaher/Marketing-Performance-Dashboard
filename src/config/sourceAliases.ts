/**
 * Manual source alias overrides.
 *
 * The dashboard normally groups sources by trimming whitespace and comparing
 * case-insensitively, then picks whichever raw casing/spacing variant occurs most often
 * in the data as the display label. Add an entry here ONLY when that isn't good enough -
 * e.g. two genuinely different-looking strings ("fb ad", "facebook") refer to the same
 * real-world lead source and should be shown under one canonical name.
 *
 * Key: the raw source string, trimmed and lowercased, exactly as it appears in GHL.
 * Value: the canonical display name to show throughout the dashboard.
 *
 * Do NOT use this file to merge genuinely different sources into a combined bucket
 * (e.g. do not map "Referral" and "Webinar" to the same name) - every distinct source
 * must stay separately visible and comparable per the dashboard requirements.
 *
 * Example:
 *   "fb ad": "Facebook Ad",
 *   "facebook": "Facebook Ad",
 *   "ig dm": "Instagram DM",
 */
export const SOURCE_ALIASES: Record<string, string> = {
  // No aliases currently needed for this location's data.
  // Add entries here if new spelling/casing variants of an existing source show up.
};
