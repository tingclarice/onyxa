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
};

function ConfidenceField({
  label,
  confidence,
  className,
  ...inputProps
}: ConfidenceFieldProps) {
  const generatedId = useId();
  const inputId = inputProps.id ?? generatedId;
  const needsCheck = confidence < 0.8;
  const messageId = `${inputId}-confidence`;

  return (
    <div className="min-w-0 space-y-2">
      <label htmlFor={inputId} className="block text-base font-medium">
        {label}
      </label>
      <Input
        {...inputProps}
        id={inputId}
        aria-describedby={needsCheck ? messageId : undefined}
        className={cn(
          needsCheck &&
            "border-amber-500 focus-visible:border-amber-600 focus-visible:ring-amber-500/30",
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
    </div>
  );
}

export { ConfidenceField };
