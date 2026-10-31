import { Suspense } from "react";
import { getI18n } from "@/i18n/server";
import { AuthShell } from "@/components/auth-shell";
import { JoinButton } from "./join-button";

export default async function JoinPage({ params }: PageProps<"/[lang]/join/[code]">) {
  const { t } = await getI18n();
  return (
    <AuthShell title={t.join.title} subtitle={t.join.text}>
      <Suspense>
        <JoinButton params={params} />
      </Suspense>
    </AuthShell>
  );
}
