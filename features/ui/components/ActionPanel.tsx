import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ActionPanelProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function ActionPanel({
  title,
  description,
  children,
}: ActionPanelProps) {
  return (
    <Card className="border-primary/20 bg-primary/5 shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription className="leading-6">{description}</CardDescription>
      </CardHeader>

      {children ? <CardContent>{children}</CardContent> : null}
    </Card>
  );
}