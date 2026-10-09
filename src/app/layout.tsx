import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { ThemeProvider } from "@/hooks/use-theme";

export const metadata: Metadata = {
  title: {
    default: "LeadScout — Find potential clients",
    template: "%s · LeadScout",
  },
  description:
    "LeadScout helps freelance web developers discover potential business clients. Part 1 prototype with local demo data.",
};

function ThemeInitScript() {
  const script = `(function(){try{var raw=localStorage.getItem("leadscout.theme.v1");var theme=raw?JSON.parse(raw):"light";if(theme==="dark"){document.documentElement.classList.add("dark");}}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} suppressHydrationWarning />;
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
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
