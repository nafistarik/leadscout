import type { Metadata } from "next";
import { Suspense } from "react";
import { FindCompaniesClient } from "@/components/find-companies/find-companies-client";

export const metadata: Metadata = {
  title: "Find Companies",
  description: "Filter the local demo company dataset. Live public-data search arrives in Part 2.",
};

export default function FindCompaniesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading search…</p>}>
      <FindCompaniesClient />
    </Suspense>
  );
}
