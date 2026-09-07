/**
 * Converts a wall-clock calendar date (as entered by the user, e.g. "2026-07-01") in an
 * arbitrary IANA timezone into the equivalent UTC instant. Used to turn REPORT_TIMEZONE +
 * a YYYY-MM-DD date into the ISO instant boundaries the GHL API expects.
 *
 * Implemented with Intl.DateTimeFormat rather than a timezone library so no extra
 * dependency is needed beyond what's already in the project.
 */
function getTimeZoneOffsetMs(timeZone: string, instant: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = dtf.formatToParts(instant);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }

  const asIfUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );

  return asIfUtc - instant.getTime();
}

/** Returns the UTC ISO instant for local midnight of `dateStr` (YYYY-MM-DD) in `timeZone`. */
export function zonedMidnightToUtcIso(dateStr: string, timeZone: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error(`Invalid date "${dateStr}" - expected YYYY-MM-DD`);
  }

  const naiveUtc = Date.UTC(year, month - 1, day, 0, 0, 0);

  // Two passes handles DST-transition edge cases: the offset can shift once we get
  // close to the real instant, so we refine using the first pass's result.
  let offset = getTimeZoneOffsetMs(timeZone, new Date(naiveUtc));
  let instant = naiveUtc - offset;
  offset = getTimeZoneOffsetMs(timeZone, new Date(instant));
  instant = naiveUtc - offset;

  return new Date(instant).toISOString();
}

export interface ReportDateRange {
  /** Inclusive start date, YYYY-MM-DD, in REPORT_TIMEZONE wall-clock terms. */
  start: string;
  /** Exclusive end date, YYYY-MM-DD, in REPORT_TIMEZONE wall-clock terms. */
  endExclusive: string;
}

export interface UtcInstantRange {
  startIso: string;
  endIsoExclusive: string;
}

export const DEFAULT_REPORT_RANGE: ReportDateRange = {
  start: "2026-07-01",
  endExclusive: "2026-10-01",
};

/** Converts a {start, endExclusive} calendar-date range into UTC instant boundaries. */
export function toUtcInstantRange(range: ReportDateRange, timeZone: string): UtcInstantRange {
  return {
    startIso: zonedMidnightToUtcIso(range.start, timeZone),
    endIsoExclusive: zonedMidnightToUtcIso(range.endExclusive, timeZone),
  };
}

/**
 * The UI shows an inclusive end date (e.g. "Sep 30") since that's how a non-technical
 * owner thinks about a reporting period; internally (and in the API) the end boundary
 * is exclusive (e.g. "Oct 1"). These convert between the two representations.
 */
export function exclusiveEndToInclusiveDate(endExclusive: string): string {
  const [year, month, day] = endExclusive.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function inclusiveDateToExclusiveEnd(endInclusive: string): string {
  const [year, month, day] = endInclusive.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
