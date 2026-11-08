import type { MetadataRoute } from "next";

/**
 * Web app manifest: lets LeadScout be installed from the browser (desktop,
 * Android, iOS "Add to Home Screen") and open in its own window.
 * No service worker on purpose: searching needs the network, and saved leads
 * already live in the browser, so an offline cache would add stale-deploy
 * risk for little gain.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LeadScout — Find businesses that need a website",
    short_name: "LeadScout",
    description:
      "Find local businesses with no website or a weak one, message them on WhatsApp or email, and track every lead.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#e9eef5",
    theme_color: "#e9eef5",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
