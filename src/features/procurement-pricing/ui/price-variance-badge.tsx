import { TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PriceAlertLevel } from "../types/pricing";

export function formatSignedPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const formatted = new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 1,
  }).format(Math.abs(rounded));
  if (rounded > 0) return `+${formatted}%`;
  if (rounded < 0) return `-${formatted}%`;
  return "0%";
}

/**
 * Badge displaying the Purchase Price Variance (PPV) status and percentage.
 */
export function PriceVarianceBadge({
  alertLevel,
  variancePercent,
  purchaseCount = 2,
}: {
  alertLevel: PriceAlertLevel;
  variancePercent: number;
  purchaseCount?: number;
}) {
  if (purchaseCount < 2) {
    return <Badge variant="outline">Data awal EMA</Badge>;
  }

  if (alertLevel === "CRITICAL") {
    return (
      <Badge
        variant="warning"
        className="border-red-300 bg-red-100 text-red-900 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200"
      >
        <AlertTriangle aria-hidden="true" />
        Naik tajam · {formatSignedPercent(variancePercent)}
      </Badge>
    );
  }

  if (alertLevel === "WARNING") {
    return (
      <Badge variant="warning">
        <TrendingUp aria-hidden="true" />
        Harga naik · {formatSignedPercent(variancePercent)}
      </Badge>
    );
  }

  if (alertLevel === "PRICE_DROP") {
    return (
      <Badge variant="success">
        <TrendingDown aria-hidden="true" />
        Harga turun · {formatSignedPercent(variancePercent)}
      </Badge>
    );
  }

  return (
    <Badge variant="outline">
      Harga stabil ({formatSignedPercent(variancePercent)})
    </Badge>
  );
}
