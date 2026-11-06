import { Check, CircleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type StatusBadgeProps = {
  status: "needs-check" | "saved";
};

function StatusBadge({ status }: StatusBadgeProps) {
  if (status === "needs-check") {
    return (
      <Badge variant="warning">
        <CircleAlert aria-hidden="true" />
        Perlu dicek
      </Badge>
    );
  }

  return (
    <Badge variant="success">
      <Check aria-hidden="true" />
      Tersimpan
    </Badge>
  );
}

export { StatusBadge };
