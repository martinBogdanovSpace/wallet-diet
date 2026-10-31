"use client";

import Link from "next/link";
import { CircleAlert, SearchX } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { Button } from "@/components/ui";

/** Full-width message for a page that failed to load or doesn't exist. */
export function ErrorView({ kind, retry }: { kind: "error" | "notFound"; retry?: () => void }) {
  const { t } = useI18n();
  const Icon = kind === "error" ? CircleAlert : SearchX;
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-5 py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-cream-200 text-ink-soft">
        <Icon className="h-7 w-7" strokeWidth={1.75} />
      </span>
      <h1 className="mt-5 font-serif text-[26px] font-medium">
        {kind === "error" ? t.errors.pageTitle : t.errors.notFoundTitle}
      </h1>
      <p className="mt-2 text-[15px] text-subtle">{kind === "error" ? t.errors.pageText : t.errors.notFoundText}</p>
      <div className="mt-6 flex gap-2">
        {retry && <Button onClick={retry}>{t.errors.retry}</Button>}
        <Link
          href="/"
          className="inline-flex h-[50px] items-center rounded-[14px] border border-line-strong bg-surface px-5 text-[15px] font-semibold hover:bg-cream-200"
        >
          {t.nav.home}
        </Link>
      </div>
    </div>
  );
}
