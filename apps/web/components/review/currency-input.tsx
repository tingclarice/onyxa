"use client";

import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

type CurrencyInputProps = {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
  id?: string;
};

function CurrencyInput({
  label,
  value,
  onValueChange,
  className,
  disabled,
  id,
}: CurrencyInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [isEditing, setIsEditing] = useState(false);
  const formattedValue = Number.isFinite(value) ? formatRupiah(value) : "";

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
        className={cn("tabular-nums", className)}
        value={isEditing ? (value === 0 ? "" : String(value)) : formattedValue}
        onFocus={() => setIsEditing(true)}
        onBlur={() => setIsEditing(false)}
        onChange={(event) => {
          const digits = event.currentTarget.value.replace(/\D/g, "");
          onValueChange(digits === "" ? 0 : Number(digits));
        }}
      />
    </div>
  );
}

export { CurrencyInput };
