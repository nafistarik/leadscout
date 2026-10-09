"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SaveLeadButton({
  saved,
  onToggle,
  companyName,
  size = "sm",
}: {
  saved: boolean;
  onToggle: () => void;
  companyName: string;
  size?: "sm" | "md";
}) {
  return (
    <Button
      type="button"
      variant={saved ? "primary" : "secondary"}
      size={size}
      onClick={onToggle}
      aria-pressed={saved}
      aria-label={saved ? `Unsave ${companyName}` : `Save ${companyName}`}
    >
      {saved ? <BookmarkCheck className="h-4 w-4" aria-hidden="true" /> : <Bookmark className="h-4 w-4" aria-hidden="true" />}
      {saved ? "Saved" : "Save"}
    </Button>
  );
}
