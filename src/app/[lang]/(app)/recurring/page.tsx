import { Suspense } from "react";
import { getCategories, getContext, getRecurring } from "@/lib/data";
import { getI18n } from "@/i18n/server";
import { PageHeader, Skeleton } from "@/components/ui";
import { RecurringManager } from "./recurring-manager";

export default async function RecurringPage() {
  const { t } = await getI18n();
  return (
    <>
      <PageHeader title={t.recurring.title} back={{ href: "/settings", label: t.settings.title }} />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Recurring />
      </Suspense>
    </>
  );
}

async function Recurring() {
  const [{ today }, rules, categories] = await Promise.all([getContext(), getRecurring(), getCategories()]);
  return <RecurringManager rules={rules} categories={categories} today={today} />;
}
