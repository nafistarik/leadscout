import type { Metadata } from "next";
import { RecentSearchesSection } from "@/components/recent-searches/recent-searches-section";
import { SavedLeadsSection } from "@/components/saved-leads/saved-leads-section";

export const metadata: Metadata = {
  title: "Saved Leads",
  description: "Review businesses saved locally in your browser.",
};

export default function SavedLeadsPage() {
  return (
    <div className="space-y-8">
      <p className="max-w-3xl text-sm leading-relaxed text-ink2">
        Businesses you saved from search results, with their contact details and website checks.
        Saved leads stay in this browser after a refresh.
      </p>
      <SavedLeadsSection />
      <RecentSearchesSection />
    </div>
  );
}
