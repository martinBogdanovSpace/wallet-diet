import { Suspense } from "react";
import { getCategories, getContext } from "@/lib/data";
import { getI18n } from "@/i18n/server";
import { PageHeader, Skeleton } from "@/components/ui";
import { TransactionForm } from "@/components/transaction-form";

export default async function AddPage({ searchParams }: PageProps<"/[lang]/add">) {
  const { t } = await getI18n();
  return (
    <>
      <PageHeader title={t.tx.addTitle} />
      <Suspense fallback={<Skeleton className="h-[480px]" />}>
        <AddForm searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function AddForm({ searchParams }: { searchParams: PageProps<"/[lang]/add">["searchParams"] }) {
  const { type } = await searchParams;
  const [{ today }, categories] = await Promise.all([getContext(), getCategories()]);
  const defaultType = type === "income" || type === "withdrawal" ? type : "expense";
  return (
    <TransactionForm key={defaultType} categories={categories} today={today} defaultType={defaultType} />
  );
}
