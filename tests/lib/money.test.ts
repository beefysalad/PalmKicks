import { describe, it, expect } from "vitest";
import { toCentavos, fromCentavos } from "@/lib/money";

describe("money", () => {
  it("converts strings exactly", () => {
    expect(toCentavos("19.99")).toBe(1999);
    expect(toCentavos("1234.5")).toBe(123450);
    expect(toCentavos("0")).toBe(0);
  });

  it("rounds float noise away", () => {
    expect(toCentavos(0.1 + 0.2)).toBe(30);
    expect(toCentavos(19.99)).toBe(1999);
  });

  it("accepts Decimal-like objects", () => {
    expect(toCentavos({ toString: () => "2500.00" })).toBe(250000);
  });

  it("rejects non-numeric input", () => {
    expect(() => toCentavos("abc")).toThrow();
    expect(() => toCentavos(Number.NaN)).toThrow();
  });

  it("formats centavos as a 2-decimal string", () => {
    expect(fromCentavos(123450)).toBe("1234.50");
    expect(fromCentavos(5)).toBe("0.05");
    expect(fromCentavos(0)).toBe("0.00");
    expect(fromCentavos(toCentavos("19.99") * 3)).toBe("59.97");
  });
});
