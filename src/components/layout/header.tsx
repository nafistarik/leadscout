"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { Menu, Moon, Search, Sun, User, X } from "lucide-react";
import { DemoBadge } from "@/components/ui/badge";
import { useTheme } from "@/hooks/use-theme";

const TITLES: Record<string, { title: string; trail: string }> = {
  "/": { title: "Dashboard", trail: "Home / Dashboard" },
  "/find-companies": { title: "Find Companies", trail: "Home / Find Companies" },
  "/saved-leads": { title: "Saved Leads", trail: "Home / Saved Leads" },
  "/lists": { title: "Lists", trail: "Home / Lists" },
  "/settings": { title: "Settings", trail: "Home / Settings" },
};

const SEARCH_INPUT_STYLES =
  "neu-recessed h-10 w-full rounded-lg border border-line-soft bg-recessed pl-9 pr-3 text-sm text-ink placeholder:text-ink3";

export function Header({
  pathname,
  onOpenMobileNav,
}: {
  pathname: string;
  onOpenMobileNav: () => void;
}) {
  const router = useRouter();
  const { toggleTheme } = useTheme();
  const [query, setQuery] = useState("");
  const meta = TITLES[pathname] ?? { title: "LeadScout", trail: "Home" };

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/find-companies?keyword=${encodeURIComponent(trimmed)}` : "/find-companies");
  }

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-app/95 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="neu-raised-sm neu-pressable inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line-soft bg-raised text-ink2 md:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="hidden text-xs text-ink3 sm:block">{meta.trail}</p>
          <h1 className="truncate text-lg font-semibold tracking-tight text-ink">
            {meta.title}
          </h1>
        </div>

        <form onSubmit={handleSearch} role="search" className="relative hidden w-64 shrink-0 lg:block">
          <label htmlFor="global-search" className="sr-only">
            Search companies
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink3"
            aria-hidden="true"
          />
          <input
            id="global-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search companies…"
            className={SEARCH_INPUT_STYLES}
          />
        </form>

        <span className="hidden sm:inline-flex">
          <DemoBadge />
        </span>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title="Toggle theme"
          className="neu-raised-sm neu-pressable inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line-soft bg-raised text-ink2"
        >
          {/* Both icons render; CSS picks the visible one so server and client HTML match. */}
          <Sun className="h-5 w-5 dark:hidden" aria-hidden="true" />
          <Moon className="hidden h-5 w-5 dark:block" aria-hidden="true" />
        </button>

        <span
          className="neu-recessed flex h-10 w-10 items-center justify-center rounded-full bg-recessed text-ink2"
          role="img"
          aria-label="Local workspace, no account signed in"
          title="Local prototype — no account"
        >
          <User className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      {/* Mobile search row */}
      <div className="border-t border-line-soft px-4 py-2 lg:hidden">
        <form onSubmit={handleSearch} role="search" className="relative">
          <label htmlFor="global-search-mobile" className="sr-only">
            Search companies
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink3"
            aria-hidden="true"
          />
          <input
            id="global-search-mobile"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search companies…"
            className={SEARCH_INPUT_STYLES}
          />
        </form>
      </div>
    </header>
  );
}

export function MobileNavCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close navigation menu"
      className="neu-raised-sm neu-pressable inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line-soft bg-raised text-ink2"
    >
      <X className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
