"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Save toggle. Once saved it turns quiet (ghost style), because clicking it
 * again removes the lead and should not be the loudest button on the row.
 *
 * @param savedLabel Text while saved: "Saved" in search results, "Remove" on Saved Leads.
 */
export function SaveLeadButton({
  saved,
  onToggle,
  companyName,
  size = "sm",
  savedLabel = "Saved",
}: {
  saved: boolean;
  onToggle: () => void;
  companyName: string;
  size?: "sm" | "md";
  savedLabel?: string;
}) {
  return (
    <Button
      type="button"
      variant={saved ? "ghost" : "secondary"}
      size={size}
      onClick={onToggle}
      aria-pressed={saved}
      aria-label={saved ? `Unsave ${companyName}` : `Save ${companyName}`}
      title={saved ? "Remove from saved leads" : undefined}
    >
      {saved ? <BookmarkCheck className="h-4 w-4" aria-hidden="true" /> : <Bookmark className="h-4 w-4" aria-hidden="true" />}
      {saved ? savedLabel : "Save"}
    </Button>
  );
}
