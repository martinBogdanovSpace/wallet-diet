import { renderIcon } from "@/lib/icon";

export function generateStaticParams() {
  return [{ size: "192" }, { size: "512" }];
}

export async function GET(_: Request, ctx: RouteContext<"/icons/[size]">) {
  const { size } = await ctx.params;
  return renderIcon(size === "192" ? 192 : 512);
}
