import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wallet Diet",
    short_name: "Wallet Diet",
    description: "Shared income and expense tracker",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f8f3ea",
    theme_color: "#f8f3ea",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "Add payment", url: "/add" }],
  };
}
