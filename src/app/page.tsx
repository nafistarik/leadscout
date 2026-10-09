import type { Metadata } from "next";
import DashboardClient from "@/components/dashboard/dashboard-client";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "LeadScout demo dashboard with sample companies, saved leads, and lists.",
};

export default function DashboardPage() {
  return <DashboardClient />;
}
