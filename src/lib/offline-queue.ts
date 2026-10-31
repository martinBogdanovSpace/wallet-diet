import type { TxInput } from "@/app/actions/transactions";

const KEY = "wallet-diet:queue";
export const QUEUE_CHANGED = "offline-queue:changed";

/** New entries saved on this phone while there was no connection. */
export function readQueue(): TxInput[] {
  try {
    const items = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function writeQueue(items: TxInput[]) {
  try {
    if (items.length) localStorage.setItem(KEY, JSON.stringify(items));
    else localStorage.removeItem(KEY);
  } catch {
    // Storage can be unavailable (private mode); the entry is then lost, as it would be without the queue.
  }
  window.dispatchEvent(new Event(QUEUE_CHANGED));
}

export function enqueue(input: TxInput) {
  writeQueue([...readQueue(), input]);
}

export function dequeue(clientId: string | undefined) {
  writeQueue(readQueue().filter((item) => item.client_id !== clientId));
}

/** True when a Server Action failed because the request never got an answer. */
export function isNetworkError(error: unknown) {
  return !navigator.onLine || error instanceof TypeError;
}

/** A random UUID, also on plain-http test addresses where crypto.randomUUID is missing. */
export function newId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
