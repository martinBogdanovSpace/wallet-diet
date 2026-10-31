"use client";

import { switchLocale, useI18n } from "@/i18n/client";
import { Segmented } from "@/components/ui";

export function LanguageSwitcher() {
  const { locale } = useI18n();
  return (
    <Segmented
      value={locale}
      onChange={(next) => next !== locale && switchLocale(next)}
      options={[
        { value: "bg", label: "Български" },
        { value: "en", label: "English" },
      ]}
    />
  );
}
