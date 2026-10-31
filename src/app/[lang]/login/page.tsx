import { Suspense } from "react";
import { getI18n } from "@/i18n/server";
import { AuthShell } from "@/components/auth-shell";
import { Skeleton } from "@/components/ui";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const { t } = await getI18n();
  return (
    <AuthShell title={t.login.title} subtitle={t.login.tagline}>
      <Suspense fallback={<Skeleton className="h-80" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
