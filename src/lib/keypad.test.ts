import { describe, expect, it } from "vitest";
import { centsToKeypad, press, separatorFor } from "./keypad";

const type = (keys: string[], sep: "," | "." = ",") => keys.reduce((a, k) => press(a, k, sep), "");

describe("press", () => {
  it("builds an amount", () => expect(type(["1", "2", ",", "5", "0"])).toBe("12,50"));
  it("starts a fraction with 0", () => expect(type([","])).toBe("0,"));
  it("allows one separator", () => expect(type(["1", ",", ","])).toBe("1,"));
  it("allows two decimals", () => expect(type(["1", ",", "2", "3", "4"])).toBe("1,23"));
  it("allows six whole digits", () => expect(type(["9", "9", "9", "9", "9", "9", "9"])).toBe("999999"));
  it("replaces a lone zero", () => expect(type(["0", "7"])).toBe("7"));
  it("deletes", () => expect(type(["1", "2", "del"])).toBe("1"));
  it("takes either separator key", () => expect(type(["1", "."], ",")).toBe("1,"));
  it("uses a point in English", () => expect(type(["3", ",", "5"], ".")).toBe("3.5"));
  it("ignores other keys", () => expect(type(["a", "1"])).toBe("1"));
});

describe("centsToKeypad", () => {
  it("drops zero decimals", () => expect(centsToKeypad(1200, ",")).toBe("12"));
  it("keeps two decimals", () => expect(centsToKeypad(1205, ",")).toBe("12,05"));
  it("uses the separator", () => expect(centsToKeypad(1250, ".")).toBe("12.50"));
});

describe("separatorFor", () => {
  it("is a point in English and a comma in Bulgarian", () => {
    expect(separatorFor("en")).toBe(".");
    expect(separatorFor("bg")).toBe(",");
  });
});
