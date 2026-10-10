import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchClient } from "@/components/find-companies/search-client";

export const metadata: Metadata = {
  title: "Find Companies",
  description: "Discover real businesses via OpenStreetMap, check their websites, and save promising leads.",
};

export default function FindCompaniesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink3">Loading search…</p>}>
      <SearchClient />
    </Suspense>
  );
}
