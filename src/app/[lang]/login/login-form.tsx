"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LoaderCircle, MailCheck } from "lucide-react";
import { signIn, signUp, type AuthState } from "@/app/actions/auth";
import { useI18n } from "@/i18n/client";
import { Button, ErrorText, Input, Label, Segmented } from "@/components/ui";

export function LoginForm() {
  const { t } = useI18n();
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const [mode, setMode] = useState<"signin" | "signup">(next.startsWith("/join/") ? "signup" : "signin");
  const [signInState, signInAction, signingIn] = useActionState<AuthState, FormData>(signIn, {});
  const [signUpState, signUpAction, signingUp] = useActionState<AuthState, FormData>(signUp, {});
  const state = mode === "signin" ? signInState : signUpState;
  const pending = signingIn || signingUp;

  return (
    <div className="space-y-5">
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: "signin", label: t.login.signIn },
          { value: "signup", label: t.login.createAccount },
        ]}
      />
      <form action={mode === "signin" ? signInAction : signUpAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        {mode === "signup" && (
          <label className="block">
            <Label>{t.login.yourName}</Label>
            <Input name="name" autoComplete="given-name" maxLength={40} required />
          </label>
        )}
        <label className="block">
          <Label>{t.login.email}</Label>
          <Input name="email" type="email" autoComplete="email" inputMode="email" required />
        </label>
        <label className="block">
          <Label>{t.login.password}</Label>
          <Input
            name="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            minLength={mode === "signup" ? 8 : undefined}
            required
          />
        </label>
        {params.get("error") === "confirm" && <ErrorText>{t.login.confirmInvalid}</ErrorText>}
        <ErrorText>{state.error}</ErrorText>
        {state.message && (
          <p className="flex items-start gap-2 rounded-[14px] bg-pine-50 px-4 py-3 text-sm text-pine">
            <MailCheck className="mt-0.5 h-4 w-4 shrink-0" />
            {state.message}
          </p>
        )}
        <Button className="w-full" disabled={pending}>
          {pending && <LoaderCircle className="h-[18px] w-[18px] animate-spin" />}
          {pending ? t.common.pleaseWait : mode === "signin" ? t.login.signIn : t.login.createAccount}
        </Button>
      </form>
    </div>
  );
}
