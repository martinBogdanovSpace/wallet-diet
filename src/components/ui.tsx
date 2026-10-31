import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ChevronLeft, CircleAlert } from "lucide-react";

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`rounded-[20px] border border-line bg-surface p-5 ${className}`} {...props} />;
}

const BUTTON_VARIANTS = {
  primary: "bg-pine text-on-pine shadow-sm hover:bg-pine-dark",
  secondary: "border border-line-strong bg-surface text-ink hover:bg-cream-200",
  danger: "border border-expense/25 bg-surface text-danger hover:bg-expense-50",
  /** The second tap of a two-tap delete. */
  confirm: "bg-danger text-white hover:bg-danger/90",
  ghost: "text-ink-soft hover:bg-cream-200",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: keyof typeof BUTTON_VARIANTS }) {
  return (
    <button
      className={`inline-flex h-[50px] items-center justify-center gap-2 rounded-[14px] px-5 text-[15px] font-semibold transition active:scale-[0.98] disabled:opacity-60 ${BUTTON_VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export const fieldClass =
  "h-[50px] w-full rounded-[14px] border border-line-strong bg-surface px-4 text-ink placeholder:text-faint focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/15";

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`${fieldClass} ${className}`} {...props} />;
}

export function Label({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <span className="mb-2 flex items-baseline justify-between gap-2 text-[13px] font-semibold uppercase tracking-wide text-subtle">
      {children}
      {hint && <span className="text-xs font-normal normal-case tracking-normal text-faint">{hint}</span>}
    </span>
  );
}

export function ErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="flex items-center gap-2 text-sm text-danger">
      <CircleAlert className="h-4 w-4 shrink-0" />
      {children}
    </p>
  );
}

/** Tab track for picking one of a few options. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className = "",
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={`flex rounded-[14px] bg-cream-300/70 p-1 ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[11px] px-2 text-sm transition ${
            value === o.value
              ? "bg-surface font-semibold text-ink shadow-sm"
              : "font-medium text-subtle hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Serif page title, with an optional back link, eyebrow and action. */
export function PageHeader({
  title,
  eyebrow,
  back,
  action,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  back?: { href: string; label: string };
  action?: ReactNode;
}) {
  return (
    <header className="pb-5 pt-6 md:pt-10">
      {back && (
        <Link
          href={back.href}
          className="-ml-2 mb-2 inline-flex h-9 items-center gap-1 rounded-full pl-1 pr-3 text-sm font-medium text-subtle hover:bg-cream-200 hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" />
          {back.label}
        </Link>
      )}
      {eyebrow && <p className="text-[13px] font-semibold uppercase tracking-wide text-subtle">{eyebrow}</p>}
      <div className="flex items-end justify-between gap-3">
        <h1 className="font-serif text-[34px] font-medium leading-tight tracking-tight text-ink">{title}</h1>
        {action}
      </div>
    </header>
  );
}

/** A titled block of a page. */
export function Section({
  title,
  action,
  children,
  className = "",
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`mt-8 ${className}`}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-[22px] font-medium text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function TextLink({ className = "", ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={`text-sm font-semibold text-pine underline-offset-4 hover:underline ${className}`}
      {...props}
    />
  );
}

/** Square oatmeal tile holding an emoji or icon. */
export function Tile({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-cream-200 text-[22px] ${className}`}
    >
      {children}
    </span>
  );
}

export function Avatar({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pine-50 text-sm font-semibold text-pine ${className}`}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

const STACK_COLORS = ["bg-pine text-on-pine", "bg-[#c9a77c] text-[#231d17]", "bg-sage text-[#231d17]"];

/** Overlapping initials of the household members. */
export function AvatarStack({ names }: { names: string[] }) {
  return (
    <span className="flex" title={names.join(", ")}>
      {names.map((name, i) => (
        <span
          key={i}
          className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-cream text-sm font-semibold ${
            STACK_COLORS[i % STACK_COLORS.length]
          } ${i > 0 ? "-ml-2.5" : ""}`}
        >
          {name.trim().charAt(0).toUpperCase() || "?"}
        </span>
      ))}
    </span>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[20px] bg-cream-200 ${className}`} />;
}
