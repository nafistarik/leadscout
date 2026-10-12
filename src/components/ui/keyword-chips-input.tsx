"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import { parseKeywordChips } from "@/lib/keywords";
import { cn } from "@/lib/storage";

interface KeywordChipsInputProps {
  id: string;
  /**
   * Serialized keyword string — the exact `LeadSearchFilters.keyword`
   * contract (chips joined with ", "). Parsed for display on every render,
   * so external changes (reset, shared links, history) stay in sync.
   */
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Keyword entry as removable chips. Enter or comma commits the draft,
 * Backspace on an empty draft removes the last chip, and pasting
 * comma-separated text adds every part at once. Parts are trimmed,
 * empties dropped, and case-insensitive duplicates rejected.
 *
 * Enter with an empty draft is left alone so the surrounding form can
 * submit normally from the keyboard.
 */
export function KeywordChipsInput({
  id,
  value,
  onChange,
  placeholder = "e.g. bakery, dental",
  disabled = false,
}: KeywordChipsInputProps) {
  const chips = parseKeywordChips(value);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function emit(next: string[]) {
    const serialized = next.join(", ");
    if (serialized !== value) onChange(serialized);
  }

  function addParts(parts: string[]) {
    const known = new Set(chips.map((chip) => chip.toLowerCase()));
    const next = [...chips];
    for (const part of parts) {
      const chip = part.trim();
      if (!chip) continue;
      const key = chip.toLowerCase();
      if (known.has(key)) continue;
      known.add(key);
      next.push(chip);
    }
    emit(next);
    setDraft("");
  }

  function removeAt(index: number) {
    emit(chips.filter((_, position) => position !== index));
    inputRef.current?.focus();
  }

  return (
    <div
      className={cn(
        "keyword-chips neu-recessed flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-line-soft bg-recessed px-3 py-1.5 text-sm text-ink",
        "transition-[box-shadow,background-color,border-color]",
        "focus-within:outline focus-within:outline-2 focus-within:outline-[var(--focus-ring)] focus-within:outline-offset-2",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      {chips.map((chip, index) => (
        <span
          key={chip.toLowerCase()}
          className="inline-flex max-w-full items-center gap-1 rounded-md bg-accent-soft py-0.5 pl-2 pr-1 text-xs font-medium text-accent-ink"
        >
          <span className="truncate">{chip}</span>
          <button
            type="button"
            onClick={() => removeAt(index)}
            disabled={disabled}
            aria-label={`Remove keyword ${chip}`}
            className="cursor-pointer rounded p-0.5 text-accent-ink transition-colors hover:bg-recessed hover:text-ink disabled:cursor-not-allowed"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={draft}
        disabled={disabled}
        autoComplete="off"
        placeholder={chips.length === 0 ? placeholder : "Add more…"}
        aria-label={chips.length === 0 ? undefined : "Add another keyword"}
        onChange={(event) => {
          // A comma arriving without a keypress (IME, autofill, scripted
          // input) still separates keywords — commit immediately.
          if (event.target.value.includes(",")) addParts(event.target.value.split(","));
          else setDraft(event.target.value);
        }}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === "Enter") {
            if (!draft.trim()) return; // empty: let the form submit
            event.preventDefault();
            addParts(draft.split(","));
          } else if (event.key === ",") {
            event.preventDefault();
            if (draft.trim()) addParts(draft.split(","));
          } else if (event.key === "Backspace" && draft === "" && chips.length > 0) {
            event.preventDefault();
            emit(chips.slice(0, -1));
          }
        }}
        onPaste={(event) => {
          if (disabled) return;
          const text = event.clipboardData.getData("text");
          if (!text) return;
          event.preventDefault();
          addParts(text.split(","));
        }}
        className="min-w-24 flex-1 bg-transparent py-0.5 text-sm text-ink placeholder:text-ink3 disabled:cursor-not-allowed"
      />
    </div>
  );
}
