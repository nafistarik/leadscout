import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { ThemeProvider } from "@/hooks/use-theme";

export const metadata: Metadata = {
  title: {
    default: "LeadScout — Find potential clients",
    template: "%s · LeadScout",
  },
  description:
    "LeadScout helps freelance web developers discover real local businesses that may need a website, using Overture Maps and OpenStreetMap data.",
  applicationName: "LeadScout",
  // iOS ignores most of the manifest; these make "Add to Home Screen" open full-screen with the right name.
  appleWebApp: { capable: true, title: "LeadScout", statusBarStyle: "black" },
};

// "cover" lets the installed app reach the screen edges on notched phones;
// the tab bar pads itself with the safe-area inset instead.
export const viewport: Viewport = { viewportFit: "cover" };

function ThemeInitScript() {
  const script = `(function(){try{var raw=localStorage.getItem("leadscout.theme.v1");var theme=raw?JSON.parse(raw):"dark";if(theme==="light"){document.documentElement.classList.remove("dark");}}catch(e){}window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__leadscoutInstall=e;});})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} suppressHydrationWarning />;
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <ThemeInitScript />
      </head>
      <body>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
