import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="neu-raised rounded-xl border border-line-soft bg-raised p-8 text-center">
      <h2 className="text-lg font-semibold text-ink">Page not found</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink2">
        This page does not exist. Your saved leads are safe.
      </p>
      <div className="mt-5 flex justify-center">
        <Link href="/" className={buttonClassName()}>
          Go to Home
        </Link>
      </div>
    </div>
  );
}
