import type { ReactNode } from "react";
import { Card, CardBody } from "@/components/ui/card";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card>
      <CardBody className="flex flex-col items-center px-6 py-12 text-center">
        {icon ? (
          <div className="neu-recessed mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-recessed text-ink2">
            {icon}
          </div>
        ) : null}
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-ink2">{description}</p>
        {action ? <div className="mt-6">{action}</div> : null}
      </CardBody>
    </Card>
  );
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-ink2">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
