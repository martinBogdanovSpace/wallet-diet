import { BRAND, LOGO_FLAP, LOGO_LEAF, LOGO_VIEWBOX } from "@/lib/logo";

/** The two-colour mark on its own; `size` is its width. */
export function LogoMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox={LOGO_VIEWBOX}
      width={size}
      height={size * 0.86}
      className={`shrink-0 ${className}`}
    >
      <path fill={BRAND.terracotta} d={LOGO_FLAP} />
      <path fill={BRAND.pine} d={LOGO_LEAF} />
    </svg>
  );
}

/** Mark plus the "Wallet Diet" wordmark. */
export function Logo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span className="font-bold tracking-tight" style={{ fontSize: size * 0.62 }}>
        <span className="text-pine">Wallet</span> <span className="text-terracotta">Diet</span>
      </span>
    </span>
  );
}
