import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { LanguageSwitcher } from "@/components/language-switcher";

/** Centered frame for the screens shown before you're inside a household. */
export function AuthShell({ title, subtitle, children }: { title: ReactNode; subtitle: ReactNode; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-10 pt-[calc(env(safe-area-inset-top)+3rem)]">
      <div className="flex flex-1 flex-col justify-center-safe">
        <Logo size={44} />
        <h1 className="mt-8 font-serif text-[36px] font-medium leading-tight tracking-tight">{title}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-subtle">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </div>
      <div className="mx-auto mt-10 w-full max-w-xs">
        <LanguageSwitcher />
      </div>
    </main>
  );
}
