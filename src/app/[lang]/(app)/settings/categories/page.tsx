import { Suspense } from "react";
import { getCategories } from "@/lib/data";
import { getI18n } from "@/i18n/server";
import { PageHeader, Skeleton } from "@/components/ui";
import { CategoryManager } from "./category-manager";

export default async function CategoriesPage() {
  const { t } = await getI18n();
  return (
    <>
      <PageHeader title={t.categories.title} back={{ href: "/settings", label: t.settings.title }} />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Categories />
      </Suspense>
    </>
  );
}

async function Categories() {
  return <CategoryManager categories={await getCategories()} />;
}
