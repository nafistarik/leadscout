"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, LayoutDashboard, Search, Telescope } from "lucide-react";
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
    </div>
  );
}
