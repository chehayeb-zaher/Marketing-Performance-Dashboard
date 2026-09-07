import { describe, it, expect } from "vitest";
import {
  computeLeadVolumeBySource,
  computeStageDistribution,
  computeConversionBySource,
  computeRevenueBySource,
  computeSourceSummary,
} from "./aggregate";
import type { NormalizedOpportunity, Stage } from "./types";

const STAGES: Stage[] = [
  { id: "s0", name: "Qualified", order: 0 },
  { id: "s1", name: "Booked", order: 1 },
  { id: "s2", name: "Closed", order: 2 },
];

function o(overrides: Partial<NormalizedOpportunity> & { id: string }): NormalizedOpportunity {
  return {
    contactId: null,
    stageId: "s0",
    status: "open",
    source: "Referral",
    monetaryValue: 0,
    monetaryValueWasInvalid: false,
    createdAt: null,
    stageChangeTimestamp: null,
    stageChangeIsProxy: false,
    isStaleOpen: false,
    ...overrides,
  };
}

describe("computeLeadVolumeBySource", () => {
  it("sorts numerically descending, not alphabetically", () => {
    const opps = [
      o({ id: "1", source: "A" }),
      o({ id: "2", source: "B" }),
      o({ id: "3", source: "B" }),
      o({ id: "4", source: "B" }),
    ];
    const result = computeLeadVolumeBySource(opps);
    expect(result[0]).toEqual({ source: "B", count: 3 });
    expect(result[1]).toEqual({ source: "A", count: 1 });
  });

  it("total included leads equals the sum of source lead volume", () => {
    const opps = [
      o({ id: "1", source: "A" }),
      o({ id: "2", source: "B" }),
      o({ id: "3", source: "Unattributed" }),
    ];
    const result = computeLeadVolumeBySource(opps);
    const sum = result.reduce((s, r) => s + r.count, 0);
    expect(sum).toBe(opps.length);
  });

  it("retains Unattributed as its own source rather than dropping it", () => {
    const opps = [o({ id: "1", source: "Unattributed" })];
    const result = computeLeadVolumeBySource(opps);
    expect(result).toEqual([{ source: "Unattributed", count: 1 }]);
  });
});

describe("computeStageDistribution", () => {
  it("stage totals sum to total included lead volume", () => {
    const opps = [
      o({ id: "1", stageId: "s0", source: "A" }),
      o({ id: "2", stageId: "s1", source: "B" }),
      o({ id: "3", stageId: "s1", source: "A" }),
      o({ id: "4", stageId: "s2", source: "B" }),
    ];
    const dist = computeStageDistribution(opps, STAGES);
    expect(dist.grandTotal).toBe(opps.length);
    const sumOfStageTotals = dist.stages.reduce((s, stage) => s + stage.total, 0);
    expect(sumOfStageTotals).toBe(opps.length);
  });

  it("each opportunity is counted in exactly one stage", () => {
    const opps = [
      o({ id: "1", stageId: "s0", source: "A" }),
      o({ id: "2", stageId: "s2", source: "A" }),
    ];
    const dist = computeStageDistribution(opps, STAGES);
    // Sum across every stage x source cell equals the opportunity count exactly once each.
    let total = 0;
    for (const stage of dist.stages) {
      for (const source of dist.sources) {
        total += stage.bySource[source] ?? 0;
      }
    }
    expect(total).toBe(opps.length);
  });

  it("preserves stage order as given (API position order)", () => {
    const dist = computeStageDistribution([], STAGES);
    expect(dist.stages.map((s) => s.stageId)).toEqual(["s0", "s1", "s2"]);
  });
});

describe("computeConversionBySource", () => {
  it("cumulative reached values never increase at later stages", () => {
    const opps = [
      o({ id: "1", stageId: "s0", source: "A" }),
      o({ id: "2", stageId: "s1", source: "A" }),
      o({ id: "3", stageId: "s2", source: "A" }),
    ];
    const result = computeConversionBySource(opps, STAGES);
    const reachedValues = result["A"].map((step) => step.reached);
    for (let i = 1; i < reachedValues.length; i++) {
      expect(reachedValues[i]).toBeLessThanOrEqual(reachedValues[i - 1]);
    }
  });

  it("infers reached stages from current position (stage N implies stages 0..N reached)", () => {
    const opps = [o({ id: "1", stageId: "s2", source: "A" })];
    const result = computeConversionBySource(opps, STAGES);
    expect(result["A"].map((s) => s.reached)).toEqual([1, 1, 1]);
  });

  it("conversion values are between 0 and 100, or null (N/A) when the denominator is zero", () => {
    const opps = [
      o({ id: "1", stageId: "s0", source: "A" }),
      o({ id: "2", stageId: "s0", source: "A" }),
    ];
    const result = computeConversionBySource(opps, STAGES);
    for (const step of result["A"]) {
      if (step.conversionFromPrevPct !== null) {
        expect(step.conversionFromPrevPct).toBeGreaterThanOrEqual(0);
        expect(step.conversionFromPrevPct).toBeLessThanOrEqual(100);
      }
    }
    // Nobody reached stage 1 or 2, so conversion from s0->s1 must be N/A (reached[s0]=2, reached[s1]=0 -> 0%, defined)
    // but from s1->s2, reached[s1]=0 denominator -> N/A.
    expect(result["A"][2].conversionFromPrevPct).toBeNull();
  });

  it("first stage has no conversion-from-previous value", () => {
    const opps = [o({ id: "1", stageId: "s0", source: "A" })];
    const result = computeConversionBySource(opps, STAGES);
    expect(result["A"][0].conversionFromPrevPct).toBeNull();
  });
});

describe("computeRevenueBySource", () => {
  it("revenue equals the sum of valid won monetary values, sorted numerically descending", () => {
    const opps = [
      o({ id: "1", source: "A", status: "won", monetaryValue: 500 }),
      o({ id: "2", source: "A", status: "won", monetaryValue: 300 }),
      o({ id: "3", source: "B", status: "won", monetaryValue: 1000 }),
      o({ id: "4", source: "B", status: "open", monetaryValue: 99999 }),
      o({ id: "5", source: "B", status: "lost", monetaryValue: 99999 }),
    ];
    const result = computeRevenueBySource(opps);
    expect(result).toEqual([
      { source: "B", revenue: 1000 },
      { source: "A", revenue: 800 },
    ]);
  });

  it("does not include open or lost opportunity values as closed revenue", () => {
    const opps = [
      o({ id: "1", source: "A", status: "open", monetaryValue: 500 }),
      o({ id: "2", source: "A", status: "lost", monetaryValue: 500 }),
      o({ id: "3", source: "A", status: "abandoned", monetaryValue: 500 }),
    ];
    expect(computeRevenueBySource(opps)).toEqual([]);
  });
});

describe("computeSourceSummary", () => {
  it("computes lead-to-won rate and average won value correctly", () => {
    const opps = [
      o({ id: "1", source: "A", status: "won", monetaryValue: 200 }),
      o({ id: "2", source: "A", status: "won", monetaryValue: 400 }),
      o({ id: "3", source: "A", status: "open" }),
      o({ id: "4", source: "A", status: "lost" }),
    ];
    const [row] = computeSourceSummary(opps);
    expect(row.leads).toBe(4);
    expect(row.won).toBe(2);
    expect(row.leadToWonRatePct).toBe(50);
    expect(row.closedRevenue).toBe(600);
    expect(row.avgWonValue).toBe(300);
  });

  it("returns null avgWonValue when there are no wins", () => {
    const opps = [o({ id: "1", source: "A", status: "open" })];
    const [row] = computeSourceSummary(opps);
    expect(row.won).toBe(0);
    expect(row.avgWonValue).toBeNull();
  });
});
