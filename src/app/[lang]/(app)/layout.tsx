import { Suspense } from "react";
import { BottomNav, NavBar, SideBar, SideNav } from "@/components/bottom-nav";
import { InstallHint } from "@/components/install-hint";
import { QuickAdd } from "@/components/quick-add";
import { RealtimeSync } from "@/components/realtime-sync";
import { getCategories, getContext } from "@/lib/data";

export default function AppLayout({ children }: LayoutProps<"/[lang]">) {
  return (
    <div className="flex min-h-dvh">
      <Suspense fallback={<SideBar pathname={null} />}>
        <SideNav />
      </Suspense>
      <main className="pt-safe min-w-0 flex-1 pb-32 md:pb-12">
        <div className="mx-auto max-w-lg px-5 md:max-w-2xl md:px-10">
          <InstallHint />
          {children}
        </div>
      </main>
      <Suspense fallback={<NavBar pathname={null} />}>
        <BottomNav />
      </Suspense>
      <Suspense>
        <QuickAddDrawer />
      </Suspense>
      <RealtimeSync />
    </div>
  );
}

/** The add drawer lives in the layout so the + button can open it on every screen. */
async function QuickAddDrawer() {
  const [{ today }, categories] = await Promise.all([getContext(), getCategories()]);
  return <QuickAdd categories={categories} today={today} />;
}
