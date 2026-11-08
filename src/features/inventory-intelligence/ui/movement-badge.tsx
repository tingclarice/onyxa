import { TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MovementStatus } from "../types/inventory";

/** "Melambat", "Normal" or "Belum cukup data". */
export function MovementBadge({ status }: { status: MovementStatus }) {
  if (status.kind === "slowing")
    return (
      <Badge variant="warning">
        <TrendingDown aria-hidden="true" />
        Melambat
      </Badge>
    );
  if (status.kind === "normal") return <Badge variant="success">Normal</Badge>;
  return <Badge variant="outline">Belum cukup data</Badge>;
}
