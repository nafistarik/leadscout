"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Header } from "@/components/layout/header";
import { InstallPrompt } from "@/components/layout/install-prompt";
import { CONTAINER_CLASS } from "@/components/layout/container";
import { SidebarContent } from "@/components/layout/sidebar";
import { OsmAttribution } from "@/components/osm-attribution";

/**
 * Two layouts from one tree: from `lg` a website with a sidebar; below it
 * (phones, tablets, the installed app) an app with a top bar and a bottom
 * tab bar, so every page is one thumb-tap away.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-app text-ink">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-on-accent"
      >
        Skip to main content
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-alt px-4 pb-5 lg:block">
        <SidebarContent />
      </aside>

      {/* Bottom padding keeps the last content clear of the tab bar and the phone's home indicator. */}
      <div className="pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0 lg:pl-64">
        <Header pathname={pathname} />
        <main id="main-content" className={`${CONTAINER_CLASS} py-6`}>
          {children}
        </main>
        <footer className={`${CONTAINER_CLASS} pb-8`}>
          <div className="border-t border-line-soft pt-4">
            <OsmAttribution />
          </div>
        </footer>
      </div>

      <BottomNav pathname={pathname} />
      <InstallPrompt />
    </div>
  );
}
