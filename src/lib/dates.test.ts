import { describe, expect, it } from "vitest";
import { addDays, formatDay, isValidDate, isValidMonth, monthRange, shiftMonth } from "./dates";

describe("dates", () => {
  it("knows month lengths", () => {
    expect(monthRange("2026-02")).toEqual({ start: "2026-02-01", end: "2026-02-28" });
    expect(monthRange("2028-02").end).toBe("2028-02-29");
    expect(monthRange("2026-12").end).toBe("2026-12-31");
  });

  it("shifts months across years", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });

  it("adds days across months", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("validates dates and months", () => {
    expect(isValidDate("2026-02-28")).toBe(true);
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(isValidDate("2026-13-01")).toBe(false);
    expect(isValidDate("26-1-1")).toBe(false);
    expect(isValidMonth("2026-10")).toBe(true);
    expect(isValidMonth("2026-00")).toBe(false);
  });

  it("names today and yesterday", () => {
    const labels = { today: "Today", yesterday: "Yesterday" };
    expect(formatDay("2026-10-31", "2026-10-31", "en", labels)).toBe("Today");
    expect(formatDay("2026-10-30", "2026-10-31", "en", labels)).toBe("Yesterday");
    expect(formatDay("2026-10-27", "2026-10-31", "en", labels)).toBe("Tue 27 Oct");
    expect(formatDay("2025-10-27", "2026-10-31", "en", labels)).toBe("Mon, 27 Oct 2025");
  });
});
