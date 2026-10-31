"use client";

import { useActionState } from "react";
import { House, UserPlus } from "lucide-react";
import { createHousehold, joinHousehold, type FormState } from "@/app/actions/household";
import { useI18n } from "@/i18n/client";
import { Button, Card, ErrorText, Input, Label } from "@/components/ui";

export function OnboardingForms() {
  const { t } = useI18n();
  const [createState, createAction, creating] = useActionState<FormState, FormData>(createHousehold, {});
  const [joinState, joinAction, joining] = useActionState<FormState, FormData>(joinHousehold, {});

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-4 flex items-center gap-2 font-serif text-xl font-medium">
          <House className="h-5 w-5 text-pine" strokeWidth={1.75} />
          {t.onboarding.createTitle}
        </h2>
        <form
          action={(formData) => {
            // The household's timezone decides what "today" and "this month" mean.
            formData.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
            return createAction(formData);
          }}
          className="space-y-4"
        >
          <label className="block">
            <Label>{t.onboarding.name}</Label>
            <Input name="name" placeholder={t.onboarding.namePlaceholder} maxLength={40} required />
          </label>
          <ErrorText>{createState.error}</ErrorText>
          <Button className="w-full" disabled={creating}>
            {creating ? t.onboarding.creating : t.onboarding.create}
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 flex items-center gap-2 font-serif text-xl font-medium">
          <UserPlus className="h-5 w-5 text-pine" strokeWidth={1.75} />
          {t.onboarding.joinTitle}
        </h2>
        <form action={joinAction} className="space-y-4">
          <label className="block">
            <Label>{t.onboarding.inviteCode}</Label>
            <Input
              name="code"
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="a1b2c3d4e5f6"
              className="font-mono tracking-widest"
              required
            />
          </label>
          <ErrorText>{joinState.error}</ErrorText>
          <Button variant="secondary" className="w-full" disabled={joining}>
            {joining ? t.onboarding.joining : t.onboarding.join}
          </Button>
        </form>
      </Card>
    </div>
  );
}
