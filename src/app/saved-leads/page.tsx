import type { Metadata } from "next";
import SavedLeadsClient from "@/components/saved-leads/saved-leads-client";

export const metadata: Metadata = {
  title: "Saved Leads",
  description: "Review demo leads saved locally in your browser.",
};

export default function SavedLeadsPage() {
  return <SavedLeadsClient />;
}
