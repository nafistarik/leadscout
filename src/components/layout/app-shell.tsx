"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Header, MobileNavCloseButton } from "@/components/layout/header";
import { CONTAINER_CLASS } from "@/components/layout/container";
import { SidebarContent } from "@/components/layout/sidebar";
import { OsmAttribution } from "@/components/osm-attribution";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dismissedFor, setDismissedFor] = useState(pathname);

  // Close the mobile drawer on navigation. This render-phase update is the
  // documented pattern for adjusting state when a value changes, and it keeps
  // the drawer in sync for programmatic navigation.
  if (dismissedFor !== pathname) {
    setDismissedFor(pathname);
    setMobileOpen(false);
  }

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-app text-ink">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-on-accent"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-alt px-4 py-5 md:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div
            className="absolute inset-0 bg-zinc-950/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-line bg-alt px-4 py-5">
            <div className="mb-4 flex justify-end">
              <MobileNavCloseButton onClose={() => setMobileOpen(false)} />
            </div>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="md:pl-64">
        <Header pathname={pathname} onOpenMobileNav={() => setMobileOpen(true)} />
        <main id="main-content" className={`${CONTAINER_CLASS} py-6`}>
          {children}
        </main>
        <footer className={`${CONTAINER_CLASS} pb-8`}>
          <div className="border-t border-line-soft pt-4">
            <OsmAttribution />
          </div>
        </footer>
      </div>
    </div>
  );
}
