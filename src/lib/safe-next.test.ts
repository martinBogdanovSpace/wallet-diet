import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("keeps same-site paths", () => {
    expect(safeNext("/history?month=2026-11")).toBe("/history?month=2026-11");
    expect(safeNext("/join/a1b2c3d4e5f6")).toBe("/join/a1b2c3d4e5f6");
  });

  it("rejects other sites", () => {
    for (const next of ["//evil.com", "/\\evil.com", "/\t/evil.com", "/\\/evil.com", "https://evil.com", "evil.com", "", null]) {
      expect(safeNext(next), String(next)).toBe("/");
    }
  });
});
