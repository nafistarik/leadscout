import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="neu-raised rounded-xl p-8 text-center">
      <h2 className="text-lg font-semibold text-ink">Page not found</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink2">
        The page you requested does not exist.
      </p>
      <div className="mt-5 flex justify-center">
        <Link href="/">
          <Button>Go to Home</Button>
        </Link>
      </div>
    </div>
  );
}
