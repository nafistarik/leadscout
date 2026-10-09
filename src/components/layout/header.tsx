"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { FlaskConical, Menu, Moon, Search, Sun, User, X } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

const TITLES: Record<string, { title: string; trail: string }> = {
  "/": { title: "Dashboard", trail: "Home / Dashboard" },
  "/find-companies": { title: "Find Companies", trail: "Home / Find Companies" },
  "/saved-leads": { title: "Saved Leads", trail: "Home / Saved Leads" },
  "/lists": { title: "Lists", trail: "Home / Lists" },
  "/settings": { title: "Settings", trail: "Home / Settings" },
};

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
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 md:hidden dark:text-zinc-200 dark:hover:bg-zinc-800"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="hidden text-xs text-zinc-500 sm:block dark:text-zinc-400">{meta.trail}</p>
          <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {meta.title}
          </h1>
        </div>

        <form onSubmit={handleSearch} role="search" className="relative hidden w-64 shrink-0 lg:block">
          <label htmlFor="global-search" className="sr-only">
            Search demo companies
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            aria-hidden="true"
          />
          <input
            id="global-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search demo companies…"
            className="h-10 w-full rounded-lg border border-zinc-300 bg-white pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
          />
        </form>

        <span className="hidden items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-200 sm:inline-flex dark:bg-violet-950 dark:text-violet-200 dark:ring-violet-800">
          <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
          Demo data
        </span>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title="Toggle theme"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {/* Both icons render; CSS picks the visible one so server and client HTML match. */}
          <Sun className="h-5 w-5 dark:hidden" aria-hidden="true" />
          <Moon className="hidden h-5 w-5 dark:block" aria-hidden="true" />
        </button>

        <span
          className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          role="img"
          aria-label="Local workspace, no account signed in"
          title="Local prototype — no account"
        >
          <User className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      {/* Mobile search row */}
      <div className="border-t border-zinc-100 px-4 py-2 lg:hidden dark:border-zinc-800">
        <form onSubmit={handleSearch} role="search" className="relative">
          <label htmlFor="global-search-mobile" className="sr-only">
            Search demo companies
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            aria-hidden="true"
          />
          <input
            id="global-search-mobile"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search demo companies…"
            className="h-10 w-full rounded-lg border border-zinc-300 bg-white pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
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
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
    >
      <X className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
