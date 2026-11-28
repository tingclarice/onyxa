import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import type { BaseUnit, SpeedflowResult } from "../types/inventory";
import { formatPerDay } from "./movement-format";

interface SpeedflowBadgeProps {
  speedflow: SpeedflowResult;
  baseUnit: BaseUnit;
}

export function SpeedflowBadge({ speedflow, baseUnit }: SpeedflowBadgeProps) {
  const isCalibrated = speedflow.confidence === "CALIBRATED";
  const confidenceLabel = isCalibrated
    ? "Terverifikasi"
    : `Est. ${speedflow.windowDays ?? 14}h`;

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="font-medium text-foreground tabular-nums">
        {formatPerDay(speedflow.speedflowPerDay, baseUnit)}
      </span>
      <span
        className={
          isCalibrated
            ? "inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-700 dark:text-emerald-400"
            : "inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground"
        }
      >
        {isCalibrated ? (
          <CheckCircle2 aria-hidden="true" className="size-3" />
        ) : (
          <Clock aria-hidden="true" className="size-3" />
        )}
        {confidenceLabel}
      </span>
      {speedflow.hasCountDiscrepancy && (
        <span
          title="Hasil hitung melebihi stok awal + restock (COUNT_DISCREPANCY). Kecepatan dijepit ke 0."
          className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 font-medium text-amber-800 dark:text-amber-300"
        >
          <AlertTriangle aria-hidden="true" className="size-3" />
          Selisih hitung
        </span>
      )}
    </div>
  );
}
