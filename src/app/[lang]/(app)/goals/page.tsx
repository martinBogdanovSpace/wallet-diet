import { Suspense } from "react";
import { getBalanceBefore, getContext, getGoals } from "@/lib/data";
import { addDays } from "@/lib/dates";
import { getI18n } from "@/i18n/server";
import { PageHeader, Skeleton } from "@/components/ui";
import { GoalsManager } from "./goals-manager";

export default async function GoalsPage() {
  const { t } = await getI18n();
  return (
    <>
      <PageHeader title={t.goals.title} back={{ href: "/", label: t.nav.home }} />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Goals />
      </Suspense>
    </>
  );
}

async function Goals() {
  const { today } = await getContext();
  // Everything up to and including today: what the household has right now.
  const [goals, available] = await Promise.all([getGoals(), getBalanceBefore(addDays(today, 1))]);
  return <GoalsManager goals={goals} available={available} />;
}
