import type { Metadata } from "next";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "LeadScout dashboard with genuine search statistics, saved leads, and local-data management.",
};

export default function DashboardPage() {
  return <DashboardClient />;
}
