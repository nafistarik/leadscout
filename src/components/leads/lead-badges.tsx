import { Badge, DemoBadge } from "@/components/ui/badge";
import type { DemoLead } from "@/types/lead";

export function AvailabilityBadge({ available, kind }: { available: boolean; kind: "Website" | "Phone" }) {
  if (available) {
    return <Badge tone="success">{kind} listed</Badge>;
  }
  return <Badge tone="neutral">Not available</Badge>;
}

export function DataStatusBadge({ lead }: { lead: DemoLead }) {
  void lead;
  return <DemoBadge label="Sample record" />;
}
