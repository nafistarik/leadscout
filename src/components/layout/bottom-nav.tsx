"use client";

import Link from "next/link";
import { useSavedLeads } from "@/hooks/use-saved-leads";
import { NAV_ITEMS, isActive } from "@/components/layout/sidebar";
import { cn } from "@/lib/storage";

/** Short labels: three tabs share a phone's width. */
const TAB_LABELS: Record<(typeof NAV_ITEMS)[number]["href"], string> = {
  "/": "Home",
  "/find-companies": "Find",
  "/saved-leads": "Saved",
};

/**
 * App-style tab bar for phones and tablets (hidden from `lg`, where the
 * sidebar takes over). The active tab gets a pill behind its icon; Saved
 * carries the lead count, like an app badge.
 */
export function BottomNav({ pathname }: { pathname: string }) {
  const savedCount = useSavedLeads().records.length;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-alt/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-3">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={item.href === "/saved-leads" && savedCount > 0 ? `${item.label}, ${savedCount}` : item.label}
                className={cn(
                  "flex h-full select-none flex-col items-center justify-center gap-1 text-[11px] transition-colors active:scale-95",
                  active ? "font-semibold text-accent-ink" : "font-medium text-ink3",
                )}
              >
                <span
                  className={cn(
                    "relative flex h-8 w-14 items-center justify-center rounded-full transition-colors",
                    active && "bg-accent-soft",
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {item.href === "/saved-leads" && savedCount > 0 ? (
                    <span className="absolute right-1.5 top-0 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] font-semibold leading-4 tabular-nums text-on-accent">
                      {savedCount}
                    </span>
                  ) : null}
                </span>
                <span aria-hidden="true">{TAB_LABELS[item.href]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
