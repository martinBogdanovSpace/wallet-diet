import { Banknote, CreditCard, Landmark, type LucideProps } from "lucide-react";
import type { Method } from "@/lib/types";

const ICONS = { cash: Banknote, card: CreditCard, transfer: Landmark };

export function MethodIcon({ method, ...props }: { method: Method } & LucideProps) {
  const Icon = ICONS[method];
  return <Icon {...props} />;
}
