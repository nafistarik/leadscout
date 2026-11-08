"use client";

import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { FileDown, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLeadPipeline } from "@/hooks/use-lead-pipeline";
import { useSavedLeads } from "@/hooks/use-saved-leads";
import { backupFilename, buildBackup, MAX_BACKUP_BYTES, mergeBackup, parseBackup } from "@/lib/backup";
import { downloadText } from "@/lib/csv";

/**
 * Export and import of saved leads with their pipeline as a JSON file: a
 * copy that survives cleared browser data, and the way to share progress
 * with a colleague. Import merges and never deletes anything here.
 */
export function LeadBackupControls() {
  const { records, setRecords } = useSavedLeads();
  const { pipeline, setPipeline } = useLeadPipeline();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  function handleExport() {
    downloadText(buildBackup(records, pipeline, new Date().toISOString()), backupFilename(new Date()), "application/json");
    setMessage({ tone: "ok", text: `Backup saved with ${records.length} lead${records.length === 1 ? "" : "s"}.` });
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Let the same file be picked again after a fix.
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_BACKUP_BYTES) {
      setMessage({ tone: "error", text: "This file is too large to be a LeadScout backup." });
      return;
    }
    try {
      const incoming = parseBackup(await file.text());
      const merged = mergeBackup({ savedLeads: records, pipeline }, incoming);
      setRecords(merged.savedLeads);
      setPipeline(merged.pipeline);
      setMessage({
        tone: "ok",
        text: `Imported: ${merged.added} new lead${merged.added === 1 ? "" : "s"}, ${merged.updated} updated. Nothing here was removed.`,
      });
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "The backup could not be read." });
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-col gap-2">
        {records.length > 0 ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full justify-start"
            onClick={handleExport}
            title="Download saved leads, notes and statuses as a backup file"
          >
            <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
            Save backup (to share or keep)
          </Button>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full justify-start"
          onClick={() => fileRef.current?.click()}
          title="Add leads from a backup file; nothing here is deleted"
        >
          <FileUp className="h-3.5 w-3.5" aria-hidden="true" />
          Load backup (e.g. from a colleague)
        </Button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImport} aria-label="Backup file to import" />
      </div>
      {message ? (
        <p role="status" className={message.tone === "ok" ? "text-xs text-status-success-fg" : "text-xs text-status-error-fg"}>
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
