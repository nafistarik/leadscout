"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bookmark, LayoutDashboard, Search, Trash2 } from "lucide-react";
import { notifyStorageChanged } from "@/hooks/use-local-storage-value";
import { useSavedLeads } from "@/hooks/use-saved-leads";
import { STORAGE_KEYS, cn } from "@/lib/storage";

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/find-companies", label: "Find Companies", icon: Search },
  { href: "/saved-leads", label: "Saved Leads", icon: Bookmark },
] as const;

/** Whether a nav item is the current page (the Dashboard only on "/" itself). */
export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Compact destructive action anchored at the bottom of the sidebar.
 * Clears saved leads with their pipeline, recent searches, and search
 * statistics after explicit confirmation. Theme preference and
 * provider/website caches are kept.
 */
export function ClearLocalData() {
  const [confirming, setConfirming] = useState(false);

  function handleClear() {
    try {
      window.localStorage.removeItem(STORAGE_KEYS.savedLeadsV2);
      window.localStorage.removeItem(STORAGE_KEYS.leadPipeline);
      window.localStorage.removeItem(STORAGE_KEYS.searchHistory);
      notifyStorageChanged();
    } catch {
      // Storage unavailable: nothing to clear.
    }
    setConfirming(false);
  }

  if (confirming) {
    return (
      <div className="rounded-lg border border-status-error-line bg-status-error-bg p-3">
        <p className="text-xs font-medium text-status-error-fg">
          Clear saved leads, searches & stats?
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-status-error-fg opacity-90">
          Cannot be undone. Theme and caches are kept.
        </p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={handleClear}
            className="cursor-pointer rounded-md bg-status-error-fg px-2 py-1 text-xs font-semibold text-status-error-bg transition hover:brightness-95"
          >
            Yes, clear
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-status-error-fg hover:underline"
          >
            Keep
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-md text-xs font-medium text-ink3 transition-colors hover:text-status-error-fg"
    >
      <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      Clear local data
    </button>
  );
}

/**
 * The LeadScout wordmark. Two files, one per theme, because the blue that
 * reads on the light surface is too dark on the dark one.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- a 14 KB local PNG gains nothing from the image optimizer */}
      <img src="/brand/leadscout-wordmark.png" alt="LeadScout" width={549} height={90} className={cn("w-auto dark:hidden", className)} />
      {/* eslint-disable-next-line @next/next/no-img-element -- see above */}
      <img src="/brand/leadscout-wordmark-dark.png" alt="LeadScout" width={549} height={90} className={cn("hidden w-auto dark:block", className)} />
    </>
  );
}

export function SidebarContent() {
  const pathname = usePathname();
  const savedCount = useSavedLeads().records.length;

  return (
    <div className="flex h-full flex-col">
      {/* Same height as the header, so the logo and the page title share one line without a divider. */}
      <Link href="/" className="flex h-16 shrink-0 items-center px-3" aria-label="LeadScout home">
        <Wordmark className="h-[26px]" />
      </Link>

      <nav aria-label="Primary" className="mt-4 flex-1">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink3">Menu</p>
        <ul className="enter-stagger space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-accent-soft font-semibold text-accent-ink"
                      : "font-medium text-ink2 hover:bg-recessed hover:text-ink",
                  )}
                >
                  <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-accent-ink" : "text-ink3")} aria-hidden="true" />
                  {item.label}
                  {/* Saving gives visible feedback: the count grows where the leads went. */}
                  {item.href === "/saved-leads" && savedCount > 0 ? (
                    <span
                      className={cn(
                        "ml-auto min-w-6 rounded-full px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums",
                        active ? "bg-accent text-on-accent" : "bg-recessed text-ink2",
                      )}
                    >
                      {savedCount}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-6 space-y-3 rounded-xl border border-line-soft bg-recessed p-3">
        <p className="text-xs leading-relaxed text-ink2">
          Your leads, notes and searches stay in this browser. Use <span className="font-medium text-ink">Saved Leads › More</span> to back them up.
        </p>
        <ClearLocalData />
      </div>
    </div>
  );
}
