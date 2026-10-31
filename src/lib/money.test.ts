import { describe, expect, it } from "vitest";
import { centsToInput, formatEUR, parseAmountToCents } from "./money";

describe("parseAmountToCents", () => {
  it.each([
    ["12", 1200],
    ["12.5", 1250],
    ["12,50", 1250],
    ["1 234,56", 123456],
    ["1.234,56", 123456],
    ["1,234.56", 123456],
    ["€ 7", 700],
    ["0,05", 5],
    ["12,", 1200],
  ])("%s → %i", (input, cents) => expect(parseAmountToCents(input)).toBe(cents));

  it.each(["", "abc", "1,234", "12.345", "1-2"])("rejects %j", (input) => {
    // "1,234" reads as 1.234: three decimals, so it is rejected rather than guessed.
    expect(parseAmountToCents(input)).toBeNull();
  });

  it("avoids floating point drift", () => {
    expect(parseAmountToCents("0,29")).toBe(29);
    expect(parseAmountToCents("1,15")).toBe(115);
  });
});

describe("formatting", () => {
  it("writes EUR the way each language does", () => {
    expect(formatEUR(123456, "en")).toBe("€1,234.56");
    expect(formatEUR(1250, "bg").replace(/\s/g, " ")).toBe("12,50 €");
  });

  it("fills form fields with two decimals", () => {
    expect(centsToInput(1250)).toBe("12.50");
  });
});
