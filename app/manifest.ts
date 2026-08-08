import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nepal Police School Garuda",
    short_name: "NPS Garuda",
    description: "The official digital campus of Nepal Police School Garuda.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8fd",
    theme_color: "#1e1f5c",
    icons: [{ src: "/media/nps-logo.png", sizes: "any", type: "image/png" }],
  };
}
