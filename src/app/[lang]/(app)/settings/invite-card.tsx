"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { Check, RefreshCw, Share2, Users } from "lucide-react";
import { regenerateInvite } from "@/app/actions/household";
import { useI18n } from "@/i18n/client";
import { Button } from "@/components/ui";

const subscribe = () => () => {};

export function InviteCard({ code }: { code: string }) {
  const { t } = useI18n();
  const origin = useSyncExternalStore(subscribe, () => window.location.origin, () => "");
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const link = `${origin}/join/${code}`;

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: t.settings.shareTitle, url: link });
        return;
      } catch {
        // Cancelled or unsupported: fall back to copying.
      }
    }
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="rounded-[20px] border border-line bg-surface p-5">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-pine" strokeWidth={1.75} />
        <h2 className="font-serif text-xl font-medium">{t.settings.inviteTitle}</h2>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-subtle">{t.settings.inviteText}</p>

      <div className="mt-4 flex items-center gap-2">
        <code className="flex-1 rounded-[12px] border border-line-strong bg-cream px-4 py-2.5 text-center font-mono text-lg font-semibold tracking-[0.2em] text-ink">
          {code}
        </code>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(async () => void (await regenerateInvite()))}
          aria-label={t.settings.newCode}
          title={t.settings.newCodeHint}
          className="flex h-11 w-11 items-center justify-center rounded-[12px] text-subtle transition hover:bg-cream-200 hover:text-ink disabled:opacity-50"
        >
          <RefreshCw className={`h-[18px] w-[18px] ${pending ? "animate-spin" : ""}`} />
        </button>
      </div>

      <Button className="mt-3 w-full" onClick={share}>
        {copied ? <Check className="h-[18px] w-[18px]" /> : <Share2 className="h-[18px] w-[18px]" />}
        {copied ? t.settings.copied : t.settings.share}
      </Button>
    </section>
  );
}
