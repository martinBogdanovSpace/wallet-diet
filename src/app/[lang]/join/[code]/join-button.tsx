"use client";

import { use, useActionState } from "react";
import { joinHousehold, type FormState } from "@/app/actions/household";
import { useI18n } from "@/i18n/client";
import { Button, ErrorText } from "@/components/ui";

export function JoinButton({ params }: { params: Promise<{ code: string }> }) {
  const { t } = useI18n();
  const { code } = use(params);
  const [state, action, pending] = useActionState<FormState, FormData>(joinHousehold, {});

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="code" value={code} />
      <ErrorText>{state.error}</ErrorText>
      <Button className="w-full" disabled={pending}>
        {pending ? t.onboarding.joining : t.onboarding.join}
      </Button>
    </form>
  );
}
