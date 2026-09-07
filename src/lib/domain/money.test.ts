import { describe, it, expect } from "vitest";
import { parseMonetaryValue } from "./money";

describe("parseMonetaryValue", () => {
  it("accepts a valid positive number", () => {
    expect(parseMonetaryValue(1500)).toEqual({ value: 1500, wasInvalid: false });
  });

  it("accepts zero", () => {
    expect(parseMonetaryValue(0)).toEqual({ value: 0, wasInvalid: false });
  });

  it("accepts a numeric string", () => {
    expect(parseMonetaryValue("2500.50")).toEqual({ value: 2500.5, wasInvalid: false });
  });

  it("treats null as invalid and zero", () => {
    expect(parseMonetaryValue(null)).toEqual({ value: 0, wasInvalid: true });
  });

  it("treats undefined as invalid and zero", () => {
    expect(parseMonetaryValue(undefined)).toEqual({ value: 0, wasInvalid: true });
  });

  it("treats an empty string as invalid and zero", () => {
    expect(parseMonetaryValue("")).toEqual({ value: 0, wasInvalid: true });
  });

  it("treats a non-numeric string as invalid and zero", () => {
    expect(parseMonetaryValue("N/A")).toEqual({ value: 0, wasInvalid: true });
  });

  it("treats a negative number as invalid and zero", () => {
    expect(parseMonetaryValue(-100)).toEqual({ value: 0, wasInvalid: true });
  });

  it("treats NaN/Infinity as invalid and zero", () => {
    expect(parseMonetaryValue(NaN)).toEqual({ value: 0, wasInvalid: true });
    expect(parseMonetaryValue(Infinity)).toEqual({ value: 0, wasInvalid: true });
  });
});
