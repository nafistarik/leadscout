"use client";

import { useCallback } from "react";
import { useLocalStorageValue } from "@/hooks/use-local-storage-value";
import {
  effectiveStatus,
  isFollowUpDue,
  localDateString,
  recordContact,
  sanitizePipelineMap,
  setLeadStatus,
  setLeadStatusMany,
  updateLeadDetails,
} from "@/lib/lead-pipeline";
import type { LeadPipelineEntry, LeadPipelineMap, LeadStatus, LostReason } from "@/lib/lead-pipeline";
import { STORAGE_KEYS } from "@/lib/storage";

const EMPTY_PIPELINE: LeadPipelineMap = {};

/**
 * Pipeline state for saved leads, persisted in this browser and synced
 * across tabs. Every change comes from an explicit user action.
 *
 * @returns The map plus actions that each write one lead's entry.
 */
export function useLeadPipeline() {
  const [pipeline, setPipeline] = useLocalStorageValue(STORAGE_KEYS.leadPipeline, EMPTY_PIPELINE, sanitizePipelineMap);

  const entryFor = useCallback((id: string): LeadPipelineEntry | undefined => pipeline[id], [pipeline]);

  const setStatus = useCallback(
    (id: string, status: LeadStatus, lostReason?: LostReason) =>
      setPipeline(setLeadStatus(pipeline, id, status, new Date().toISOString(), lostReason)),
    [pipeline, setPipeline],
  );

  /** One status for many leads in a single write (separate writes would overwrite each other). */
  const setStatusForMany = useCallback(
    (ids: string[], status: LeadStatus) => {
      setPipeline(setLeadStatusMany(pipeline, ids, status, new Date().toISOString()));
    },
    [pipeline, setPipeline],
  );

  const markContacted = useCallback(
    (id: string) => setPipeline(recordContact(pipeline, id, new Date().toISOString())),
    [pipeline, setPipeline],
  );

  const updateDetails = useCallback(
    (id: string, patch: { notes?: string; followUpDate?: string }) =>
      setPipeline(updateLeadDetails(pipeline, id, patch)),
    [pipeline, setPipeline],
  );

  const followUpDue = useCallback(
    (id: string) => isFollowUpDue(pipeline[id], localDateString(new Date())),
    [pipeline],
  );

  const statusOf = useCallback((id: string) => effectiveStatus(pipeline[id]), [pipeline]);

  return {
    pipeline,
    setPipeline,
    entryFor,
    statusOf,
    setStatus,
    setStatusForMany,
    markContacted,
    updateDetails,
    followUpDue,
  };
}
