"use client";

import { useState, useSyncExternalStore } from "react";
import { Share, X } from "lucide-react";
import { useI18n } from "@/i18n/client";

const DISMISS_KEY = "install-hint-dismissed";

function shouldShow() {
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone =
    ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone) ||
    window.matchMedia("(display-mode: standalone)").matches;
  let dismissed = false;
  try {
    dismissed = localStorage.getItem(DISMISS_KEY) === "1";
  } catch {}
  return isIOS && !standalone && !dismissed;
}

const subscribe = () => () => {};

/** iOS never shows an install prompt, so explain the Share → Add to Home Screen steps. */
export function InstallHint() {
  const { t } = useI18n();
  const show = useSyncExternalStore(subscribe, shouldShow, () => false);
  const [hidden, setHidden] = useState(false);
  if (!show || hidden) return null;

  return (
    <div className="mt-4 flex items-start gap-3 rounded-[16px] border border-pine-100 bg-pine-50 p-3.5 text-sm text-ink-soft">
      <Share className="mt-0.5 h-5 w-5 shrink-0 text-pine" strokeWidth={1.75} />
      <p className="flex-1">{t.install.hint}</p>
      <button
        className="-m-1.5 flex h-8 w-8 items-center justify-center rounded-full text-subtle hover:bg-pine-100"
        aria-label={t.common.dismiss}
        onClick={() => {
          try {
            localStorage.setItem(DISMISS_KEY, "1");
          } catch {}
          setHidden(true);
        }}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
