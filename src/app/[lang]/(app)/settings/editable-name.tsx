"use client";

import { useState, useTransition } from "react";
import { useI18n } from "@/i18n/client";
import { Button, ErrorText, Input, Label } from "@/components/ui";

export function EditableName({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string;
  onSave: (name: string) => Promise<{ error?: string }>;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const dirty = draft.trim() !== value;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await onSave(draft);
          setError(result.error);
        });
      }}
    >
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input value={draft} maxLength={40} onChange={(e) => setDraft(e.target.value)} />
        {dirty && <Button disabled={pending}>{t.common.save}</Button>}
      </div>
      {error && (
        <div className="mt-2">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
    </form>
  );
}
