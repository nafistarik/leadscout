import { useCallback } from "react";
import { STORAGE_KEYS } from "@/lib/storage";
import { useLocalStorageValue } from "@/hooks/use-local-storage-value";
import { sanitizeWorkflowMap } from "@/lib/workflow";
import type {
  LeadStatus,
  LeadWorkflow,
  LeadWorkflowMap,
  NextAction,
} from "@/types/workflow";

function omit<K extends string>(obj: Record<K, unknown>, key: K): Partial<Record<K, unknown>> {
  const clone: Partial<Record<K, unknown>> = { ...obj };
  delete clone[key];
  return clone;
}

function removeWorkflowKey(
  workflows: LeadWorkflowMap,
  recordId: string,
  key: keyof LeadWorkflow,
  setWorkflows: (next: LeadWorkflowMap) => void,
): void {
  const previous = workflows[recordId] ?? {};
  const rest = omit(previous as Record<keyof LeadWorkflow, unknown>, key) as LeadWorkflow;
  if (Object.keys(rest).length === 0) {
    const remaining = omit(workflows as Record<string, LeadWorkflow>, recordId) as LeadWorkflowMap;
    setWorkflows(remaining);
  } else {
  setWorkflows({ ...workflows, [recordId]: rest });
  }
}

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

  const patchWorkflow = useCallback(
    (recordId: string, patch: LeadWorkflow) => {
      const previous = workflows[recordId] ?? {};
      const merged: LeadWorkflow = { ...previous, ...patch };
      if (Object.keys(merged).length === 0) return;
      setWorkflows({ ...workflows, [recordId]: merged });
    },
    [workflows, setWorkflows],
  );

  const setStatus = useCallback(
    (recordId: string, status: LeadStatus) => {
      patchWorkflow(recordId, { status, lastReviewedAt: new Date().toISOString() });
    },
    [patchWorkflow],
  );

  const saveNotes = useCallback(
    (recordId: string, notes: string) => {
      const trimmed = notes.trim().slice(0, 2000);
      if (!trimmed) {
        removeWorkflowKey(workflows, recordId, "notes", setWorkflows);
        return;
      }
      patchWorkflow(recordId, { notes: trimmed, lastReviewedAt: new Date().toISOString() });
    },
    [patchWorkflow, setWorkflows, workflows],
  );

  const setNextAction = useCallback(
    (recordId: string, nextAction: NextAction) => {
      if (nextAction === "none") {
        removeWorkflowKey(workflows, recordId, "nextAction", setWorkflows);
        return;
      }
      patchWorkflow(recordId, { nextAction });
    },
    [patchWorkflow, setWorkflows, workflows],
  );

  const setFollowUpDate = useCallback(
    (recordId: string, followUpDate: string) => {
      if (!followUpDate) {
        removeWorkflowKey(workflows, recordId, "followUpDate", setWorkflows);
        return;
      }
      patchWorkflow(recordId, { followUpDate });
    },
    [patchWorkflow, setWorkflows, workflows],
  );

  return { workflows, getWorkflow, setStatus, saveNotes, setNextAction, setFollowUpDate };
}
