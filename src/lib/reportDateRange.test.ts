import { describe, it, expect } from "vitest";
import {
  zonedMidnightToUtcIso,
  toUtcInstantRange,
  DEFAULT_REPORT_RANGE,
  exclusiveEndToInclusiveDate,
  inclusiveDateToExclusiveEnd,
} from "./reportDateRange";

describe("zonedMidnightToUtcIso", () => {
  it("converts UTC midnight directly", () => {
    expect(zonedMidnightToUtcIso("2026-07-01", "UTC")).toBe("2026-07-01T00:00:00.000Z");
  });

  it("converts a non-UTC timezone to the correct UTC instant", () => {
    // America/New_York is UTC-4 in July (EDT).
    expect(zonedMidnightToUtcIso("2026-07-01", "America/New_York")).toBe("2026-07-01T04:00:00.000Z");
  });

  it("handles a timezone ahead of UTC", () => {
    // Asia/Tokyo is UTC+9, no DST.
    expect(zonedMidnightToUtcIso("2026-07-01", "Asia/Tokyo")).toBe("2026-06-30T15:00:00.000Z");
  });
});

describe("toUtcInstantRange", () => {
  it("implements the end boundary as exclusive per the default range", () => {
    const range = toUtcInstantRange(DEFAULT_REPORT_RANGE, "UTC");
    expect(range.startIso).toBe("2026-07-01T00:00:00.000Z");
    expect(range.endIsoExclusive).toBe("2026-10-01T00:00:00.000Z");
  });

  it("start is strictly before end", () => {
    const range = toUtcInstantRange(DEFAULT_REPORT_RANGE, "America/Los_Angeles");
    expect(Date.parse(range.startIso)).toBeLessThan(Date.parse(range.endIsoExclusive));
  });
});

describe("exclusive/inclusive end-date conversion", () => {
  it("converts the default exclusive end to the human-facing inclusive date", () => {
    expect(exclusiveEndToInclusiveDate("2026-10-01")).toBe("2026-09-30");
  });

  it("round-trips inclusive -> exclusive -> inclusive", () => {
    const inclusive = "2026-09-30";
    const exclusive = inclusiveDateToExclusiveEnd(inclusive);
    expect(exclusive).toBe("2026-10-01");
    expect(exclusiveEndToInclusiveDate(exclusive)).toBe(inclusive);
  });

  it("handles month/year rollover", () => {
    expect(exclusiveEndToInclusiveDate("2027-01-01")).toBe("2026-12-31");
    expect(inclusiveDateToExclusiveEnd("2026-12-31")).toBe("2027-01-01");
  });
});
