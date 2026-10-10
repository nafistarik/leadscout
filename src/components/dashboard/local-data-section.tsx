"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { STORAGE_KEYS } from "@/lib/storage";
import { notifyStorageChanged } from "@/hooks/use-local-storage-value";
import { useSavedLeads } from "@/hooks/use-saved-leads";
import { useSearchHistory } from "@/hooks/use-search-history";

/**
 * Local-data management: counts plus a confirmed reset of saved leads,
 * recent searches, and search statistics. Theme preference and required
 * provider/website caches are kept.
 */
export function LocalDataSection() {
  const { records } = useSavedLeads();
  const { history } = useSearchHistory();
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function handleClear() {
    try {
      // Saved leads and search history (which carries the dashboard
      // statistics). Theme preference and provider/website caches stay.
      window.localStorage.removeItem(STORAGE_KEYS.savedLeadsV2);
      window.localStorage.removeItem(STORAGE_KEYS.searchHistory);
      notifyStorageChanged();
      setMessage("Saved leads, recent searches, and search statistics were cleared from this browser.");
    } catch {
      setMessage("Could not access browser storage in this session. Nothing was changed.");
    }
    setConfirming(false);
  }

  return (
    <section aria-labelledby="local-data-heading">
      <Card>
        <CardBody>
          <h2 id="local-data-heading" className="text-sm font-semibold text-ink">
            Local data
          </h2>
          <p className="mt-1 text-sm text-ink2">
            Currently stored in this browser: {records.length} saved lead{records.length === 1 ? "" : "s"},{" "}
            {history.length} recorded search{history.length === 1 ? "" : "es"}. Your theme preference,
            place-lookup cache, and website-check cache are kept and are not affected.
          </p>
          {message ? (
            <p role="status" className="neu-recessed mt-3 rounded-lg bg-recessed p-3 text-sm text-ink2">
              {message}
            </p>
          ) : null}
          {confirming ? (
            <div className="mt-4 rounded-lg border border-status-error-line bg-status-error-bg p-4">
              <p className="text-sm font-medium text-status-error-fg">
                Clear saved leads, recent searches, and search statistics?
              </p>
              <p className="mt-1 text-[13px] text-status-error-fg opacity-90">
                This cannot be undone. Your theme preference and caches are kept.
              </p>
              <div className="mt-3 flex gap-2">
                <Button type="button" size="sm" variant="danger" onClick={handleClear}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Yes, clear local data
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <Button type="button" variant="danger" onClick={() => { setConfirming(true); setMessage(null); }}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Clear Local Data
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
    </section>
  );
}
