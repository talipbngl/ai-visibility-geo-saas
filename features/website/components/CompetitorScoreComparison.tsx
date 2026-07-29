import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ScoreKey = "technical" | "structure" | "content" | "trust";

type CompetitorScore = {
  id: string;
  name: string;
  scoresValue: unknown;
};

type CompetitorScoreComparisonProps = {
  brandName: string;
  brandScoresValue: unknown;
  competitors: CompetitorScore[];
};

const scoreItems: Array<{
  key: ScoreKey;
  label: string;
}> = [
  {
    key: "technical",
    label: "Teknik",
  },
  {
    key: "structure",
    label: "Sayfa yapısı",
  },
  {
    key: "content",
    label: "İçerik",
  },
  {
    key: "trust",
    label: "Güven",
  },
];
function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function getScore(value: unknown, key: ScoreKey | "overall") {
  const record = toRecord(value);
  const score = Number(record[key] ?? 0);

  if (!Number.isFinite(score)) return 0;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function hasDetailedScores(value: unknown) {
  const record = toRecord(value);

  return scoreItems.some(({ key }) =>
    Number.isFinite(Number(record[key]))
  );
}

function formatDifference(value: number) {
  if (value > 0) return `+${value}`;
  return String(value);
}

export function CompetitorScoreComparison({
  brandName,
  brandScoresValue,
  competitors,
}: CompetitorScoreComparisonProps) {
  const analyzedCompetitors = competitors.filter((competitor) =>
    hasDetailedScores(competitor.scoresValue)
  );

  if (!hasDetailedScores(brandScoresValue)) {
    return (
      <Card className="border-dashed shadow-sm">
        <CardHeader>
          <CardTitle>Marka ve rakip karşılaştırması</CardTitle>
          <CardDescription>
            Karşılaştırma için markanın güncel web sitesi analizi gerekiyor.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">
            Önce marka web sitesi analizini yeniden çalıştırın. Ardından kategori
            puanları rakiplerle karşılaştırılabilir.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (analyzedCompetitors.length === 0) {
    return (
      <Card className="border-dashed shadow-sm">
        <CardHeader>
          <CardTitle>Marka ve rakip karşılaştırması</CardTitle>
          <CardDescription>
            Henüz güncel kategori puanı bulunan rakip yok.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">
            En az bir rakibin web sitesi analizini yeniden çalıştırın.
          </p>
        </CardContent>
      </Card>
    );
  }

  function getCompetitorAverage(key: ScoreKey | "overall") {
    const total = analyzedCompetitors.reduce(
      (sum, competitor) => sum + getScore(competitor.scoresValue, key),
      0
    );

    return Math.round(total / analyzedCompetitors.length);
  }

  const rows = scoreItems.map((item) => {
    const brandScore = getScore(brandScoresValue, item.key);
    const competitorAverage = getCompetitorAverage(item.key);

    return {
      ...item,
      brandScore,
      competitorAverage,
      difference: brandScore - competitorAverage,
    };
  });

  const overallBrandScore = getScore(brandScoresValue, "overall");
  const overallCompetitorAverage = getCompetitorAverage("overall");
  const overallDifference =
    overallBrandScore - overallCompetitorAverage;

  const gaps = [...rows]
    .filter((row) => row.difference < 0)
    .sort((first, second) => first.difference - second.difference)
    .slice(0, 3);

  const advantages = [...rows]
    .filter((row) => row.difference > 0)
    .sort((first, second) => second.difference - first.difference)
    .slice(0, 2);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Marka ve rakip karşılaştırması</CardTitle>
        <CardDescription>
          {brandName} ile analiz edilen rakiplerin kategori puanlarını
          karşılaştırır.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-primary/5 p-4">
            <p className="text-sm text-muted-foreground">
              Marka genel puanı
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {overallBrandScore}/100
            </p>
          </div>

          <div className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">
              Rakip ortalaması
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {overallCompetitorAverage}/100
            </p>
          </div>

          <div className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">
              Genel puan farkı
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {formatDifference(overallDifference)}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="px-4 py-3 text-left font-medium">
                  Kategori
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  Marka
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  Rakip ortalaması
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  Fark
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-t">
                  <td className="px-4 py-3 font-medium">
                    {row.label}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.brandScore}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.competitorAverage}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Badge
                      variant={
                        row.difference < 0
                          ? "destructive"
                          : row.difference > 0
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {formatDifference(row.difference)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <p className="font-medium">Rakibe göre gelişim alanları</p>

            {gaps.length > 0 ? (
              <div className="mt-3 space-y-3">
                {gaps.map((gap) => (
                  <div key={gap.key} className="rounded-lg bg-background p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{gap.label}</p>
                      <Badge variant="destructive">
                        {formatDifference(gap.difference)}
                      </Badge>
                    </div>

                   <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {brandName},{" "}
                    {gap.label.toLocaleLowerCase("tr-TR")} kategorisinde rakip
                    ortalamasının {Math.abs(gap.difference)} puan gerisinde.
                  </p>
                  </div>
                ))}
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
  Puan farkı tek başına belirli bir teknik eksikliği kanıtlamaz.
  Doğrulanmış yapılacak işler marka raporundaki uygulama planında
  gösterilir.
</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Marka hiçbir kategoride rakip ortalamasının gerisinde değil.
              </p>
            )}
          </div>

          <div className="rounded-xl border p-4">
            <p className="font-medium">Güçlü olduğunuz alanlar</p>

            {advantages.length > 0 ? (
              <div className="mt-3 space-y-3">
                {advantages.map((advantage) => (
                  <div
                    key={advantage.key}
                    className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 p-3"
                  >
                    <p className="text-sm font-medium">
                      {advantage.label}
                    </p>

                    <Badge variant="secondary">
                      {formatDifference(advantage.difference)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Marka henüz rakip ortalamasının üzerine çıktığı bir kategoriye
                sahip değil.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}