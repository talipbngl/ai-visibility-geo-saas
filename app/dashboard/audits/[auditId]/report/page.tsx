import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AuditReportPageProps = {
  params: Promise<{
    auditId: string;
  }>;
};
type CompetitorVisibility = {
  name: string;
  mentioned: boolean;
  rank: number | null;
};

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getScoreComment(score: number) {
  if (score >= 75) {
    return "Marka AI cevaplarında güçlü bir görünürlüğe sahip.";
  }

  if (score >= 50) {
    return "Marka bazı cevaplarda görünür ancak rakiplere karşı hâlâ geliştirme alanı var.";
  }

  if (score >= 25) {
    return "Marka görünürlüğü zayıf. Rakipler birçok önemli cevapta daha fazla öne çıkıyor olabilir.";
  }

  return "Marka AI cevaplarında neredeyse görünmüyor. Bu ciddi bir fırsat ve risk alanı.";
}

export default async function AuditReportPage({ params }: AuditReportPageProps) {
  const { auditId } = await params;

  const supabase = await createClient();

  const { data: audit } = await supabase
    .from("audits")
    .select(
      "id, brand_id, status, total_prompts, completed_prompts, created_at, completed_at"
    )
    .eq("id", auditId)
    .maybeSingle();

  if (!audit) {
    notFound();
  }

  const { data: brand } = await supabase
    .from("brands")
    .select("id, name, website_url, industry, country, language")
    .eq("id", audit.brand_id)
    .maybeSingle();

  if (!brand) {
    notFound();
  }

  const { data: score } = await supabase
    .from("audit_scores")
    .select(
      "visibility_score, share_of_voice, average_rank, positive_sentiment_rate, citation_score, competitor_gap_score, opportunity_score"
    )
    .eq("audit_id", audit.id)
    .maybeSingle();

  const { data: recommendations } = await supabase
    .from("recommendations")
    .select("id, category, title, description, priority, effort, impact")
    .eq("audit_id", audit.id)
    .order("created_at", { ascending: true });

  const { data: analyses } = await supabase
  .from("analyses")
  .select(
    `
    id,
    brand_mentioned,
    brand_rank,
    brand_sentiment,
    competitors_json,
    summary,
    risk_notes_json,
    opportunity_notes_json,
    audit_runs (
      id,
      prompts (
        id,
        text,
        intent,
        priority
      )
    )
  `
  )
  .eq("audit_runs.audit_id", audit.id);

  const visibilityScore = score?.visibility_score ?? 0;

const visibleAnalyses =
  analyses?.filter((analysis) => analysis.brand_mentioned) ?? [];

const invisibleAnalyses =
  analyses?.filter((analysis) => !analysis.brand_mentioned) ?? [];

const competitorStatsMap = new Map<
  string,
  {
    name: string;
    mentionCount: number;
    rankSum: number;
    rankCount: number;
  }
>();

(analyses ?? []).forEach((analysis) => {
  const competitors = Array.isArray(analysis.competitors_json)
    ? (analysis.competitors_json as CompetitorVisibility[])
    : [];

  competitors.forEach((competitor) => {
    if (!competitor.mentioned) return;

    const current = competitorStatsMap.get(competitor.name) ?? {
      name: competitor.name,
      mentionCount: 0,
      rankSum: 0,
      rankCount: 0,
    };

    current.mentionCount += 1;

    if (competitor.rank) {
      current.rankSum += competitor.rank;
      current.rankCount += 1;
    }

    competitorStatsMap.set(competitor.name, current);
  });
});

const competitorStats = Array.from(competitorStatsMap.values())
  .map((competitor) => ({
    ...competitor,
    averageRank:
      competitor.rankCount > 0
        ? Math.round((competitor.rankSum / competitor.rankCount) * 10) / 10
        : null,
  }))
  .sort((a, b) => b.mentionCount - a.mentionCount);
  const riskNotes = Array.from(
  new Set(
    (analyses ?? []).flatMap((analysis) =>
      Array.isArray(analysis.risk_notes_json)
        ? (analysis.risk_notes_json as string[])
        : []
    )
  )
).slice(0, 5);

const opportunityNotes = Array.from(
  new Set(
    (analyses ?? []).flatMap((analysis) =>
      Array.isArray(analysis.opportunity_notes_json)
        ? (analysis.opportunity_notes_json as string[])
        : []
    )
  )
).slice(0, 5);

const wonAnalyses = visibleAnalyses.slice(0, 5);
const lostAnalyses = invisibleAnalyses.slice(0, 5);
  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-background p-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <p className="text-sm text-muted-foreground">
              AI Görünürlük Raporu
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {brand.name}
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Bu rapor, markanın AI cevaplarında ne kadar görünür olduğunu,
              rakiplere karşı konumunu ve iyileştirme fırsatlarını gösterir.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {brand.industry ? (
                <Badge variant="secondary">{brand.industry}</Badge>
              ) : null}

              <Badge variant="outline">{brand.country || "TR"}</Badge>
              <Badge variant="outline">{brand.language || "tr"}</Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/dashboard/audits/${audit.id}`}>
                Ölçüm detayına dön
              </Link>
            </Button>

            <Button asChild>
              <Link href={`/dashboard/brands/${brand.id}/prompts`}>
                Yeni ölçüm başlat
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {!score ? (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>Rapor henüz hazır değil</CardTitle>
            <CardDescription>
              Bu raporu görmek için önce ölçüm cevaplarını analiz etmen gerekiyor.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Button asChild>
              <Link href={`/dashboard/audits/${audit.id}`}>
                Analiz sayfasına git
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle>Görünürlük Skoru</CardTitle>
                <CardDescription>Markanın AI cevaplarında görünme oranı</CardDescription>
              </CardHeader>

              <CardContent>
                <p className="text-4xl font-semibold">
                  {Math.round(score.visibility_score)}/100
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Görünürlük Payı</CardTitle>
                <CardDescription>Rakiplere göre marka payı</CardDescription>
              </CardHeader>

              <CardContent>
                <p className="text-4xl font-semibold">
                  {Math.round(score.share_of_voice)}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ortalama Sıra</CardTitle>
                <CardDescription>Marka geçtiğinde yaklaşık konum</CardDescription>
              </CardHeader>

              <CardContent>
                <p className="text-4xl font-semibold">
                  {score.average_rank ?? "-"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Olumlu Ton</CardTitle>
                <CardDescription>Olumlu marka bahsi oranı</CardDescription>
              </CardHeader>

              <CardContent>
                <p className="text-4xl font-semibold">
                  {Math.round(score.positive_sentiment_rate)}%
                </p>
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Yönetici Özeti</CardTitle>
              <CardDescription>
                Ölçüm sonuçlarının kısa yorumu.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {brand.name} için {audit.completed_prompts} /{" "}
                {audit.total_prompts} test sorusu tamamlandı. Ölçüm{" "}
                {formatDate(audit.created_at)} tarihinde oluşturuldu.
              </p>

              <div className="rounded-lg border p-4">
                <p className="font-medium">
                  {getScoreComment(visibilityScore)}
                </p>

                <p className="mt-2 text-sm text-muted-foreground">
                  Marka {visibleAnalyses.length} cevapta görünürken,{" "}
                  {invisibleAnalyses.length} cevapta görünmedi. Görünmediği
                  promptlar içerik ve AI görünürlük optimizasyonu için fırsat
                  alanı olarak değerlendirilebilir.
                </p>
              </div>
            </CardContent>
          </Card>
           {competitorStats.length > 0 ? (
  <Card>
    <CardHeader>
      <CardTitle>Rakip Görünürlüğü</CardTitle>
      <CardDescription>
        AI cevaplarında en çok görünen rakipler ve yaklaşık sıralamaları.
      </CardDescription>
    </CardHeader>

    <CardContent>
      <div className="space-y-3">
        {competitorStats.map((competitor) => (
          <div
            key={competitor.name}
            className="flex flex-col justify-between gap-3 rounded-lg border p-4 md:flex-row md:items-center"
          >
            <div>
              <p className="font-medium">{competitor.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {competitor.mentionCount} cevapta göründü.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                Görünme: {competitor.mentionCount} /{" "}
                {audit.completed_prompts}
              </Badge>

              <Badge variant="outline">
                Ortalama sıra: {competitor.averageRank ?? "-"}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        Rakiplerin sık görünmesi, markanın ilgili AI cevaplarında daha güçlü
        içerik, otorite ve karşılaştırma sinyallerine ihtiyaç duyduğunu
        gösterebilir.
      </p>
    </CardContent>
  </Card>
) : null}
{riskNotes.length > 0 || opportunityNotes.length > 0 ? (
  <section className="grid gap-4 lg:grid-cols-2">
    {riskNotes.length > 0 ? (
      <Card>
        <CardHeader>
          <CardTitle>Risk Notları</CardTitle>
          <CardDescription>
            AI cevaplarında markanın zayıf göründüğü alanlar.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {riskNotes.map((risk, index) => (
              <li key={`${risk}-${index}`}>{risk}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    ) : null}

    {opportunityNotes.length > 0 ? (
      <Card>
        <CardHeader>
          <CardTitle>Fırsat Notları</CardTitle>
          <CardDescription>
            İçerik ve AI görünürlük optimizasyonu için öne çıkan fırsatlar.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {opportunityNotes.map((opportunity, index) => (
              <li key={`${opportunity}-${index}`}>{opportunity}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    ) : null}
  </section>
) : null}
          {recommendations && recommendations.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Aksiyon Planı</CardTitle>
                <CardDescription>
                  Görünürlüğü artırmak için uygulanabilir öneriler.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  {recommendations.map((recommendation, index) => (
                    <div
                      key={recommendation.id}
                      className="rounded-lg border p-4"
                    >
                      <div className="mb-2 flex flex-wrap gap-2">
                        <Badge variant="secondary">
                          {index + 1}. öneri
                        </Badge>

                        <Badge variant="outline">
                          Öncelik: {recommendation.priority}
                        </Badge>

                        <Badge variant="outline">
                          Etki: {recommendation.impact}
                        </Badge>

                        <Badge variant="outline">
                          Efor: {recommendation.effort}
                        </Badge>
                      </div>

                      <p className="font-medium">{recommendation.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {recommendation.description}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

         <section className="grid gap-6 lg:grid-cols-2">
  <Card>
    <CardHeader>
      <CardTitle>Markanın Göründüğü Sorular</CardTitle>
      <CardDescription>
        Markanın AI cevabında geçtiği test soruları.
      </CardDescription>
    </CardHeader>

    <CardContent>
      {wonAnalyses.length > 0 ? (
        <div className="space-y-3">
          {wonAnalyses.map((analysis) => {
            const run = Array.isArray(analysis.audit_runs)
              ? analysis.audit_runs[0]
              : analysis.audit_runs;

            const prompt = Array.isArray(run?.prompts)
              ? run?.prompts[0]
              : run?.prompts;

            return (
              <div key={analysis.id} className="rounded-lg border p-4">
                <div className="mb-2 flex flex-wrap gap-2">
                  <Badge variant="secondary">Göründü</Badge>

                  {analysis.brand_rank ? (
                    <Badge variant="outline">
                      Sıra: {analysis.brand_rank}
                    </Badge>
                  ) : null}

                  {analysis.brand_sentiment ? (
                    <Badge variant="outline">
                      Ton: {analysis.brand_sentiment}
                    </Badge>
                  ) : null}
                </div>

                <p className="font-medium">
                  {prompt?.text ?? "Test sorusu bulunamadı"}
                </p>

                <p className="mt-2 text-sm text-muted-foreground">
                  {analysis.summary}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="font-medium">Marka hiçbir soruda görünmedi</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Bu durum güçlü bir içerik ve görünürlük optimizasyonu ihtiyacı
            olduğunu gösterir.
          </p>
        </div>
      )}
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>Markanın Görünmediği Sorular</CardTitle>
      <CardDescription>
        Öncelikli içerik ve optimizasyon fırsatları.
      </CardDescription>
    </CardHeader>

    <CardContent>
      {lostAnalyses.length > 0 ? (
        <div className="space-y-3">
          {lostAnalyses.map((analysis) => {
            const run = Array.isArray(analysis.audit_runs)
              ? analysis.audit_runs[0]
              : analysis.audit_runs;

            const prompt = Array.isArray(run?.prompts)
              ? run?.prompts[0]
              : run?.prompts;

            return (
              <div key={analysis.id} className="rounded-lg border p-4">
                <div className="mb-2">
                  <Badge variant="outline">Görünmedi</Badge>
                </div>

                <p className="font-medium">
                  {prompt?.text ?? "Test sorusu bulunamadı"}
                </p>

                <p className="mt-2 text-sm text-muted-foreground">
                  {analysis.summary}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="font-medium">Marka tüm analiz edilen sorularda göründü</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Bu iyi bir sinyal. Takip için düzenli ölçüm yapılmalı.
          </p>
        </div>
      )}
    </CardContent>
  </Card>
</section>
        </>
      )}
    </div>
  );
}