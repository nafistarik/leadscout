import Link from "next/link";

const LINK_CLASS = "font-medium text-accent-ink underline-offset-2 hover:underline";

/**
 * Required attribution for both data sources: OpenStreetMap for live
 * Nominatim/Overpass results, Overture Maps for prepared-city results.
 * See https://www.openstreetmap.org/copyright,
 * https://operations.osmfoundation.org/policies/nominatim/ and
 * https://docs.overturemaps.org/attribution/.
 */
export function OsmAttribution({ compact = false }: { compact?: boolean }) {
  return (
    <p className="text-xs leading-relaxed text-ink3">
      {compact ? null : "Results use mapped data. "}
      <span>
        ©{" "}
        <Link href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
          OpenStreetMap
        </Link>{" "}
        contributors
      </span>
      <span aria-hidden="true"> · </span>
      <span>
        ©{" "}
        <Link href="https://docs.overturemaps.org/attribution/" target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
          Overture Maps Foundation
        </Link>
      </span>
      <span aria-hidden="true"> · </span>
      <span>Coverage depends on available community-mapped data and varies by area.</span>
    </p>
  );
}

