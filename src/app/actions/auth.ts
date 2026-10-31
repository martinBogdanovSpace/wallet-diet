"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActionI18n } from "@/i18n/server";
import { friendlyError } from "@/i18n/errors";
import { MAX_NAME } from "@/lib/limits";

export type AuthState = { error?: string; message?: string };

function safeNext(next: FormDataEntryValue | null) {
  const value = typeof next === "string" ? next : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  const { t } = await getActionI18n();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return { error: friendlyError(error.message, t) };
  redirect(safeNext(formData.get("next")));
}

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  const { t } = await getActionI18n();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!name) return { error: t.errors.enterName };
  if (name.length > MAX_NAME) return { error: t.errors.nameTooLong };
  if (password.length < 8) return { error: t.errors.passwordShort };
  if (password !== String(formData.get("confirm") ?? "")) return { error: t.errors.passwordMismatch };

  const supabase = await createClient();
  // The confirmation link must point at the real site, so prefer the configured address.
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? (await headers()).get("origin") ?? "";
  const next = safeNext(formData.get("next"));
  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? "").trim(),
    password,
    options: {
      data: { name },
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { error: friendlyError(error.message, t) };
  if (!data.session) return { message: t.errors.checkEmail };
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
