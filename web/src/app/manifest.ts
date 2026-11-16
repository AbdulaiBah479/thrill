import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "THRILL",
    short_name: "THRILL",
    description: "Find events in Sierra Leone. Get your pass.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0712",
    theme_color: "#0b0712",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
