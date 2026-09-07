import { describe, it, expect } from "vitest";
import { transformAndClean } from "./transform";
import type { GhlOpportunity, GhlContact } from "../ghl/schemas";
import { UNATTRIBUTED_SOURCE } from "./constants";

const STAGE_0 = "stage-0";
const STAGE_1 = "stage-1";
const KNOWN_STAGES = new Set([STAGE_0, STAGE_1]);

function opp(overrides: Partial<GhlOpportunity> & { id: string }): GhlOpportunity {
  return {
    pipelineId: "pipeline-1",
    pipelineStageId: STAGE_0,
    status: "open",
    source: "Referral",
    monetaryValue: 100,
    contactId: `contact-${overrides.id}`,
    createdAt: "2026-07-15T00:00:00.000Z",
    updatedAt: "2026-07-15T00:00:00.000Z",
    lastStageChangeAt: "2026-07-15T00:00:00.000Z",
    lastStatusChangeAt: "2026-07-15T00:00:00.000Z",
    ...overrides,
  };
}

function contact(id: string, overrides: Partial<GhlContact> = {}): GhlContact {
  return { id, source: null, tags: [], ...overrides };
}

describe("transformAndClean: exclusion", () => {
  it("excludes an opportunity whose contact has an exclusion tag (case-insensitive)", () => {
    const raw = [opp({ id: "a" })];
    const contacts = new Map([["contact-a", contact("contact-a", { tags: ["Demo-Data"] })]]);
    const { included, excluded } = transformAndClean(raw, contacts, KNOWN_STAGES);
    expect(included).toHaveLength(0);
    expect(excluded).toHaveLength(1);
    expect(excluded[0].reasons).toContain("excluded tag: demo-data");
  });

  it("keeps an opportunity whose contact has only the dash-project tag", () => {
    const raw = [opp({ id: "a" })];
    const contacts = new Map([["contact-a", contact("contact-a", { tags: ["dash-project"] })]]);
    const { included, excluded } = transformAndClean(raw, contacts, KNOWN_STAGES);
    expect(included).toHaveLength(1);
    expect(excluded).toHaveLength(0);
  });

  it("exclusion wins when dash-project is combined with an exclusion tag", () => {
    const raw = [opp({ id: "a" })];
    const contacts = new Map([["contact-a", contact("contact-a", { tags: ["dash-project", "sandbox"] })]]);
    const { included, excluded } = transformAndClean(raw, contacts, KNOWN_STAGES);
    expect(included).toHaveLength(0);
    expect(excluded).toHaveLength(1);
  });

  it("does not exclude based on contact name matching an exclusion-like string", () => {
    const raw = [opp({ id: "a" })];
    const contacts = new Map([
      ["contact-a", { id: "contact-a", source: null, tags: [], name: "Demo Data Test" } as GhlContact],
    ]);
    const { included } = transformAndClean(raw, contacts, KNOWN_STAGES);
    expect(included).toHaveLength(1);
  });

  it("keeps an opportunity when the linked contact can't be resolved (no tags known)", () => {
    const raw = [opp({ id: "a", contactId: "missing-contact" })];
    const { included, dataQuality } = transformAndClean(raw, new Map(), KNOWN_STAGES);
    expect(included).toHaveLength(1);
    expect(dataQuality.missingContactCount).toBe(1);
  });

  it("excludes an opportunity with an unrecognized pipeline stage id", () => {
    const raw = [opp({ id: "a", pipelineStageId: "unknown-stage" })];
    const contacts = new Map([["contact-a", contact("contact-a")]]);
    const { included, excluded, dataQuality } = transformAndClean(raw, contacts, KNOWN_STAGES);
    expect(included).toHaveLength(0);
    expect(dataQuality.unknownStageExcludedCount).toBe(1);
    expect(excluded[0].reasons).toContain("missing/invalid pipeline stage");
  });
});

describe("transformAndClean: source resolution", () => {
  it("retains Unattributed as a real source rather than dropping the record", () => {
    const raw = [opp({ id: "a", source: null })];
    const contacts = new Map([["contact-a", contact("contact-a", { source: null })]]);
    const { included, dataQuality } = transformAndClean(raw, contacts, KNOWN_STAGES);
    expect(included).toHaveLength(1);
    expect(included[0].source).toBe(UNATTRIBUTED_SOURCE);
    expect(dataQuality.unattributedCount).toBe(1);
  });

  it("falls back to contact source when opportunity source is blank", () => {
    const raw = [opp({ id: "a", source: "" })];
    const contacts = new Map([["contact-a", contact("contact-a", { source: "Referral" })]]);
    const { included } = transformAndClean(raw, contacts, KNOWN_STAGES);
    expect(included[0].source).toBe("Referral");
  });
});

describe("transformAndClean: data quality flags", () => {
  it("flags an invalid monetary value and treats it as zero", () => {
    const raw = [opp({ id: "a", monetaryValue: null })];
    const contacts = new Map([["contact-a", contact("contact-a")]]);
    const { included, dataQuality } = transformAndClean(raw, contacts, KNOWN_STAGES);
    expect(included[0].monetaryValue).toBe(0);
    expect(included[0].monetaryValueWasInvalid).toBe(true);
    expect(dataQuality.invalidMonetaryValueCount).toBe(1);
  });

  it("flags a stale open opportunity using lastStageChangeAt", () => {
    const raw = [
      opp({
        id: "a",
        status: "open",
        lastStageChangeAt: "2000-01-01T00:00:00.000Z",
        updatedAt: "2026-07-15T00:00:00.000Z",
      }),
    ];
    const contacts = new Map([["contact-a", contact("contact-a")]]);
    const { included } = transformAndClean(raw, contacts, KNOWN_STAGES, new Date("2026-07-20T00:00:00.000Z"));
    expect(included[0].isStaleOpen).toBe(true);
    expect(included[0].stageChangeIsProxy).toBe(false);
  });

  it("uses updatedAt as a labeled proxy when lastStageChangeAt is missing", () => {
    const raw = [
      opp({
        id: "a",
        status: "open",
        lastStageChangeAt: null,
        updatedAt: "2000-01-01T00:00:00.000Z",
      }),
    ];
    const contacts = new Map([["contact-a", contact("contact-a")]]);
    const { included, dataQuality } = transformAndClean(
      raw,
      contacts,
      KNOWN_STAGES,
      new Date("2026-07-20T00:00:00.000Z"),
    );
    expect(included[0].stageChangeIsProxy).toBe(true);
    expect(included[0].isStaleOpen).toBe(true);
    expect(dataQuality.staleUsingProxyCount).toBe(1);
  });

  it("does not flag a recently-updated open opportunity as stale", () => {
    const raw = [opp({ id: "a", status: "open", lastStageChangeAt: "2026-07-19T00:00:00.000Z" })];
    const contacts = new Map([["contact-a", contact("contact-a")]]);
    const { included } = transformAndClean(raw, contacts, KNOWN_STAGES, new Date("2026-07-20T00:00:00.000Z"));
    expect(included[0].isStaleOpen).toBe(false);
  });

  it("does not flag a won/lost/abandoned opportunity as stale", () => {
    const raw = [opp({ id: "a", status: "won", lastStageChangeAt: "2000-01-01T00:00:00.000Z" })];
    const contacts = new Map([["contact-a", contact("contact-a")]]);
    const { included } = transformAndClean(raw, contacts, KNOWN_STAGES, new Date("2026-07-20T00:00:00.000Z"));
    expect(included[0].isStaleOpen).toBe(false);
  });

  it("total included + excluded accounts for every fetched record", () => {
    const raw = [
      opp({ id: "a" }),
      opp({ id: "b", contactId: "contact-b" }),
      opp({ id: "c", contactId: "contact-c" }),
    ];
    const contacts = new Map([
      ["contact-a", contact("contact-a")],
      ["contact-b", contact("contact-b", { tags: ["internal"] })],
      ["contact-c", contact("contact-c")],
    ]);
    const { included, excluded, dataQuality } = transformAndClean(raw, contacts, KNOWN_STAGES);
    expect(included.length + excluded.length).toBe(raw.length);
    expect(dataQuality.totalFetched).toBe(3);
    expect(dataQuality.includedCount).toBe(2);
    expect(dataQuality.excludedCount).toBe(1);
  });
});
