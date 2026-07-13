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

type WebsiteSnapshot = {
  content_score: number | null;
  service_signals_json: unknown;
  trust_signals_json: unknown;
} | null;

type CompetitorWebsiteSnapshot = {
  competitor_name: string;
  content_score: number | null;
  service_signals_json: unknown;
  trust_signals_json: unknown;
};

type Recommendation = {
  title: string;
  description: string;
  priority: string | null;
  impact: string | null;
};

type EvidenceActionSummaryProps = {
  brandName: string;
  totalPrompts: number;
  visibleCount: number;
  invisibleCount: number;
  visibilityScore: number;
  brandWebsiteSnapshot: WebsiteSnapshot;
  competitorWebsiteSnapshots: CompetitorWebsiteSnapshot[];
  recommendations: Recommendation[];
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

function getAverageCompetitorScore(
  competitorWebsiteSnapshots: CompetitorWebsiteSnapshot[]
) {
  if (competitorWebsiteSnapshots.length === 0) return null;

  const total = competitorWebsiteSnapshots.reduce(
    (sum, snapshot) => sum + Number(snapshot.content_score ?? 0),
    0
  );

  return Math.round(total / competitorWebsiteSnapshots.length);
}

function getCompetitorOnlyKeywords({
  brandWebsiteSnapshot,
  competitorWebsiteSnapshots,
  type,
}: {
  brandWebsiteSnapshot: WebsiteSnapshot;
  competitorWebsiteSnapshots: CompetitorWebsiteSnapshot[];
  type: "service" | "trust";
}) {
  const brandKeywords = new Set(
    getFoundKeywords(
      type === "service"
        ? brandWebsiteSnapshot?.service_signals_json
        : brandWebsiteSnapshot?.trust_signals_json
    )
  );

  const competitorKeywords = new Set(
    competitorWebsiteSnapshots.flatMap((snapshot) =>
      getFoundKeywords(
        type === "service"
          ? snapshot.service_signals_json
          : snapshot.trust_signals_json
      )
    )
  );

  return Array.from(competitorKeywords).filter(
    (keyword) => !brandKeywords.has(keyword)
  );
}

function getPriorityLabel(value: string | null) {
  if (value === "high") return "Yüksek";
  if (value === "medium") return "Orta";
  if (value === "low") return "Düşük";

  return "Belirsiz";
}

function getImpactLabel(value: string | null) {
  if (value === "high") return "Yüksek etki";
  if (value === "medium") return "Orta etki";
  if (value === "low") return "Düşük etki";

  return "Etki belirsiz";
}

function buildMainProblems({
  brandName,
  totalPrompts,
  visibleCount,
  invisibleCount,
  visibilityScore,
  brandWebsiteScore,
  averageCompetitorScore,
  competitorOnlyServiceKeywords,
  competitorOnlyTrustKeywords,
}: {
  brandName: string;
  totalPrompts: number;
  visibleCount: number;
  invisibleCount: number;
  visibilityScore: number;
  brandWebsiteScore: number | null;
  averageCompetitorScore: number | null;
  competitorOnlyServiceKeywords: string[];
  competitorOnlyTrustKeywords: string[];
}) {
  const problems: {
    title: string;
    evidence: string;
    action: string;
  }[] = [];

  if (invisibleCount > 0) {
    problems.push({
      title: "Marka önemli AI cevaplarında görünmüyor",
      evidence: `${brandName}, ${totalPrompts} test sorusunun ${visibleCount} tanesinde görünürken ${invisibleCount} tanesinde görünmedi. Genel görünürlük skoru ${Math.round(
        visibilityScore
      )}/100.`,
      action:
        "Markanın görünmediği soru tipleri için hizmet sayfaları, SSS içerikleri ve karşılaştırmalı rehber içerikler hazırlanmalı.",
    });
  }

  if (
    brandWebsiteScore !== null &&
    averageCompetitorScore !== null &&
    brandWebsiteScore + 10 < averageCompetitorScore
  ) {
    problems.push({
      title: "Website içerik sinyali rakip ortalamasının gerisinde",
      evidence: `${brandName} website skoru ${brandWebsiteScore}/100, analiz edilen rakip website ortalaması ise ${averageCompetitorScore}/100.`,
      action:
        "Ana sayfa başlıkları, hizmet açıklamaları, güven unsurları ve sektörel kelime kapsamı rakiplerle kıyaslanarak güçlendirilmeli.",
    });
  }

  if (competitorOnlyServiceKeywords.length > 0) {
    problems.push({
      title: "Rakiplerde bulunan hizmet sinyalleri markada zayıf",
      evidence: `Rakiplerde görünen ama markada güçlü tespit edilmeyen hizmet sinyalleri: ${competitorOnlyServiceKeywords
        .slice(0, 8)
        .join(", ")}.`,
      action:
        "Bu hizmetler için ayrı içerik blokları, hizmet sayfaları veya kullanıcı sorularına cevap veren SSS alanları oluşturulmalı.",
    });
  }

  if (competitorOnlyTrustKeywords.length > 0) {
    problems.push({
      title: "Güven sinyalleri rakiplere göre eksik görünüyor",
      evidence: `Rakiplerde görünen ama markada zayıf kalan güven sinyalleri: ${competitorOnlyTrustKeywords
        .slice(0, 8)
        .join(", ")}.`,
      action:
        "Yorumlar, referanslar, uzmanlık bilgileri, iletişim bilgileri, hakkımızda ve SSS alanları daha görünür hale getirilmeli.",
    });
  }

  if (visibilityScore < 50 && problems.length < 3) {
    problems.push({
      title: "AI görünürlük skoru düşük",
      evidence: `${brandName} için hesaplanan görünürlük skoru ${Math.round(
        visibilityScore
      )}/100.`,
      action:
        "Markanın hedef müşteri sorularına doğrudan cevap veren içerik sayısı artırılmalı ve düzenli ölçüm yapılmalı.",
    });
  }

  if (problems.length === 0) {
    problems.push({
      title: "Kritik eksik sinyal tespit edilmedi",
      evidence:
        "Mevcut ölçümde marka görünürlüğü, website sinyalleri ve rakip kıyasına göre büyük bir açık görünmüyor.",
      action:
        "Bu durum korunmalı; haftalık veya aylık düzenli ölçümle görünürlük trendi takip edilmeli.",
    });
  }

  return problems.slice(0, 3);
}

export function EvidenceActionSummary({
  brandName,
  totalPrompts,
  visibleCount,
  invisibleCount,
  visibilityScore,
  brandWebsiteSnapshot,
  competitorWebsiteSnapshots,
  recommendations,
}: EvidenceActionSummaryProps) {
  const brandWebsiteScore = brandWebsiteSnapshot
    ? Math.round(Number(brandWebsiteSnapshot.content_score ?? 0))
    : null;

  const averageCompetitorScore = getAverageCompetitorScore(
    competitorWebsiteSnapshots
  );

  const competitorOnlyServiceKeywords = getCompetitorOnlyKeywords({
    brandWebsiteSnapshot,
    competitorWebsiteSnapshots,
    type: "service",
  });

  const competitorOnlyTrustKeywords = getCompetitorOnlyKeywords({
    brandWebsiteSnapshot,
    competitorWebsiteSnapshots,
    type: "trust",
  });

  const mainProblems = buildMainProblems({
    brandName,
    totalPrompts,
    visibleCount,
    invisibleCount,
    visibilityScore,
    brandWebsiteScore,
    averageCompetitorScore,
    competitorOnlyServiceKeywords,
    competitorOnlyTrustKeywords,
  });

  const topRecommendations = recommendations.slice(0, 3);

  return (
    <Card className="border-primary/20 bg-primary/5 shadow-sm">
      <CardHeader>
        <CardTitle>Kanıta Dayalı Aksiyon Özeti</CardTitle>
        <CardDescription>
          Bu bölüm AI cevap analizi, marka website sinyalleri ve rakip website
          karşılaştırmasına göre en kritik aksiyon alanlarını özetler.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard
            title="Görünmediği Soru"
            description="AI cevaplarında marka yok"
            value={`${invisibleCount}/${totalPrompts}`}
          />

          <MetricCard
            title="Marka Website Skoru"
            description="İçerik sinyali"
            value={brandWebsiteScore !== null ? `${brandWebsiteScore}/100` : "-"}
          />

          <MetricCard
            title="Rakip Ortalaması"
            description="Website skoru"
            value={
              averageCompetitorScore !== null
                ? `${averageCompetitorScore}/100`
                : "-"
            }
          />

          <MetricCard
            title="Eksik Rakip Sinyali"
            description="Hizmet + güven"
            value={
              competitorOnlyServiceKeywords.length +
              competitorOnlyTrustKeywords.length
            }
          />
        </section>

        <div className="space-y-3">
          <p className="text-sm font-medium">En büyük 3 problem</p>

          <div className="grid gap-4 lg:grid-cols-3">
            {mainProblems.map((problem, index) => (
              <div key={problem.title} className="rounded-xl border bg-background p-4">
                <Badge variant="secondary">{index + 1}. problem</Badge>

                <p className="mt-3 font-medium leading-6">{problem.title}</p>

                <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">Kanıt: </span>
                    {problem.evidence}
                  </p>

                  <p>
                    <span className="font-medium text-foreground">
                      Yapılacak iş:{" "}
                    </span>
                    {problem.action}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {topRecommendations.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">Öncelikli aksiyonlar</p>

            <div className="space-y-3">
              {topRecommendations.map((recommendation, index) => (
                <div
                  key={`${recommendation.title}-${index}`}
                  className="rounded-xl border bg-background p-4"
                >
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Badge variant="secondary">{index + 1}. aksiyon</Badge>

                    <Badge variant="outline">
                      Öncelik: {getPriorityLabel(recommendation.priority)}
                    </Badge>

                    <Badge variant="outline">
                      {getImpactLabel(recommendation.impact)}
                    </Badge>
                  </div>

                  <p className="font-medium">{recommendation.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {recommendation.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border bg-background p-4">
            <p className="text-sm font-medium">Öneri bulunamadı</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Aksiyon önerilerini oluşturmak için rapordaki “Önerileri
              güncelle” butonunu kullan.
            </p>
          </div>
        )}

        <div className="rounded-xl border bg-background/80 p-4">
          <p className="text-sm font-medium">Metodoloji notu</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Bu özet kesin SEO teşhisi değildir. AI cevap görünürlüğü, ana sayfa
            website sinyalleri ve analiz edilen rakip website verileri üzerinden
            oluşturulan önceliklendirilmiş bir aksiyon özetidir.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}