import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import type { BaseUnit, SpeedflowResult } from "../types/inventory";
import { formatPerDay } from "./movement-format";

interface SpeedflowBadgeProps {
  speedflow: SpeedflowResult;
  baseUnit: BaseUnit;
}

export function SpeedflowBadge({ speedflow, baseUnit }: SpeedflowBadgeProps) {
  const isCalibrated = speedflow.confidence === "CALIBRATED";
  const windowDays = speedflow.windowDays ?? 14;
  const confidenceLabel = isCalibrated
    ? "Terverifikasi"
    : `Est. ${windowDays}h`;
  const confidenceHelp = isCalibrated
    ? "Terverifikasi: kecepatan jual dihitung langsung dari selisih dua catatan stock opname terbaru (≤ 14 hari)."
    : `Perkiraan: belum ada dua catatan stock opname terbaru (≤ 14 hari), sehingga dihitung dari total restock dalam ${windowDays} hari terakhir.`;

  return (
    <div className="relative z-10 flex flex-wrap items-center gap-1.5 text-xs">
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
        <InfoTooltip label={confidenceLabel} text={confidenceHelp} />
      </span>
      {speedflow.hasCountDiscrepancy && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 font-medium text-amber-800 dark:text-amber-300">
          <AlertTriangle aria-hidden="true" className="size-3" />
          Selisih hitung
          <InfoTooltip
            label="Selisih hitung"
            text="Stok fisik terakhir lebih besar daripada stok awal ditambah restock. Kecepatan dijepit ke 0."
          />
        </span>
      )}
    </div>
  );
}
