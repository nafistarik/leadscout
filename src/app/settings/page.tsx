import type { Metadata } from "next";
import SettingsClient from "@/components/settings/settings-client";

export const metadata: Metadata = {
  title: "Settings",
  description: "Theme preference, demo-mode info, data sources, and local-data reset.",
};

export default function SettingsPage() {
  return <SettingsClient />;
}
