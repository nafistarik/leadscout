import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/storage";

const FIELD_STYLES =
  "neu-recessed h-10 w-full rounded-lg border border-line-soft bg-recessed px-3 text-sm text-ink placeholder:text-ink3 transition-[box-shadow,background-color,border-color] disabled:cursor-not-allowed disabled:opacity-60";

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
  const { className, children, ...rest } = props;
  return (
    <span className="relative block">
      <select
        {...rest}
        className={cn(FIELD_STYLES, "cursor-pointer appearance-none pr-9", className)}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink3"
      />
    </span>
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(FIELD_STYLES, "h-auto min-h-20 py-2", props.className)}
    />
  );
}
