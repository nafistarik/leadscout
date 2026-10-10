"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bookmark, LayoutDashboard, Search, Telescope, Trash2 } from "lucide-react";
import { notifyStorageChanged } from "@/hooks/use-local-storage-value";
import { STORAGE_KEYS } from "@/lib/storage";
import { cn } from "@/lib/storage";

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/find-companies", label: "Find Companies", icon: Search },
  { href: "/saved-leads", label: "Saved Leads", icon: Bookmark },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Compact destructive action anchored at the bottom of the sidebar.
 * Clears saved leads, recent searches, and search statistics after explicit
 * confirmation. Theme preference and provider/website caches are kept.
 */
function ClearLocalData() {
  const [confirming, setConfirming] = useState(false);

  function handleClear() {
    try {
      window.localStorage.removeItem(STORAGE_KEYS.savedLeadsV2);
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
            className="cursor-pointer rounded-md bg-status-error-fg px-2 py-1 text-xs font-semibold text-status-error-bg"
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
      className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink2 transition-colors hover:bg-recessed hover:text-status-error-fg"
    >
      <Trash2 className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
      Clear local data
    </button>
  );
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <Link
        href="/"
        onClick={onNavigate}
        className="flex items-center gap-2.5 rounded-lg px-2 py-2"
        aria-label="LeadScout home"
      >
        <span className="neu-raised-sm flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-on-accent">
          <Telescope className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="text-[17px] font-bold tracking-tight text-ink">
          LeadScout
        </span>
      </Link>

      <nav aria-label="Primary" className="mt-6 flex-1">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "neu-recessed bg-recessed font-semibold text-accent-ink"
                      : "font-medium text-ink2 hover:bg-recessed hover:text-ink",
                  )}
                >
                  {active ? (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r bg-accent"
                    />
                  ) : null}
                  <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-6 border-t border-line-soft pt-4">
        <ClearLocalData />
      </div>
    </div>
  );
}
