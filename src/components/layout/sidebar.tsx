"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, LayoutDashboard, ListChecks, Search, Settings, Telescope } from "lucide-react";
import { cn } from "@/lib/storage";

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/find-companies", label: "Find Companies", icon: Search },
  { href: "/saved-leads", label: "Saved Leads", icon: Bookmark },
  { href: "/lists", label: "Lists", icon: ListChecks },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <Link
        href="/"
        onClick={onNavigate}
        className="flex items-center gap-2.5 rounded-lg px-2 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        aria-label="LeadScout home"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white dark:bg-blue-500 dark:text-zinc-950">
          <Telescope className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="text-[17px] font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
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
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
                    active
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-400">
        <p className="font-semibold text-zinc-700 dark:text-zinc-200">Local demo mode</p>
        <p className="mt-1">Sample records only. Live public-source search arrives in Part 2.</p>
      </div>
    </div>
  );
}
