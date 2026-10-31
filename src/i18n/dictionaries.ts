import type { Locale } from "./config";
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
