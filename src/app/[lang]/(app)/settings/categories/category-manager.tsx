"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Pencil, Plus } from "lucide-react";
import { saveCategory, setCategoryArchived } from "@/app/actions/settings";
import type { Category, CategoryKind } from "@/lib/types";
import { useI18n } from "@/i18n/client";
import { LOCALES, type Locale } from "@/i18n/config";
import { CATEGORY_EMOJI, firstEmoji } from "@/lib/emoji";
import { Button, ErrorText, Input, Label, Segmented, Tile } from "@/components/ui";

const listClass = "divide-y divide-line overflow-hidden rounded-[20px] border border-line bg-surface";

export function CategoryManager({ categories }: { categories: Category[] }) {
  const { t } = useI18n();
  const [kind, setKind] = useState<CategoryKind>("expense");
  const list = categories.filter((c) => c.kind === kind);
  const active = list.filter((c) => !c.archived);
  const archived = list.filter((c) => c.archived);

  return (
    <div className="pb-4">
      <Segmented
        value={kind}
        onChange={setKind}
        options={[
          { value: "expense", label: t.categories.expenses },
          { value: "income", label: t.categories.income },
        ]}
      />
      <div className={`mt-4 ${listClass}`}>
        {active.map((c) => (
          <CategoryRow key={c.id} category={c} />
        ))}
        <CategoryRow key={`new-${kind}`} kind={kind} />
      </div>
      {archived.length > 0 && (
        <>
          <h2 className="mb-2 mt-7 px-1 text-[13px] font-semibold uppercase tracking-wide text-subtle">
            {t.categories.hidden}
          </h2>
          <div className={listClass}>
            {archived.map((c) => (
              <CategoryRow key={c.id} category={c} />
            ))}
          </div>
        </>
      )}
      <p className="mt-4 px-1 text-[13px] text-subtle">{t.categories.explain}</p>
    </div>
  );
}

const LANGUAGE_NAMES: Record<Locale, string> = { bg: "Български", en: "English" };

/** What the name fields start with; an older category without names shows its name in the page language. */
function initialNames(category: Category | undefined, locale: Locale): Record<Locale, string> {
  const names = { bg: "", en: "", ...category?.names };
  if (category && !category.names.bg && !category.names.en) names[locale] = category.name;
  return names;
}

function CategoryRow({ category, kind }: { category?: Category; kind?: CategoryKind }) {
  const { t, locale } = useI18n();
  const [editing, setEditing] = useState(false);
  const [icon, setIcon] = useState(category?.icon ?? "📦");
  const [names, setNames] = useState(() => initialNames(category, locale));
  // The page language first: that name is the one people usually type.
  const order = [locale, ...LOCALES.filter((l) => l !== locale)];
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ error?: string }>, after?: () => void) {
    startTransition(async () => {
      const result = await action();
      if (result.error) return setError(result.error);
      setError(undefined);
      setPicking(false);
      setEditing(false);
      after?.();
    });
  }

  const iconButton =
    "flex h-9 w-9 items-center justify-center rounded-full text-subtle transition hover:bg-cream-200 hover:text-ink disabled:opacity-50";

  if (!editing) {
    if (!category) {
      return (
        <button
          className="flex w-full items-center gap-3 px-4 py-3 text-left text-[15px] font-semibold text-pine transition hover:bg-cream/60"
          onClick={() => setEditing(true)}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-dashed border-pine/40">
            <Plus className="h-5 w-5" />
          </span>
          {t.categories.add}
        </button>
      );
    }
    return (
      <div className="flex items-center gap-3 px-4 py-3">
        <Tile className={category.archived ? "opacity-50" : ""}>{category.icon}</Tile>
        <span className={`flex-1 text-[15px] font-medium ${category.archived ? "text-subtle" : ""}`}>
          {category.name}
        </span>
        {!category.archived && (
          <button className={iconButton} onClick={() => setEditing(true)} aria-label={t.common.edit}>
            <Pencil className="h-4 w-4" />
          </button>
        )}
        <button
          className={iconButton}
          disabled={pending}
          onClick={() => run(() => setCategoryArchived(category.id, !category.archived))}
          aria-label={category.archived ? t.categories.restore : t.categories.hide}
          title={category.archived ? t.categories.restore : t.categories.hide}
        >
          {category.archived ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
      </div>
    );
  }

  return (
    <form
      className="space-y-3 bg-cream/50 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () => saveCategory({ id: category?.id, names, icon, kind: category?.kind ?? kind! }),
          () => {
            if (!category) {
              setNames(initialNames(undefined, locale));
              setIcon("📦");
            }
          },
        );
      }}
    >
      <div className="flex items-end gap-2">
        <div className="shrink-0">
          <Label>{t.categories.emoji}</Label>
          <button
            type="button"
            onClick={() => setPicking((p) => !p)}
            aria-expanded={picking}
            aria-label={t.categories.emoji}
            className={`flex h-[50px] w-[60px] items-center justify-center rounded-[14px] border bg-surface text-2xl transition ${
              picking ? "border-pine ring-2 ring-pine/15" : "border-line-strong"
            }`}
          >
            {icon}
          </button>
        </div>
        <label className="block min-w-0 flex-1">
          <Label hint={LANGUAGE_NAMES[order[0]]}>{t.categories.name}</Label>
          <Input
            value={names[order[0]]}
            maxLength={40}
            onChange={(e) => setNames((n) => ({ ...n, [order[0]]: e.target.value }))}
            autoFocus
          />
        </label>
      </div>
      {order.slice(1).map((l) => (
        <label key={l} className="block">
          <Label hint={t.categories.otherLanguageHint}>{LANGUAGE_NAMES[l]}</Label>
          <Input
            value={names[l]}
            maxLength={40}
            lang={l}
            placeholder={names[order[0]]}
            onChange={(e) => setNames((n) => ({ ...n, [l]: e.target.value }))}
          />
        </label>
      ))}

      {picking && (
        <div className="rounded-[16px] border border-line bg-surface p-2">
          <div className="grid grid-cols-8 gap-1">
            {CATEGORY_EMOJI.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setIcon(emoji);
                  setPicking(false);
                }}
                className={`flex aspect-square items-center justify-center rounded-[10px] text-[22px] transition hover:bg-cream-200 ${
                  emoji === icon ? "bg-pine-50 ring-1 ring-pine" : ""
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <input
            placeholder={t.categories.customEmoji}
            aria-label={t.categories.customEmoji}
            onChange={(e) => {
              // Only an emoji is taken from here; any other text is ignored.
              const emoji = firstEmoji(e.target.value);
              if (emoji) {
                setIcon(emoji);
                setPicking(false);
              }
            }}
            className="mt-2 h-11 w-full rounded-[12px] border border-line bg-cream/50 px-3 text-center placeholder:text-faint focus:border-pine focus:outline-none"
          />
        </div>
      )}

      <ErrorText>{error}</ErrorText>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            // Drop unsaved changes so reopening shows what is stored.
            setNames(initialNames(category, locale));
            setIcon(category?.icon ?? "📦");
            setPicking(false);
            setError(undefined);
            setEditing(false);
          }}
        >
          {t.common.cancel}
        </Button>
        <Button className="flex-1" disabled={pending}>
          {t.common.save}
        </Button>
      </div>
    </form>
  );
}
