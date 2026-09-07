export interface ParsedMoney {
  value: number;
  wasInvalid: boolean;
}

/** Treats missing, non-numeric, or negative monetary values as zero and flags them as invalid. */
export function parseMonetaryValue(raw: unknown): ParsedMoney {
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) {
    return { value: raw, wasInvalid: false };
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed !== "") {
      const num = Number(trimmed);
      if (Number.isFinite(num) && num >= 0) {
        return { value: num, wasInvalid: false };
      }
    }
  }

  return { value: 0, wasInvalid: true };
}
