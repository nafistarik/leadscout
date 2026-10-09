import type { Metadata } from "next";
import ListsClient from "@/components/lists/lists-client";

export const metadata: Metadata = {
  title: "Lists",
  description: "Create and manage local-only lead lists stored in your browser.",
};

export default function ListsPage() {
  return <ListsClient />;
}
