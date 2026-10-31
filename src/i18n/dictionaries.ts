import { LOCALES, type Locale } from "./config";
import { bg } from "./bg";
import { en, type Dict } from "./en";

export type { Dict };

export const DICTIONARIES: Record<Locale, Dict> = { en, bg };

/** Names of the categories seeded for new households, translated for display. */
const DEFAULT_CATEGORY_NAMES: Record<Exclude<Locale, "en">, Record<string, string>> = {
  bg: {
    Groceries: "Хранителни стоки",
    "Eating out": "Заведения",
    Housing: "Жилище",
    Utilities: "Сметки",
    Transport: "Транспорт",
    Fuel: "Гориво",
    Health: "Здраве",
    Household: "Домакинство",
    Clothing: "Облекло",
    Entertainment: "Развлечения",
    Subscriptions: "Абонаменти",
    Gifts: "Подаръци",
    Travel: "Пътувания",
    Other: "Други",
    Salary: "Заплата",
    Bonus: "Бонус",
    "Gift received": "Получен подарък",
    "Other income": "Други приходи",
  },
};

export function categoryName(name: string, locale: Locale) {
  return locale === "en" ? name : (DEFAULT_CATEGORY_NAMES[locale][name] ?? name);
}

export type CategoryNames = Partial<Record<Locale, string>>;

/** The names a category has in each language: typed by the household, or the default translations. */
export function categoryNames(category: { name: string; names?: CategoryNames | null }): CategoryNames {
  const names: CategoryNames = { ...category.names };
  const isDefault = category.name in DEFAULT_CATEGORY_NAMES.bg;
  for (const locale of LOCALES) {
    if (!names[locale] && isDefault) names[locale] = categoryName(category.name, locale);
  }
  return names;
}

/** A category's name in a language, falling back to whichever name it has. */
export function localizedCategoryName(category: { name: string; names?: CategoryNames | null }, locale: Locale) {
  const names = categoryNames(category);
  return names[locale] || Object.values(names).find(Boolean) || category.name;
}
