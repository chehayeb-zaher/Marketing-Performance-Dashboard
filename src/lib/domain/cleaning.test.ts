import { describe, it, expect } from "vitest";
import { matchedExclusionTags, isExcludedByTags } from "./cleaning";

describe("cleaning: exclusion tags", () => {
  it("matches exclusion tags case-insensitively", () => {
    expect(isExcludedByTags(["Demo-Data"])).toBe(true);
    expect(isExcludedByTags(["SANDBOX"])).toBe(true);
    expect(isExcludedByTags(["Internal"])).toBe(true);
    expect(isExcludedByTags(["Backdate-Test"])).toBe(true);
    expect(isExcludedByTags(["DQ - Duplicate"])).toBe(true);
  });

  it("matches exclusion tags with surrounding whitespace", () => {
    expect(isExcludedByTags(["  demo-data  "])).toBe(true);
  });

  it("does not exclude on unrelated tags", () => {
    expect(isExcludedByTags(["vip", "hot-lead"])).toBe(false);
  });

  it("does not exclude on an empty tag list", () => {
    expect(isExcludedByTags([])).toBe(false);
  });

  it("does not exclude solely for the dash-project tag", () => {
    expect(isExcludedByTags(["dash-project"])).toBe(false);
    expect(isExcludedByTags(["Dash-Project"])).toBe(false);
  });

  it("exclusion wins when dash-project is combined with an exclusion tag", () => {
    expect(isExcludedByTags(["dash-project", "demo-data"])).toBe(true);
    expect(matchedExclusionTags(["dash-project", "demo-data"])).toEqual(["demo-data"]);
  });

  it("reports every matched exclusion tag", () => {
    expect(matchedExclusionTags(["sandbox", "internal"]).sort()).toEqual(["internal", "sandbox"]);
  });
});
