import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AuditProgressPanelProps = {
  totalCount: number;
  pendingCount: number;
  runningCount: number;
  completedCount: number;
  failedCount: number;
};

function getCompletionRate(completedCount: number, totalCount: number) {
  if (totalCount <= 0) return 0;

  return Math.round((completedCount / totalCount) * 100);
}

export function AuditProgressPanel({
  totalCount,
  pendingCount,
  runningCount,
  completedCount,
  failedCount,
}: AuditProgressPanelProps) {
  const completionRate = getCompletionRate(completedCount, totalCount);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <CardTitle>Ölçüm İlerlemesi</CardTitle>
            <CardDescription>
              Test sorularının çalışma durumunu buradan takip edebilirsin.
            </CardDescription>
          </div>

          <Badge variant={failedCount > 0 ? "destructive" : "secondary"}>
            %{completionRate} tamamlandı
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="h-3 overflow-hidden rounded-full border bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${completionRate}%` }}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          <div className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">Toplam</p>
            <p className="mt-1 text-2xl font-semibold">{totalCount}</p>
          </div>

          <div className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">Bekleyen</p>
            <p className="mt-1 text-2xl font-semibold">{pendingCount}</p>
          </div>

          <div className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">Çalışıyor</p>
            <p className="mt-1 text-2xl font-semibold">{runningCount}</p>
          </div>

          <div className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">Tamamlanan</p>
            <p className="mt-1 text-2xl font-semibold">{completedCount}</p>
          </div>

          <div className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">Hatalı</p>
            <p className="mt-1 text-2xl font-semibold">{failedCount}</p>
          </div>
        </div>

        {failedCount > 0 ? (
          <p className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            Bazı sorular hata aldı. “Hatalıları tekrar dene” butonuyla sadece
            başarısız soruları yeniden kuyruğa alabilirsin.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}