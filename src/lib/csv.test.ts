import { describe, expect, it } from "vitest";
import { csvAmount, csvLine } from "./csv";

describe("csv", () => {
  it("quotes only when needed", () => {
    expect(csvLine(["a", 'say "hi"', "x,y", null, 3], ",")).toBe('a,"say ""hi""","x,y",,3');
    expect(csvLine(["x,y", "a;b"], ";")).toBe('x,y;"a;b"');
    expect(csvLine(["two\nlines"], ",")).toBe('"two\nlines"');
  });

  it("writes plain signed amounts", () => {
    expect(csvAmount(-1250, ".")).toBe("-12.50");
    expect(csvAmount(5, ",")).toBe("0,05");
    expect(csvAmount(100000, ",")).toBe("1000,00");
  });
});
