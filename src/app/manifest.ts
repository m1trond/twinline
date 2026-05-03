import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Twinline",
    short_name: "Twinline",
    description: "Приватное пространство для двоих",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#071216",
    theme_color: "#37c6b8",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/twinline-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/twinline-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
