"use client";

import { useEffect, useState } from "react";

const EVENT = "toast:show";

/** Shows a short message above the tab bar. */
export function toast(message: string) {
  window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: message }));
}

export function Toaster() {
  const [message, setMessage] = useState<{ text: string; id: number } | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    function onToast(e: Event) {
      setMessage({ text: (e as CustomEvent<string>).detail, id: Date.now() });
      clearTimeout(timer);
      timer = setTimeout(() => setMessage(null), 2800);
    }
    window.addEventListener(EVENT, onToast);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(EVENT, onToast);
    };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+6.25rem)] z-30 flex justify-center px-4 md:bottom-8"
    >
      {message && (
        <p
          key={message.id}
          className="toast rounded-full bg-ink px-4 py-2.5 text-center text-sm font-medium text-cream shadow-lg"
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
