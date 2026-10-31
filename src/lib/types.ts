export type TxType = "income" | "expense" | "withdrawal" | "adjustment";
export type Method = "cash" | "card" | "transfer";
export type CategoryKind = "income" | "expense";
export type Frequency = "weekly" | "monthly";

export type Profile = { id: string; name: string };

export type Household = {
  id: string;
  name: string;
  timezone: string;
  invite_code: string;
};

export type Category = {
  id: string;
  name: string;
  icon: string;
  kind: CategoryKind;
  sort: number;
  archived: boolean;
};

export type Transaction = {
  id: string;
  user_id: string;
  type: TxType;
  amount_cents: number;
  category_id: string | null;
  method: Method;
  occurred_on: string;
  note: string | null;
  recurring_id: string | null;
  created_at: string;
};

export type Recurring = {
  id: string;
  type: "income" | "expense";
  amount_cents: number;
  category_id: string | null;
  method: Method;
  note: string | null;
  frequency: Frequency;
  anchor_day: number | null;
  next_date: string;
  active: boolean;
};

export type Budget = { category_id: string; monthly_limit_cents: number };
