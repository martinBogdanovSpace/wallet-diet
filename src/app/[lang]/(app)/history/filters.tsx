"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useI18n } from "@/i18n/client";
import type { Category, Method, Profile } from "@/lib/types";
import { MethodIcon } from "@/components/method-icon";
import { Sheet } from "@/components/sheet";

type Values = { type?: string; who?: string; method?: string; cat?: string; q?: string };

export function HistoryFilters({
  members,
  categories,
  values,
  count,
}: {
  members: Profile[];
  categories: Category[];
  values: Values;
  /** How many entries the current filters show. */
  count: number;
}) {
  const { t, f } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(values.q ?? "");

  function go(next: URLSearchParams) {
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function set(key: keyof Values, value: string | undefined) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    // A category from the other side would leave the list empty.
    if (key === "type" && value) {
      const cat = categories.find((c) => c.id === next.get("cat"));
      if (cat && cat.kind !== value) next.delete("cat");
    }
    go(next);
  }

  function clear() {
    const next = new URLSearchParams(params);
    for (const key of ["type", "who", "method", "cat"]) next.delete(key);
    go(next);
  }

  // Search as you type, once typing pauses.
  useEffect(() => {
    if (query === (values.q ?? "")) return;
    const timer = setTimeout(() => set("q", query.trim() || undefined), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const active = (["type", "who", "method", "cat"] as const).filter((k) => values[k]).length;

  return (
    <>
      <div className="mt-3 flex gap-2">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.history.search}
            aria-label={t.history.search}
            enterKeyHint="search"
            className="h-11 w-full rounded-full border border-line-strong bg-surface pl-10 pr-4 text-ink placeholder:text-faint focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/15"
          />
        </label>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`${chip(active > 0)} h-11`}
          aria-label={active ? `${t.history.filters} (${active})` : t.history.filters}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {t.history.filters}
          {active > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-on-pine px-1 text-xs text-pine">
              {active}
            </span>
          )}
        </button>
        {active > 0 && (
          <button
            type="button"
            onClick={clear}
            aria-label={t.common.clear}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface text-subtle hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} label={t.history.filters}>
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-[22px] font-medium">{t.history.filters}</h2>
          {active > 0 && (
            <button type="button" onClick={clear} className="text-sm font-semibold text-pine">
              {t.common.clear}
            </button>
          )}
        </div>
        <FilterGroup
          label={t.history.type}
          value={values.type ?? ""}
          onPick={(v) => set("type", v)}
          options={[
            { value: "", label: t.history.allTypes },
            { value: "expense", label: t.dashboard.expenses },
            { value: "income", label: t.dashboard.income },
          ]}
        />
        {members.length > 1 && (
          <FilterGroup
            label={t.history.who}
            value={values.who ?? ""}
          onPick={(v) => set("who", v)}
            options={[{ value: "", label: t.history.everyone }, ...members.map((m) => ({ value: m.id, label: m.name }))]}
          />
        )}
        <FilterGroup
          label={t.history.method}
          value={values.method ?? ""}
          onPick={(v) => set("method", v)}
          options={[
            { value: "", label: t.history.allMethods },
            ...(["cash", "card", "transfer"] as Method[]).map((m) => ({
              value: m,
              label: (
                <>
                  <MethodIcon method={m} className="h-4 w-4" strokeWidth={1.75} />
                  {t.methods[m]}
                </>
              ),
            })),
          ]}
        />
        <FilterGroup
          label={t.history.category}
          value={values.cat ?? ""}
          onPick={(v) => set("cat", v)}
          options={[
            { value: "", label: t.history.allCategories },
            ...categories
              .filter((c) => !values.type || c.kind === values.type)
              .map((c) => ({
                value: c.id,
                label: (
                  <>
                    <span className="text-base leading-none">{c.icon}</span>
                    {c.name}
                  </>
                ),
              })),
          ]}
        />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-6 flex h-[54px] w-full items-center justify-center rounded-[16px] bg-pine text-base font-semibold text-on-pine shadow-sm transition hover:bg-pine-dark active:scale-[0.98]"
        >
          {f(t.history.show, { count })}
        </button>
      </Sheet>
    </>
  );
}

const chip = (selected: boolean) =>
  `flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm transition ${
    selected
      ? "border-pine bg-pine font-semibold text-on-pine"
      : "border-line bg-surface font-medium text-ink-soft hover:border-line-strong"
  }`;

/** One row of filter chips; the empty value means "all". */
function FilterGroup({
  label,
  value,
  onPick,
  options,
}: {
  label: string;
  value: string;
  onPick: (value: string | undefined) => void;
  options: { value: string; label: React.ReactNode }[];
}) {
  return (
    <fieldset className="mt-5">
      <legend className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-subtle">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value || "all"}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onPick(o.value || undefined)}
            className={chip(value === o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
