import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getCategories, getContext, getTransaction } from "@/lib/data";
import { getI18n } from "@/i18n/server";
import { Avatar, PageHeader, Skeleton } from "@/components/ui";
import { TransactionForm } from "@/components/transaction-form";

export default async function EditTransactionPage({ params }: PageProps<"/[lang]/tx/[id]">) {
  const { t } = await getI18n();
  return (
    <>
      <PageHeader title={t.tx.editTitle} back={{ href: "/history", label: t.history.title }} />
      <Suspense fallback={<Skeleton className="h-[480px]" />}>
        <EditForm params={params} />
      </Suspense>
    </>
  );
}

async function EditForm({ params }: { params: PageProps<"/[lang]/tx/[id]">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [{ t, f }, { today, members }, categories, tx] = await Promise.all([
    getI18n(),
    getContext(),
    getCategories(),
    getTransaction(id),
  ]);
  if (!tx || tx.type === "adjustment") notFound();
  const author = members.find((m) => m.id === tx.user_id);

  return (
    <>
      {author && members.length > 1 && (
        <p className="-mt-3 mb-5 flex items-center gap-2 text-sm text-subtle">
          <Avatar name={author.name} className="h-6 w-6 text-xs" />
          {f(t.tx.addedBy, { name: author.name })}
        </p>
      )}
      <TransactionForm key={tx.id} categories={categories} today={today} initial={tx} />
    </>
  );
}
