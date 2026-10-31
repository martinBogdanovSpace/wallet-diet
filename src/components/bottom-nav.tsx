"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { History, House, Plus, Settings2, Target } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { Logo } from "@/components/logo";
import { addPageHref, openQuickAdd } from "@/components/quick-add";

const TABS = [
  { href: "/", key: "home", Icon: House },
  { href: "/history", key: "history", Icon: History },
  { href: "/budgets", key: "budgets", Icon: Target },
  { href: "/settings", key: "more", Icon: Settings2 },
] as const;

function isActive(href: string, pathname: string | null) {
  if (!pathname) return false;
  if (href === "/") return pathname === "/" || pathname === "/cash";
  if (href === "/settings") return ["/settings", "/recurring"].some((p) => pathname.startsWith(p));
  return pathname.startsWith(href);
}

export function BottomNav() {
  return <NavBar pathname={usePathname()} />;
}

export function SideNav() {
  return <SideBar pathname={usePathname()} />;
}

/** Phones: a floating bar with four tabs and the add button in the middle. Rendered without a pathname as the prerendered fallback. */
export function NavBar({ pathname }: { pathname: string | null }) {
  const { t } = useI18n();
  const router = useRouter();
  const tab = ({ href, key, Icon }: (typeof TABS)[number]) => {
    const active = isActive(href, pathname);
    return (
      <li key={href}>
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className={`flex flex-col items-center gap-1 py-1 text-[11px] ${
            active ? "font-semibold text-pine" : "font-medium text-subtle"
          }`}
        >
          <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2 : 1.75} />
          {t.nav[key]}
        </Link>
      </li>
    );
  };

  return (
    <nav className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-20 mx-auto max-w-lg rounded-[26px] border border-line bg-surface/95 shadow-[0_10px_30px_rgba(35,29,23,0.10)] backdrop-blur md:hidden">
      <ul className="grid h-[68px] grid-cols-5 items-center px-1">
        {TABS.slice(0, 2).map(tab)}
        <li className="flex justify-center">
          <button
            type="button"
            onClick={() => openQuickAdd() || router.push(addPageHref())}
            aria-label={t.nav.add}
            className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-pine text-on-pine shadow-lg shadow-pine/30 transition active:scale-95"
          >
            <Plus className="h-7 w-7" strokeWidth={2.25} />
          </button>
        </li>
        {TABS.slice(2).map(tab)}
      </ul>
    </nav>
  );
}

/** Tablets and up: a side menu with the brand and a prominent add button. */
export function SideBar({ pathname }: { pathname: string | null }) {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-7 border-r border-line-strong/70 px-4 py-7 md:flex">
      <Link href="/" className="px-2.5">
        <Logo size={30} />
      </Link>
      <button
        type="button"
        onClick={() => openQuickAdd() || router.push(addPageHref())}
        className="flex h-11 items-center justify-center gap-2 rounded-[14px] bg-pine text-[15px] font-semibold text-on-pine shadow-sm hover:bg-pine-dark"
      >
        <Plus className="h-5 w-5" strokeWidth={2.25} />
        {t.nav.add}
      </button>
      <nav>
        <ul className="flex flex-col gap-0.5">
          {TABS.map(({ href, key, Icon }) => {
            const active = isActive(href, pathname);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] ${
                    active ? "bg-cream-200 font-semibold text-pine" : "font-medium text-ink-soft hover:bg-cream-200/60"
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2 : 1.75} />
                  {t.nav[key]}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
