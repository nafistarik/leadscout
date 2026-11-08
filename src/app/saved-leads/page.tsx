import type { Metadata } from "next";
import { Suspense } from "react";
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
      {/* The section reads ?status= (links from the Dashboard), which needs a Suspense boundary. */}
      <Suspense fallback={<p className="text-sm text-ink3">Loading saved leads…</p>}>
        <SavedLeadsSection />
      </Suspense>
      <RecentSearchesSection />
    </div>
  );
}
