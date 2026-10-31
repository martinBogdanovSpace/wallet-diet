import { addDays, monthOf, shiftMonth } from "../src/lib/dates";

/** "Today" in the household's timezone, the same way the database works it out. */
export function sofiaToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia" }).format(new Date());
}

export type SeedEntry = {
  who: "a" | "b";
  type: "income" | "expense" | "withdrawal";
  cents: number;
  /** English name of a default category. */
  category?: string;
  method: "cash" | "card" | "transfer";
  date: string;
  note: string;
};

/**
 * A household with three months of history, built relative to today so the
 * totals the tests expect are always the same.
 */
export function seedData(today = sofiaToday()) {
  const month = monthOf(today);
  const prev = shiftMonth(month, -1);
  const prev2 = shiftMonth(month, -2);

  const entries: SeedEntry[] = [
    // Two months ago: +1 000,00 €
    { who: "a", type: "income", cents: 300000, category: "Salary", method: "transfer", date: `${prev2}-01`, note: "Заплата" },
    { who: "b", type: "expense", cents: 2350, category: "Health", method: "card", date: `${prev2}-03`, note: "Аптека Марешки" },
    { who: "a", type: "expense", cents: 197650, category: "Household", method: "transfer", date: `${prev2}-04`, note: "Ремонт" },
    // Last month: +1 750,00 €
    { who: "a", type: "income", cents: 300000, category: "Salary", method: "transfer", date: `${prev}-01`, note: "Заплата" },
    { who: "a", type: "expense", cents: 80000, category: "Housing", method: "transfer", date: `${prev}-01`, note: "Наем" },
    { who: "b", type: "expense", cents: 45000, category: "Groceries", method: "card", date: `${prev}-02`, note: "Lidl голямо пазаруване" },
    // This month, all on the 1st so they're never in the future: +2 876,55 €
    { who: "a", type: "income", cents: 300000, category: "Salary", method: "transfer", date: `${month}-01`, note: "Заплата" },
    { who: "b", type: "expense", cents: 12345, category: "Groceries", method: "cash", date: `${month}-01`, note: "Пазар" },
    { who: "a", type: "withdrawal", cents: 20000, method: "cash", date: `${month}-01`, note: "Банкомат" },
  ];

  const startingBalance = 100000;
  const net = (list: SeedEntry[]) =>
    list.reduce((s, e) => s + (e.type === "income" ? e.cents : e.type === "expense" ? -e.cents : 0), 0);
  const inMonth = (m: string) => entries.filter((e) => e.date.startsWith(m));

  return {
    today,
    month,
    prev,
    prev2,
    entries,
    startingBalance,
    budget: { category: "Groceries", cents: 40000 },
    goal: { name: "Почивка", icon: "🏖️", target: 200000, saved: 50000 },
    recurring: { note: "Наем (повтарящ се)", cents: 80000, category: "Housing", next: addDays(today, 10) },
    expected: {
      thisMonth: net(inMonth(month)),
      carriedIntoMonth: startingBalance + net(inMonth(prev2)) + net(inMonth(prev)),
      carriedIntoPrev: startingBalance + net(inMonth(prev2)),
      prevMonth: net(inMonth(prev)),
      // Cash: −12,345 cash groceries + 20,000 from the ATM.
      cash: 20000 - 12345,
      net,
    },
  };
}
