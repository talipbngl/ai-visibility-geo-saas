import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type MetricCardProps = {
  title: string;
  value: ReactNode;
  description?: string;
  footer?: ReactNode;
};

export function MetricCard({
  title,
  value,
  description,
  footer,
}: MetricCardProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>

        {description ? (
          <CardDescription>{description}</CardDescription>
        ) : null}
      </CardHeader>

      <CardContent>
        <div className="text-3xl font-semibold tracking-tight">{value}</div>

        {footer ? (
          <div className="mt-2 text-sm text-muted-foreground">{footer}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}