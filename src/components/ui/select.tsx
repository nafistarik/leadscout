"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/storage";

export interface SelectOption {
  value: string;
  label: string;
  /** Logical section shown as a non-selectable header in the dropdown. */
  group?: string;
  /** Extra space-separated search terms matched alongside label and group. */
  keywords?: string;
}

type SelectSize = "md" | "sm";

interface SelectProps {
  id: string;
  /** Selected option value ("" when nothing is selected). */
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /**
   * Searchable mode (default) renders a filter input: typing only filters,
   * Enter commits the highlighted match, anything else reverts.
   * Non-searchable mode renders a button trigger with the same panel —
   * suited to short fixed lists (result limits, sort orders).
   */
  searchable?: boolean;
  /** Trigger height: md matches form inputs, sm matches compact toolbars. */
  size?: SelectSize;
  /** Shows a clear button when a value is selected (e.g. optional country). */
  allowClear?: boolean;
  clearLabel?: string;
  emptyText?: string;
}

/** Where the open panel sits on screen; `top` or `bottom` is set, never both. */
interface PanelPlacement {
  left: number;
  minWidth: number;
  maxWidth: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
}

const PANEL_GAP = 4;
const VIEWPORT_MARGIN = 8;
/** Tall enough for every lead status (7) without a scrollbar. */
const PANEL_MAX_HEIGHT = 320;

/**
 * Places the panel against the viewport rather than inside its parent, so a
 * card or a scrolling table cannot clip it. Opens upward when the space
 * below is short and the space above is larger.
 */
function placePanel(trigger: DOMRect): PanelPlacement {
  const below = window.innerHeight - trigger.bottom - PANEL_GAP - VIEWPORT_MARGIN;
  const above = trigger.top - PANEL_GAP - VIEWPORT_MARGIN;
  const base = {
    left: trigger.left,
    minWidth: trigger.width,
    // Long labels may widen the panel up to the screen's right edge.
    maxWidth: Math.max(trigger.width, window.innerWidth - trigger.left - VIEWPORT_MARGIN),
  };
  if (below < 200 && above > below) {
    return { ...base, bottom: window.innerHeight - trigger.top + PANEL_GAP, maxHeight: Math.min(PANEL_MAX_HEIGHT, above) };
  }
  return { ...base, top: trigger.bottom + PANEL_GAP, maxHeight: Math.min(PANEL_MAX_HEIGHT, below) };
}

function matchesQuery(option: SelectOption, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = `${option.label} ${option.group ?? ""} ${option.keywords ?? ""}`.toLowerCase();
  return haystack.includes(needle);
}

/**
 * Which filtered option Enter should pick for a typed query. The list keeps
 * its grouped order, but a label match beats a group or keyword match:
 * "Beauty" must land on "Beauty Salon", not on the first option that merely
 * lists "beauty" as a keyword.
 *
 * @returns Index into `options`: the first label starting with the query,
 *   else the first label containing it, else 0.
 */
export function bestMatchIndex(options: SelectOption[], query: string): number {
  const needle = query.trim().toLowerCase();
  if (!needle) return 0;
  const labels = options.map((option) => option.label.toLowerCase());
  const startsWith = labels.findIndex((label) => label.startsWith(needle));
  if (startsWith >= 0) return startsWith;
  return Math.max(labels.findIndex((label) => label.includes(needle)), 0);
}

const TRIGGER_SIZES: Record<SelectSize, string> = {
  md: "h-10 px-3 text-sm",
  sm: "h-9 pl-2 text-[13px]",
};

/**
 * The application's single custom select (combobox + listbox) in the
 * neumorphic language. Searchable mode is the visual reference established
 * by the Country selector; non-searchable mode shares the identical panel,
 * option, keyboard, and focus treatment behind a button trigger.
 *
 * Typing only filters — a value commits exclusively through an explicit
 * option choice, so arbitrary text can never become a selection: blurring,
 * Escape, or Tab reverts to the last committed value. Values unknown to the
 * option list (e.g. restored from a shared URL) display as-is and pass
 * through untouched on submit.
 */
export function Select({
  id,
  value,
  options,
  onChange,
  placeholder,
  disabled = false,
  searchable = true,
  size = "md",
  allowClear = false,
  clearLabel = "Clear selection",
  emptyText = "No matching options",
}: SelectProps) {
  const listId = useId();
  const triggerRef = useRef<{ focus: () => void } | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<PanelPlacement | null>(null);
  /** Null draft means "show the committed value"; any edit opens a draft. */
  const [draft, setDraft] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(0);

  const selected = options.find((option) => option.value === value) ?? null;
  const committedLabel = selected ? selected.label : value;
  const text = draft ?? committedLabel;

  const filtered = searchable
    ? options.filter((option) => matchesQuery(option, draft ?? ""))
    : options;
  const activeIndex = filtered.length === 0 ? -1 : Math.min(Math.max(highlight, 0), filtered.length - 1);
  const showGroups = filtered.some((option) => option.group);

  // No draft-syncing effect: the display derives from props, every close
  // path resets the draft, and wrapper blur reverts uncommitted text — so
  // external changes (reset, shared links, history) always show through.

  // A fixed panel does not follow its trigger on its own: re-place it while
  // the page or any scrolling parent moves, or the window resizes. A press
  // outside closes it even when the trigger never took focus (Safari does
  // not focus buttons on click, so the blur handler alone would miss it).
  useEffect(() => {
    if (!open) return;
    const follow = () => {
      if (wrapperRef.current) setPlacement(placePanel(wrapperRef.current.getBoundingClientRect()));
    };
    const pressOutside = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setDraft(null);
        setOpen(false);
      }
    };
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    document.addEventListener("pointerdown", pressOutside);
    return () => {
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
      document.removeEventListener("pointerdown", pressOutside);
    };
  }, [open]);

  // Keep the keyboard-highlighted option visible while navigating.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex, listId]);

  function openWithDraft() {
    if (disabled || open) return;
    // Start filtering from empty (showing the placeholder): appending to
    // the displayed label would corrupt the query depending on cursor
    // position. The committed value is preserved and restored on blur,
    // Escape, or Enter-without-match; the panel marks it with a check.
    if (searchable) setDraft("");
    const selectedIndex = filtered.findIndex((option) => option.value === value);
    setHighlight(selectedIndex >= 0 ? selectedIndex : 0);
    reveal();
  }

  function reveal() {
    if (wrapperRef.current) setPlacement(placePanel(wrapperRef.current.getBoundingClientRect()));
    setOpen(true);
  }

  function close() {
    setDraft(null);
    setOpen(false);
  }

  function commit(option: SelectOption) {
    onChange(option.value);
    setDraft(null);
    setOpen(false);
    setHighlight(0);
    triggerRef.current?.focus();
  }

  function moveHighlight(delta: number) {
    setHighlight((current) => {
      if (filtered.length === 0) return 0;
      return Math.min(Math.max(current + delta, 0), filtered.length - 1);
    });
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openWithDraft();
        return;
      }
      moveHighlight(event.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (event.key === "Enter") {
      if (!open) return; // closed: let the surrounding form submit normally
      event.preventDefault();
      const option = activeIndex >= 0 ? filtered[activeIndex] : undefined;
      if (option) commit(option);
      else close();
      return;
    }
    if (event.key === "Escape") {
      if (!open) return;
      event.preventDefault();
      close();
    }
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) openWithDraft();
      else moveHighlight(event.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      if (!open) openWithDraft();
      else setHighlight(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      if (!open) openWithDraft();
      else setHighlight(Math.max(filtered.length - 1, 0));
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) {
        openWithDraft();
        return;
      }
      const option = activeIndex >= 0 ? filtered[activeIndex] : undefined;
      if (option) commit(option);
      else close();
      return;
    }
    if (event.key === "Escape") {
      if (!open) return;
      event.preventDefault();
      close();
    }
  }

  const showClear = allowClear && value !== "" && !disabled;
  const triggerPadding = showClear ? "pr-16" : size === "sm" ? "pr-8" : "pr-9";

  // Flat render rows with group headers injected wherever the group
  // changes. Computed (not mutated during render) to stay StrictMode-safe.
  const rows = useMemo(() => {
    const out: { key: string; header: string | null; option: SelectOption; index: number }[] = [];
    let previous: string | null = null;
    filtered.forEach((option, index) => {
      const header = showGroups && option.group !== previous ? (option.group ?? null) : null;
      previous = option.group ?? null;
      out.push({ key: option.value, header, option, index });
    });
    return out;
  }, [filtered, showGroups]);

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onBlur={(event) => {
        // Focus left the whole control (not just moved to the clear
        // button): revert uncommitted text, never adopt it.
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          close();
        }
      }}
    >
      {searchable ? (
        <input
          ref={(element) => {
            triggerRef.current = element;
          }}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          type="text"
          value={text}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={openWithDraft}
          onClick={openWithDraft}
          onChange={(event) => {
            const query = event.target.value;
            setDraft(query);
            setHighlight(bestMatchIndex(options.filter((option) => matchesQuery(option, query)), query));
            if (!open) reveal();
          }}
          onKeyDown={handleSearchKeyDown}
          className={cn(
            "neu-recessed w-full rounded-lg border border-line-soft bg-recessed text-ink",
            "placeholder:text-ink3 transition-[box-shadow,background-color,border-color]",
            "disabled:cursor-not-allowed disabled:opacity-60",
            TRIGGER_SIZES[size],
            triggerPadding,
          )}
        />
      ) : (
        <button
          ref={(element) => {
            triggerRef.current = element;
          }}
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => {
            if (open) close();
            else openWithDraft();
          }}
          onKeyDown={handleTriggerKeyDown}
          className={cn(
            "neu-recessed flex w-full cursor-pointer items-center gap-2 rounded-lg border border-line-soft bg-recessed text-left text-ink",
            "transition-[box-shadow,background-color,border-color] hover:bg-alt",
            "disabled:cursor-not-allowed disabled:opacity-60",
            TRIGGER_SIZES[size],
            triggerPadding,
          )}
        >
          <span className={cn("min-w-0 flex-1 truncate", !selected && value === "" && "text-ink3")}>
            {committedLabel || placeholder}
          </span>
        </button>
      )}
      {showClear ? (
        <button
          type="button"
          onClick={() => {
            onChange("");
            setDraft("");
            setOpen(false);
            triggerRef.current?.focus();
          }}
          onMouseDown={(event) => event.preventDefault()}
          aria-label={clearLabel}
          title={clearLabel}
          className="absolute right-9 top-1/2 -translate-y-1/2 cursor-pointer rounded-md p-1 text-ink3 transition-colors hover:bg-recessed hover:text-ink"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ) : null}
      <ChevronDown
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink3 transition-transform",
          open && "rotate-180",
        )}
      />
      {open && !disabled && placement ? (
        <div
          style={placement}
          className="neu-float fixed z-50 w-max overflow-y-auto rounded-lg border border-line-soft bg-overlay py-1"
        >
          <ul role="listbox" id={listId} aria-label={`${id} options`}>
            {rows.map(({ key, header, option, index }) => {
              const isSelected = option.value === value;
              const isActive = index === activeIndex;
              return (
                <li key={key} role="presentation">
                  {header ? (
                    <span
                      aria-hidden="true"
                      className="block px-3 pb-0.5 pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink3"
                    >
                      {header}
                    </span>
                  ) : null}
                  <span
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(event) => {
                      // Commit before trigger blur can revert the draft.
                      event.preventDefault();
                      commit(option);
                    }}
                    onMouseMove={() => {
                      if (highlight !== index) setHighlight(index);
                    }}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors",
                      isActive ? "bg-recessed text-ink" : "text-ink2",
                      isSelected && "font-medium text-accent-ink",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {isSelected ? (
                      <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-ink3">{emptyText}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
