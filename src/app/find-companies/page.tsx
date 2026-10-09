import type { Metadata } from "next";
import { Suspense } from "react";
import { FindCompaniesClient } from "@/components/find-companies/find-companies-client";

export const metadata: Metadata = {
  title: "Find Companies",
  description: "Discover real businesses via OpenStreetMap, or browse the local demo dataset.",
};

export default function FindCompaniesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink3">Loading search…</p>}>
      <FindCompaniesClient />
    </Suspense>
  );
}
