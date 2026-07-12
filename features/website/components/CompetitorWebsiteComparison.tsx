import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MetricCard } from "@/features/ui/components";

type Signal = {
  keyword: string;
  count: number;
  found: boolean;
};

type BrandWebsiteSnapshot = {
  content_score: number | null;
  service_signals_json: unknown;
  trust_signals_json: unknown;
} | null;

type CompetitorWebsiteSnapshot = {
  id: string;
  competitor_id: string;
  competitor_name: string;
  website_url: string;
  content_score: number | null;
  word_count: number | null;
  service_signals_json: unknown;
  trust_signals_json: unknown;
  created_at: string | null;
};

type CompetitorWebsiteComparisonProps = {
  brandSnapshot: BrandWebsiteSnapshot;
  competitorSnapshots: CompetitorWebsiteSnapshot[];
};

function toSignalArray(value: unknown): Signal[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const signal = item as Partial<Signal>;

      return {
        keyword: String(signal.keyword ?? ""),
        count: Number(signal.count ?? 0),
        found: Boolean(signal.found),
      };
    })
    .filter((item): item is Signal => Boolean(item?.keyword));
}

function getFoundKeywords(value: unknown) {
  return toSignalArray(value)
    .filter((signal) => signal.found)
    .map((signal) => signal.keyword);
}

function getAverageScore(snapshots: CompetitorWebsiteSnapshot[]) {
  if (snapshots.length === 0) return null;

  const total = snapshots.reduce(
    (sum, snapshot) => sum + Number(snapshot.content_score ?? 0),
    0
  );

  return Math.round(total / snapshots.length);
}

function getScoreGapLabel(gap: number) {
  if (gap > 10) return "Marka rakip ortalamasının üzerinde";
  if (gap >= -10) return "Marka rakip ortalamasına yakın";

  return "Marka rakip ortalamasının gerisinde";
}

export function CompetitorWebsiteComparison({
  brandSnapshot,
  competitorSnapshots,
}: CompetitorWebsiteComparisonProps) {
  if (competitorSnapshots.length === 0) {
    return (
      <Card className="border-dashed shadow-sm">
        <CardHeader>
          <CardTitle>Rakip Website Karşılaştırması</CardTitle>
          <CardDescription>
            Henüz rakip website analizi yapılmamış.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">
            Rakip website analizleri yapıldığında bu bölümde marka ile rakiplerin
            içerik ve güven sinyalleri karşılaştırılacak.
          </p>
        </CardContent>
      </Card>
    );
  }

  const brandScore = Math.round(Number(brandSnapshot?.content_score ?? 0));
  const competitorAverageScore = getAverageScore(competitorSnapshots) ?? 0;

  const strongestCompetitor = [...competitorSnapshots].sort(
    (a, b) => Number(b.content_score ?? 0) - Number(a.content_score ?? 0)
  )[0];

  const scoreGap = brandScore - competitorAverageScore;

  const brandServiceKeywords = new Set(
    getFoundKeywords(brandSnapshot?.service_signals_json)
  );

  const brandTrustKeywords = new Set(
    getFoundKeywords(brandSnapshot?.trust_signals_json)
  );

  const competitorServiceKeywords = new Set(
    competitorSnapshots.flatMap((snapshot) =>
      getFoundKeywords(snapshot.service_signals_json)
    )
  );

  const competitorTrustKeywords = new Set(
    competitorSnapshots.flatMap((snapshot) =>
      getFoundKeywords(snapshot.trust_signals_json)
    )
  );

  const competitorOnlyServiceKeywords = Array.from(
    competitorServiceKeywords
  ).filter((keyword) => !brandServiceKeywords.has(keyword));

  const competitorOnlyTrustKeywords = Array.from(competitorTrustKeywords).filter(
    (keyword) => !brandTrustKeywords.has(keyword)
  );

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Rakip Website Karşılaştırması</CardTitle>
        <CardDescription>
          Marka website sinyalleri ile rakiplerin website sinyallerini
          karşılaştırır.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard
            title="Marka Website Skoru"
            description="Temel içerik sinyali"
            value={brandSnapshot ? `${brandScore}/100` : "-"}
          />

          <MetricCard
            title="Rakip Ortalaması"
            description="Analiz edilen rakipler"
            value={`${competitorAverageScore}/100`}
          />

          <MetricCard
            title="Skor Farkı"
            description="Marka - rakip ortalaması"
            value={`${scoreGap > 0 ? "+" : ""}${scoreGap}`}
          />

          <MetricCard
            title="Analiz Edilen Rakip"
            description="Website analizi bulunan rakip"
            value={competitorSnapshots.length}
          />
        </section>

        <div className="rounded-xl border bg-muted/20 p-4">
          <p className="text-sm font-medium">Kısa yorum</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {getScoreGapLabel(scoreGap)}. Bu karşılaştırma ana sayfa içerik
            sinyallerine göre yapılır; kesin SEO teşhisi değildir.
          </p>
        </div>

        {strongestCompetitor ? (
          <div className="rounded-xl border p-4">
            <p className="text-sm font-medium">En güçlü rakip website sinyali</p>

            <div className="mt-3 flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <p className="font-medium">{strongestCompetitor.competitor_name}</p>
                <p className="mt-1 break-all text-sm text-muted-foreground">
                  {strongestCompetitor.website_url}
                </p>
              </div>

              <Badge variant="secondary">
                {Math.round(Number(strongestCompetitor.content_score ?? 0))}/100
              </Badge>
            </div>
          </div>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-medium text-destructive">
              Rakiplerde olup markada eksik görünen hizmet sinyalleri
            </p>

            {competitorOnlyServiceKeywords.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {competitorOnlyServiceKeywords.slice(0, 16).map((keyword) => (
                  <Badge key={keyword} variant="outline">
                    {keyword}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Rakiplerde olup markada eksik görünen belirgin hizmet sinyali
                tespit edilmedi.
              </p>
            )}
          </div>

          <div className="rounded-xl border p-4">
            <p className="text-sm font-medium">
              Rakiplerde olup markada eksik görünen güven sinyalleri
            </p>

            {competitorOnlyTrustKeywords.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {competitorOnlyTrustKeywords.slice(0, 16).map((keyword) => (
                  <Badge key={keyword} variant="outline">
                    {keyword}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Rakiplerde olup markada eksik görünen belirgin güven sinyali
                tespit edilmedi.
              </p>
            )}
          </div>
        </section>

        <div className="space-y-3">
          <p className="text-sm font-medium">Rakip skorları</p>

          <div className="space-y-3">
            {competitorSnapshots
              .sort(
                (a, b) =>
                  Number(b.content_score ?? 0) - Number(a.content_score ?? 0)
              )
              .map((snapshot) => (
                <div
                  key={snapshot.id}
                  className="flex flex-col justify-between gap-3 rounded-xl border p-4 md:flex-row md:items-center"
                >
                  <div>
                    <p className="font-medium">{snapshot.competitor_name}</p>
                    <p className="mt-1 break-all text-sm text-muted-foreground">
                      {snapshot.website_url}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      Skor: {Math.round(Number(snapshot.content_score ?? 0))}/100
                    </Badge>

                    <Badge variant="outline">
                      Kelime: {snapshot.word_count ?? 0}
                    </Badge>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}