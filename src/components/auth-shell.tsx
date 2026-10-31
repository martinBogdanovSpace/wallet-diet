import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { LanguageSwitcher } from "@/components/language-switcher";

/** Centered frame for the screens shown before you're inside a household. */
export function AuthShell({ title, subtitle, children }: { title: ReactNode; subtitle: ReactNode; children: ReactNode }) {
  return (
    <main className="pt-safe mx-auto flex min-h-dvh max-w-md flex-col px-5 py-10">
      <div className="flex flex-1 flex-col justify-center">
        <Logo size={44} />
        <h1 className="mt-6 font-serif text-[36px] font-medium leading-tight tracking-tight">{title}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-subtle">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </div>
      <div className="mx-auto mt-10 w-full max-w-xs">
        <LanguageSwitcher />
      </div>
    </main>
  );
}
