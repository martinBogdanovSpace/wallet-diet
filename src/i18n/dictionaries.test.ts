import { describe, expect, it } from "vitest";
import { categoryNames, localizedCategoryName } from "./dictionaries";

describe("category names", () => {
  it("translates the default categories", () => {
    expect(localizedCategoryName({ name: "Groceries" }, "bg")).toBe("Хранителни стоки");
    expect(categoryNames({ name: "Groceries" })).toEqual({ en: "Groceries", bg: "Хранителни стоки" });
  });

  it("uses the name typed for each language", () => {
    const c = { name: "Kindergarten", names: { bg: "Детска градина", en: "Kindergarten" } };
    expect(localizedCategoryName(c, "bg")).toBe("Детска градина");
    expect(localizedCategoryName(c, "en")).toBe("Kindergarten");
  });

  it("falls back to the only name it has", () => {
    expect(localizedCategoryName({ name: "Кафе", names: { bg: "Кафе" } }, "en")).toBe("Кафе");
    expect(localizedCategoryName({ name: "Old custom" }, "bg")).toBe("Old custom");
  });

  it("keeps a renamed default's own names", () => {
    const c = { name: "Food", names: { en: "Food", bg: "Храна" } };
    expect(localizedCategoryName(c, "bg")).toBe("Храна");
  });
});
