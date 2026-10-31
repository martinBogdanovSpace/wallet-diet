"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CloudOff } from "lucide-react";
import { saveTransaction } from "@/app/actions/transactions";
import { dequeue, QUEUE_CHANGED, readQueue } from "@/lib/offline-queue";
import { useI18n } from "@/i18n/client";
import { toast } from "@/components/toast";

let flushing = false;

/** Sends entries saved offline once the phone is back online, and shows how many are waiting. */
export function OfflineSync() {
  const { t, f } = useI18n();
  const router = useRouter();
  const [waiting, setWaiting] = useState(0);

  useEffect(() => {
    async function flush() {
      const queue = readQueue();
      setWaiting(queue.length);
      if (flushing || !queue.length || !navigator.onLine) return;
      flushing = true;
      let synced = 0;
      try {
        for (const item of queue) {
          const result = await saveTransaction(item);
          // A rejected entry won't succeed on a retry either, so say why and drop it.
          if (result.error) toast(result.error);
          else synced++;
          dequeue(item.client_id);
        }
      } catch {
        // Still offline after all; the rest waits for the next chance.
      } finally {
        flushing = false;
      }
      if (synced) {
        toast(f(t.offline.synced, { count: synced }));
        router.refresh();
      }
    }

    const onChange = () => setWaiting(readQueue().length);
    const onVisible = () => document.visibilityState === "visible" && flush();
    flush();
    window.addEventListener("online", flush);
    window.addEventListener(QUEUE_CHANGED, onChange);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", flush);
      window.removeEventListener(QUEUE_CHANGED, onChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, t, f]);

  if (!waiting) return null;
  return (
    <p className="mb-1 mt-3 flex items-center gap-2 rounded-full bg-warn-50 px-4 py-2 text-[13px] font-medium text-warn">
      <CloudOff className="h-4 w-4 shrink-0" />
      {f(t.offline.pending, { count: waiting })}
    </p>
  );
}
