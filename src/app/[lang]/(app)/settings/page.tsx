import { Suspense } from "react";
import Link from "next/link";
import { ChartColumn, ChevronRight, Download, LogOut, PiggyBank, Repeat, Shapes, Wallet, type LucideIcon } from "lucide-react";
import { getContext, getStartingBalance } from "@/lib/data";
import { getI18n } from "@/i18n/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { signOut } from "@/app/actions/auth";
import { Avatar, Button, Card, Label, PageHeader, Skeleton } from "@/components/ui";
import { EditableName } from "./editable-name";
import { InviteCard } from "./invite-card";
import { StartingBalance } from "./starting-balance";
import { updateHouseholdName, updateMyName } from "@/app/actions/household";

export default async function SettingsPage() {
  const { t } = await getI18n();
  return (
    <>
      <PageHeader title={t.settings.title} />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Settings />
      </Suspense>
    </>
  );
}

function NavRow({ href, Icon, label }: { href: string; Icon: LucideIcon; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3.5 px-4 py-3.5 transition hover:bg-cream/60">
      <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-pine-50 text-pine">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </span>
      <span className="flex-1 text-[15px] font-medium">{label}</span>
      <ChevronRight className="h-5 w-5 text-faint" />
    </Link>
  );
}

async function Settings() {
  const [ctx, { t }, startingBalance] = await Promise.all([getContext(), getI18n(), getStartingBalance()]);

  return (
    <div className="space-y-4 pb-4">
      <div className="divide-y divide-line overflow-hidden rounded-[20px] border border-line bg-surface">
        <NavRow href="/goals" Icon={PiggyBank} label={t.settings.goalsLink} />
        <NavRow href="/year" Icon={ChartColumn} label={t.settings.yearLink} />
        <NavRow href="/recurring" Icon={Repeat} label={t.settings.recurringLink} />
        <NavRow href="/settings/categories" Icon={Shapes} label={t.settings.categoriesLink} />
        <NavRow href="/cash" Icon={Wallet} label={t.settings.cashLink} />
        {/* A plain link: the browser downloads the file instead of navigating. */}
        <a href="/export" download className="flex items-center gap-3.5 px-4 py-3.5 transition hover:bg-cream/60">
          <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-pine-50 text-pine">
            <Download className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </span>
          <span className="flex-1">
            <span className="block text-[15px] font-medium">{t.settings.export}</span>
            <span className="block text-[13px] text-subtle">{t.settings.exportHint}</span>
          </span>
        </a>
      </div>

      <InviteCard code={ctx.household.invite_code} />

      <Card className="space-y-5">
        <EditableName label={t.settings.yourName} value={ctx.me.name} onSave={updateMyName} />
        <EditableName label={t.settings.householdName} value={ctx.household.name} onSave={updateHouseholdName} />
        <StartingBalance cents={startingBalance} />
        <div>
          <Label>{t.settings.members}</Label>
          <ul className="space-y-2.5">
            {ctx.members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 text-[15px]">
                <Avatar name={m.name} />
                <span>
                  {m.name}
                  {m.id === ctx.userId && <span className="text-subtle"> {t.settings.you}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <Card>
        <Label>{t.language.label}</Label>
        <LanguageSwitcher />
      </Card>

      <form action={signOut}>
        <Button variant="ghost" className="w-full text-danger hover:bg-expense-50">
          <LogOut className="h-[18px] w-[18px]" />
          {t.settings.signOut}
        </Button>
      </form>
    </div>
  );
}
