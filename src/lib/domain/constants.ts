/** Contact tags that exclude an opportunity from the dashboard, matched case-insensitively. */
export const EXCLUSION_TAGS = [
  "demo-data",
  "sandbox",
  "internal",
  "backdate-test",
  "dq - duplicate",
] as const;

/**
 * A tag that must NOT trigger exclusion on its own. If a contact has this tag alongside
 * an actual exclusion tag, the exclusion tag still wins (the opportunity is excluded).
 */
export const DASH_PROJECT_TAG = "dash-project";

export const UNATTRIBUTED_SOURCE = "Unattributed";

export const WON_STATUS = "won";

/**
 * An "open" opportunity is flagged as stale if its stage-change timestamp (or the
 * dateUpdated proxy, when no real stage-change timestamp is available) is older than
 * this many days. There's no threshold specified in the brief; 14 days matches a
 * typical sales follow-up cadence and is surfaced in the data-quality methodology note
 * so the agency owner can see and question the assumption.
 */
export const STALE_OPEN_THRESHOLD_DAYS = 14;
