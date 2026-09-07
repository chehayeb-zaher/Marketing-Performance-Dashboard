import { describe, it, expect } from "vitest";
import {
  resolveWinningRawSource,
  buildSourceCanonicalMap,
  resolveCanonicalSource,
  UNATTRIBUTED_SOURCE,
} from "./sourceNormalization";

describe("resolveWinningRawSource (source precedence)", () => {
  it("prefers opportunity source over contact source", () => {
    expect(resolveWinningRawSource("Facebook Ad", "Referral")).toBe("Facebook Ad");
  });

  it("falls back to contact source when opportunity source is blank", () => {
    expect(resolveWinningRawSource("", "Referral")).toBe("Referral");
    expect(resolveWinningRawSource(null, "Referral")).toBe("Referral");
    expect(resolveWinningRawSource("   ", "Referral")).toBe("Referral");
  });

  it("returns null when both are blank (Unattributed)", () => {
    expect(resolveWinningRawSource(null, null)).toBeNull();
    expect(resolveWinningRawSource("", "  ")).toBeNull();
  });

  it("trims whitespace", () => {
    expect(resolveWinningRawSource("  Google Search  ", null)).toBe("Google Search");
  });
});

describe("buildSourceCanonicalMap + resolveCanonicalSource", () => {
  it("groups case/whitespace variants under the most common casing", () => {
    const map = buildSourceCanonicalMap(["Facebook Ad", "facebook ad", "Facebook Ad", "FACEBOOK AD"]);
    expect(resolveCanonicalSource("facebook ad", map)).toBe("Facebook Ad");
    expect(resolveCanonicalSource("FACEBOOK AD", map)).toBe("Facebook Ad");
  });

  it("keeps distinct sources distinct (never merges into Other)", () => {
    const map = buildSourceCanonicalMap(["Referral", "Webinar", "Billboard"]);
    expect(resolveCanonicalSource("Referral", map)).toBe("Referral");
    expect(resolveCanonicalSource("Webinar", map)).toBe("Webinar");
    expect(resolveCanonicalSource("Billboard", map)).toBe("Billboard");
  });

  it("preserves properly-cased acronym-like source names when consistent", () => {
    const map = buildSourceCanonicalMap(["Instagram DM", "Instagram DM", "LinkedIn Outreach"]);
    expect(resolveCanonicalSource("Instagram DM", map)).toBe("Instagram DM");
    expect(resolveCanonicalSource("LinkedIn Outreach", map)).toBe("LinkedIn Outreach");
  });

  it("returns Unattributed for a null winning source regardless of the map", () => {
    const map = buildSourceCanonicalMap(["Referral"]);
    expect(resolveCanonicalSource(null, map)).toBe(UNATTRIBUTED_SOURCE);
  });
});
