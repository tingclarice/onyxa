"use client";

import { useId, useState } from "react";
import { CircleAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatRupiah } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { isLowConfidence } from "../../core/receipt-review-rules";

type CurrencyInputProps = {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
  id?: string;
  confidence?: number;
  error?: string;
};

function CurrencyInput({
  label,
  value,
  onValueChange,
  className,
  disabled,
  id,
  confidence = 1,
  error,
}: CurrencyInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [isEditing, setIsEditing] = useState(false);
  const formattedValue = Number.isFinite(value) ? formatRupiah(value) : "";
  const needsCheck = isLowConfidence(confidence);

  return (
    <div className="min-w-0 space-y-2">
      <label htmlFor={inputId} className="block text-base font-medium">
        {label}
      </label>
      <Input
        id={inputId}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={cn(
          "tabular-nums",
          needsCheck && "border-amber-500 focus-visible:ring-amber-500/30",
          error && "border-destructive focus-visible:ring-destructive/30",
          className,
        )}
        value={isEditing ? (value === 0 ? "" : String(value)) : formattedValue}
        onFocus={() => setIsEditing(true)}
        onBlur={() => setIsEditing(false)}
        onChange={(event) => {
          const digits = event.currentTarget.value.replace(/\D/g, "");
          onValueChange(digits === "" ? 0 : Number(digits));
        }}
      />
      {needsCheck && (
        <p className="flex min-h-6 items-center gap-1.5 text-sm font-medium text-amber-800 dark:text-amber-200">
          <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
          <span>Perlu dicek</span>
        </p>
      )}
      {error && (
        <p id={`${inputId}-error`} className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export { CurrencyInput };
