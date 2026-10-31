/** Colours for how much of a budget is used: amber from 80%, red when over. Shared by server and client. */
export function budgetTone(ratio: number) {
  if (ratio >= 1) return { bar: "bg-expense", text: "text-expense" };
  if (ratio >= 0.8) return { bar: "bg-warn", text: "text-warn" };
  return { bar: "bg-pine", text: "text-subtle" };
}
