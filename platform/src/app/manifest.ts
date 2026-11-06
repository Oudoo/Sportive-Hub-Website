import type { MetadataRoute } from "next";

/** Web app manifest, served at /manifest.webmanifest. Makes the app installable on phones and desktops. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sportive Hub",
    short_name: "Sportive Hub",
    description: "Sportive Hub patient portal and admin dashboard.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F0ECE3",
    theme_color: "#595641",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
