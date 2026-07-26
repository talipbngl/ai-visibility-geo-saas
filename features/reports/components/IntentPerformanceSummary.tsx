import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getIntentLabel } from "@/lib/ui/labels";

export type IntentPerformanceItem = {
  intent: string;
  total: number;
  mentionCount: number;
  visibilityRate: number;
  averageRank: number | null;
};

type IntentPerformanceSummaryProps = {
  items: IntentPerformanceItem[];
};

function getBarClass(visibilityRate: number) {
  if (visibilityRate >= 75) return "bg-emerald-500";
  if (visibilityRate >= 50) return "bg-blue-500";
  if (visibilityRate >= 25) return "bg-amber-500";

  return "bg-destructive";
}

export function IntentPerformanceSummary({
  items,
}: IntentPerformanceSummaryProps) {
  if (items.length === 0) return null;

  const comparableItems = items.filter((item) => item.total >= 2);

  const strongestIntent = [...comparableItems].sort(
    (a, b) => b.visibilityRate - a.visibilityRate
  )[0];

  const weakestIntent = [...comparableItems].sort(
    (a, b) => a.visibilityRate - b.visibilityRate
  )[0];

  const hasMeaningfulDifference =
    comparableItems.length >= 2 &&
    strongestIntent.visibilityRate !== weakestIntent.visibilityRate;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Soru niyetlerine göre görünürlük</CardTitle>
        <CardDescription>
          Markanın satın alma, karşılaştırma ve öneri gibi farklı soru
          türlerindeki performansı.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {items.map((item) => {
          const isStrongest =
            hasMeaningfulDifference &&
            strongestIntent.intent === item.intent;

          const isWeakest =
            hasMeaningfulDifference &&
            weakestIntent.intent === item.intent;

          return (
            <div key={item.intent} className="rounded-xl border p-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">
                      {getIntentLabel(item.intent)}
                    </p>

                    {isStrongest ? (
                      <Badge variant="secondary">En güçlü alan</Badge>
                    ) : null}

                    {isWeakest ? (
                      <Badge variant="destructive">Gelişim alanı</Badge>
                    ) : null}

                    {item.total < 3 ? (
                      <Badge variant="outline">Az veri</Badge>
                    ) : null}
                  </div>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.mentionCount} / {item.total} soruda görünür
                  </p>
                </div>

                <div className="sm:text-right">
                  <p className="text-2xl font-semibold">
                    %{item.visibilityRate}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    Ortalama sıra: {item.averageRank ?? "-"}
                  </p>
                </div>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${getBarClass(
                    item.visibilityRate
                  )}`}
                  style={{ width: `${item.visibilityRate}%` }}
                />
              </div>
            </div>
          );
        })}

        <p className="text-xs leading-5 text-muted-foreground">
          Sonuçlar yalnızca bu ölçümde tamamlanan sorulara dayanır. Üçten az
          sorusu bulunan niyetlerde sonuç sınırlı veri olarak değerlendirilir.
        </p>
      </CardContent>
    </Card>
  );
}