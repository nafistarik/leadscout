"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { BookmarkPlus, Check, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";
import { useSearchPresets } from "@/hooks/use-search-presets";
import type { LeadSearchFilters, SortOrder } from "@/lib/filter-leads";
import type { SearchMode } from "@/lib/search-params";
import { cn } from "@/lib/storage";

export interface FilterChip {
  key: string;
  label: string;
}

/**
 * Removable chips for active client-side filters, plus a clear-all action.
 * Every chip is a real button with an accessible name.
 */
export function ActiveFilterChips({
  chips,
  onRemove,
  onClearAll,
}: {
  chips: FilterChip[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
}) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" aria-live="polite">
      <span className="text-xs font-medium text-ink2">Active refinements:</span>
      <ul className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => (
          <li key={chip.key}>
            <button
              type="button"
              onClick={() => onRemove(chip.key)}
              aria-label={`Remove ${chip.label} filter`}
              title={`Remove ${chip.label} filter`}
              className="neu-recessed inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-line-soft bg-recessed px-2 py-1 text-xs font-medium text-ink2 transition-colors hover:text-ink"
            >
              {chip.label}
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onClearAll}
        className="cursor-pointer text-xs font-medium text-accent-ink underline-offset-2 hover:underline"
      >
        Clear all
      </button>
    </div>
  );
}

export const SORT_LABELS: Record<SortOrder, string> = {
  provider: "Default order",
  relevance: "Best keyword match first",
  name: "Name (A–Z)",
  info: "Most complete info first",
  score: "Highest fit score first",
};

export function SortSelect({
  id,
  value,
  onChange,
  includeScore,
  scoreDisabledReason,
}: {
  id: string;
  value: SortOrder;
  onChange: (sort: SortOrder) => void;
  includeScore: boolean;
  scoreDisabledReason?: string;
}) {
  const options: SortOrder[] = ["provider", "relevance", "name", "info"];
  if (includeScore) options.push("score");
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[13px] font-medium text-ink2"
      >
        Sort results
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as SortOrder)}
        title={value === "score" || includeScore ? undefined : scoreDisabledReason}
        className="neu-recessed h-10 w-full cursor-pointer rounded-lg border border-line-soft bg-recessed px-3 text-sm text-ink"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {SORT_LABELS[option]}
          </option>
        ))}
      </select>
      {value === "score" ? (
        <p className="mt-1 text-xs text-ink3">
          Ordered by heuristic fit score — most mapped detail first, not verified value.
        </p>
      ) : null}
    </div>
  );
}

export function AvailabilityCheckbox({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-ink2">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded accent-(--accent)"
      />
      {label}
    </label>
  );
}

/**
 * Small preset controls: apply a saved setup, save the current form, or
 * delete a preset. Applying fills the form only — the user submits manually.
 */
export function PresetControls({
  mode,
  filters,
  onApply,
}: {
  mode: SearchMode;
  filters: LeadSearchFilters;
  onApply: (mode: SearchMode, filters: LeadSearchFilters) => void;
}) {
  const { presets, savePreset, removePreset } = useSearchPresets();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = savePreset(name, mode, filters);
    if (!result.ok) {
      setFeedback(result.error ?? "Could not save preset.");
      return;
    }
    setFeedback(`Preset “${name.trim()}” saved.`);
    setName("");
    setSaving(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`preset-select-${mode}`} className="text-[13px] font-medium text-ink2">
          Saved setups
        </label>
        <select
          id={`preset-select-${mode}`}
          value=""
          onChange={(event) => {
            const preset = presets.find((item) => item.id === event.target.value);
            if (preset) {
              onApply(preset.mode, { ...preset.filters });
              setFeedback(`Applied “${preset.name}” — review and submit to run.`);
            }
          }}
          className={cn(
            "neu-recessed h-9 min-w-40 flex-1 cursor-pointer rounded-lg border border-line-soft",
            "bg-recessed px-2 text-[13px] text-ink sm:flex-none",
          )}
        >
          <option value="">{presets.length === 0 ? "No saved setups yet" : "Apply a setup…"}</option>
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name} ({preset.mode === "live" ? "Live" : "Demo"})
            </option>
          ))}
        </select>
        {presets.length > 0 ? (
          <span className="text-xs text-ink3">{presets.length} saved</span>
        ) : null}
      </div>

      {saving ? (
        <form onSubmit={handleSave} className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor={`preset-name-${mode}`} className="sr-only">
            Preset name
          </label>
          <TextInput
            id={`preset-name-${mode}`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Berlin bakeries with sites"
            maxLength={60}
            autoFocus
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm">
              <Check className="h-4 w-4" aria-hidden="true" />
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setSaving(false);
                setName("");
                setFeedback(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => { setSaving(true); setFeedback(null); }}>
            <BookmarkPlus className="h-4 w-4" aria-hidden="true" />
            Save current as setup
          </Button>
          {presets.length > 0 ? (
            <details className="inline-block">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-ink3 hover:text-status-error-fg [&::-webkit-details-marker]:hidden">
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Manage
              </summary>
              <ul className="neu-raised mt-1 space-y-1 rounded-lg border border-line-soft bg-raised p-2">
                {presets.map((preset) => (
                  <li key={preset.id} className="flex items-center justify-between gap-3 px-1 py-0.5 text-xs">
                    <span className="text-ink2">{preset.name}</span>
                    <button
                      type="button"
                      onClick={() => removePreset(preset.id)}
                      aria-label={`Delete preset ${preset.name}`}
                      className="cursor-pointer rounded p-1 text-ink3 hover:text-status-error-fg"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      )}
      {feedback ? (
        <p role="status" className="text-xs text-ink3">
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
