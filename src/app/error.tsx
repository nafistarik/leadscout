"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="neu-raised rounded-xl p-8 text-center">
      <h2 className="text-lg font-semibold text-ink">Something went wrong</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink2">
        This section failed to load. Your locally saved leads and lists are still stored in the
        browser.
      </p>
      <div className="mt-5 flex justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link href="/">
          <Button variant="secondary">Go to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
