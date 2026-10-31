import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserId } from "@/lib/data";
import { getI18n } from "@/i18n/server";
import { AuthShell } from "@/components/auth-shell";
import { OnboardingForms } from "./onboarding-forms";

export default async function OnboardingPage() {
  const { t } = await getI18n();
  return (
    <AuthShell title={t.onboarding.welcome} subtitle={t.onboarding.intro}>
      <Suspense>
        <RedirectIfMember />
      </Suspense>
      <OnboardingForms />
    </AuthShell>
  );
}

async function RedirectIfMember() {
  const { supabase, userId } = await getUserId();
  const { data } = await supabase.from("members").select("household_id").eq("user_id", userId).maybeSingle();
  if (data) redirect("/");
  return null;
}
