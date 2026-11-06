import { useId } from "react";
import { CircleAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ConfidenceFieldProps = Omit<
  React.ComponentProps<typeof Input>,
  "aria-describedby"
> & {
  label: string;
  confidence: number;
  error?: string;
};

function ConfidenceField({
  label,
  confidence,
  error,
  className,
  ...inputProps
}: ConfidenceFieldProps) {
  const generatedId = useId();
  const inputId = inputProps.id ?? generatedId;
  const needsCheck = confidence < 0.8;
  const messageId = `${inputId}-confidence`;
  const errorId = `${inputId}-error`;

  return (
    <div className="min-w-0 space-y-2">
      <label htmlFor={inputId} className="block text-base font-medium">
        {label}
      </label>
      <Input
        {...inputProps}
        id={inputId}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={
          [needsCheck ? messageId : undefined, error ? errorId : undefined]
            .filter(Boolean)
            .join(" ") || undefined
        }
        className={cn(
          needsCheck &&
            "border-amber-500 focus-visible:border-amber-600 focus-visible:ring-amber-500/30",
          error && "border-destructive focus-visible:ring-destructive/30",
          className,
        )}
      />
      {needsCheck && (
        <p
          id={messageId}
          className="flex min-h-6 items-center gap-1.5 text-sm font-medium text-amber-800 dark:text-amber-200"
        >
          <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
          <span>Perlu dicek</span>
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export { ConfidenceField };
