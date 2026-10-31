import { ImageResponse } from "next/og";
import { BRAND, LOGO_FLAP, LOGO_LEAF, LOGO_VIEWBOX } from "@/lib/logo";

/**
 * App icon: the logo mark on cream, full-bleed so iOS can round it. At the default scale the mark
 * stays inside the maskable safe zone; the favicon fills more of its tiny square.
 */
export function renderIcon(size: number, scale = 0.6) {
  const mark = Math.round(size * scale);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND.cream,
        }}
      >
        <svg viewBox={LOGO_VIEWBOX} width={mark} height={Math.round(mark * 0.86)}>
          <path fill={BRAND.terracotta} d={LOGO_FLAP} />
          <path fill={BRAND.pine} d={LOGO_LEAF} />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
