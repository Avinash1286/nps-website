import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nepal Police School Garuda",
    short_name: "NPS Garuda",
    description: "The official digital campus of Nepal Police School Garuda.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7faff",
    theme_color: "#061f4e",
    icons: [{ src: "/media/nps-logo.png", sizes: "any", type: "image/png" }],
  };
}
