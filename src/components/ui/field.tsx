import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/storage";

const FIELD_STYLES =
  "neu-recessed h-10 w-full rounded-lg border border-line-soft bg-recessed px-3 text-sm text-ink placeholder:text-ink3 transition-shadow";

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[13px] font-medium text-ink2"
      >
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-ink3">{hint}</p> : null}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(FIELD_STYLES, props.className)} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(FIELD_STYLES, "cursor-pointer", props.className)} />;
}
