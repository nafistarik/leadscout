import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Required OpenStreetMap attribution for Nominatim/Overpass-powered results.
 * See https://www.openstreetmap.org/copyright and
 * https://operations.osmfoundation.org/policies/nominatim/.
 */
export function OsmAttribution({ compact = false }: { compact?: boolean }) {
  return (
    <p className="text-xs leading-relaxed text-ink3">
      {compact ? null : "Live results use mapped data. "}
      <span>
        ©{" "}
        <Link
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-accent-ink underline-offset-2 hover:underline"
        >
          OpenStreetMap
        </Link>{" "}
        contributors
      </span>
      <span aria-hidden="true"> · </span>
      <span>Coverage depends on available community-mapped data and varies by area.</span>
    </p>
  );
}

export function OsmSourceBadge() {
  return (
    <Badge tone="info">
      OpenStreetMap
      <ExternalLink className="h-3 w-3" aria-hidden="true" />
    </Badge>
  );
}
