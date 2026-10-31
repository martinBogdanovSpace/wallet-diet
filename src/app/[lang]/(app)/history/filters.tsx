"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/i18n/client";
import type { Category, Method, Profile } from "@/lib/types";

type Values = { type?: string; who?: string; method?: string; cat?: string };

export function HistoryFilters({
  members,
  categories,
  values,
}: {
  members: Profile[];
  categories: Category[];
  values: Values;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function set(key: keyof Values, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    // A category from the other side would leave the list empty.
    if (key === "type" && value) {
      const cat = categories.find((c) => c.id === next.get("cat"));
      if (cat && cat.kind !== value) next.delete("cat");
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 md:mx-0 md:px-0">
      <Pill active={!!values.type} value={values.type ?? ""} onChange={(v) => set("type", v)}>
        <option value="">{t.history.allTypes}</option>
        <option value="income">{t.dashboard.income}</option>
        <option value="expense">{t.dashboard.expenses}</option>
      </Pill>
      {members.length > 1 && (
        <Pill active={!!values.who} value={values.who ?? ""} onChange={(v) => set("who", v)}>
          <option value="">{t.history.everyone}</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Pill>
      )}
      <Pill active={!!values.method} value={values.method ?? ""} onChange={(v) => set("method", v)}>
        <option value="">{t.history.allMethods}</option>
        {(["cash", "card", "transfer"] as Method[]).map((m) => (
          <option key={m} value={m}>
            {t.methods[m]}
          </option>
        ))}
      </Pill>
      <Pill active={!!values.cat} value={values.cat ?? ""} onChange={(v) => set("cat", v)}>
        <option value="">{t.history.allCategories}</option>
        {categories
          .filter((c) => !values.type || c.kind === values.type)
          .map((c) => (
          <option key={c.id} value={c.id}>
            {c.icon} {c.name}
          </option>
        ))}
      </Pill>
    </div>
  );
}

/** A native select dressed as a filter chip; filled when a filter is set. */
function Pill({
  active,
  value,
  onChange,
  children,
}: {
  active: boolean;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <span className="relative shrink-0">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-10 appearance-none rounded-full border pl-4 pr-9 text-sm font-medium outline-none transition focus:ring-2 focus:ring-pine/15 ${
          active ? "border-pine bg-pine text-cream" : "border-line-strong bg-surface text-ink-soft"
        }`}
      >
        {children}
      </select>
      <ChevronDown
        className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 ${active ? "text-cream" : "text-faint"}`}
      />
    </span>
  );
}
