import { useCallback, useState } from "react";
import { STORAGE_KEYS, readLocalStorage, safeJsonParse } from "@/lib/storage";
import { useLocalStorageValue } from "@/hooks/use-local-storage-value";
import { probeStorage } from "@/hooks/use-local-storage-value";
import {
  applyWorkflowPatch,
  removeWorkflowField,
  sanitizeWorkflowMap,
} from "@/lib/workflow";
import type {
  LeadStatus,
  LeadWorkflow,
  LeadWorkflowMap,
  NextAction,
} from "@/types/workflow";

/**
 * User-assigned lead workflow metadata (status, notes, next action,
 * follow-up date), keyed by stable saved-lead record id.
 *
 * - Separate localStorage key from company snapshots: saving/unsaving a
 *   lead never touches workflow data, and editing workflow never touches
 *   company data. Unsaving a lead KEEPS its metadata, so re-saving
 *   restores the user's status and notes instead of silently deleting them.
 * - Same SSR-safe, cross-tab-synced storage primitive as the rest of the app.
 * - Malformed entries are dropped by validation, never crash pages.
 */
export function useLeadWorkflow() {
  const [workflows, setWorkflows] = useLocalStorageValue<LeadWorkflowMap>(
    STORAGE_KEYS.leadWorkflow,
    {},
    sanitizeWorkflowMap,
  );

  const getWorkflow = useCallback(
    (recordId: string): LeadWorkflow | undefined => workflows[recordId],
    [workflows],
  );

  const [storageAvailable] = useState(probeStorage);

  // Write base: freshly read storage when it works (so a stale tab edits
  // per-record state without clobbering another tab's newer unrelated
  // entries), or the in-memory session state when storage is unavailable
  // (private mode), where the shared primitive already keeps session truth.
  const readBase = useCallback((): LeadWorkflowMap => {
    if (!storageAvailable) return workflows;
    return sanitizeWorkflowMap(safeJsonParse(readLocalStorage(STORAGE_KEYS.leadWorkflow), {}));
  }, [storageAvailable, workflows]);

  const patchWorkflow = useCallback(
    (recordId: string, patch: LeadWorkflow) => {
      const next = applyWorkflowPatch(readBase(), recordId, patch);
      if (next) setWorkflows(next);
    },
    [readBase, setWorkflows],
  );

  const removeField = useCallback(
    (recordId: string, key: keyof LeadWorkflow) => {
      const next = removeWorkflowField(readBase(), recordId, key);
      if (next) setWorkflows(next);
    },
    [readBase, setWorkflows],
  );

  const setStatus = useCallback(
    (recordId: string, status: LeadStatus) => {
      const current = readBase()[recordId]?.status;
      if (current === status) return;
      patchWorkflow(recordId, { status, lastReviewedAt: new Date().toISOString() });
    },
    [patchWorkflow, readBase],
  );

  const saveNotes = useCallback(
    (recordId: string, notes: string) => {
      const trimmed = notes.trim().slice(0, 2000);
      if (!trimmed) {
        removeField(recordId, "notes");
        return;
      }
      patchWorkflow(recordId, { notes: trimmed, lastReviewedAt: new Date().toISOString() });
    },
    [patchWorkflow, removeField],
  );

  const setNextAction = useCallback(
    (recordId: string, nextAction: NextAction) => {
      if (nextAction === "none") {
        removeField(recordId, "nextAction");
        return;
      }
      patchWorkflow(recordId, { nextAction });
    },
    [patchWorkflow, removeField],
  );

  const setFollowUpDate = useCallback(
    (recordId: string, followUpDate: string) => {
      if (!followUpDate) {
        removeField(recordId, "followUpDate");
        return;
      }
      patchWorkflow(recordId, { followUpDate });
    },
    [patchWorkflow, removeField],
  );

  return { workflows, getWorkflow, setStatus, saveNotes, setNextAction, setFollowUpDate };
}
