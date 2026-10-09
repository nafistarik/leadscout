import type { ReactNode } from "react";
import { cn } from "@/lib/storage";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("neu-raised rounded-xl border border-line-soft bg-raised", className)}>{children}</div>;
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("border-b border-line-soft px-5 py-4", className)}>{children}</div>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("px-5 py-4", className)}>{children}</div>;
}
