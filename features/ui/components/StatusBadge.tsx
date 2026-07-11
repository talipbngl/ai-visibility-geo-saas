import { Badge } from "@/components/ui/badge";
import { getStatusLabel } from "@/lib/ui/labels";

type StatusBadgeProps = {
  status: string;
};

function getStatusVariant(status: string) {
  if (status === "completed") return "default" as const;
  if (status === "failed") return "destructive" as const;
  if (status === "running") return "secondary" as const;

  return "outline" as const;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge variant={getStatusVariant(status)}>
      {getStatusLabel(status)}
    </Badge>
  );
}