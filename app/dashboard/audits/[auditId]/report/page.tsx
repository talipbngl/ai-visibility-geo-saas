import Link from "next/link";
import { notFound } from "next/navigation";
import { WebsiteSignalSummary } from "@/features/website/components/WebsiteSignalSummary";
import { EvidenceActionSummary } from "@/features/reports/components/EvidenceActionSummary";
import { CompetitorWebsiteComparison } from "@/features/website/components/CompetitorWebsiteComparison";
import { ReportReadinessPanel } from "@/features/reports/components/ReportReadinessPanel";
import { PrintReportButton } from "@/features/reports/components/PrintReportButton";
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
import {
  EmptyState,
  MetricCard,
  PageHeader,
  StatusBadge,
} from "@/features/ui/components";
import {
  getCategoryLabel,
  getEffortLabel,
  getImpactLabel,
  getIntentLabel,
  getPriorityLabel,
  getRecommendationPriorityLabel,
  getSentimentLabel,
} from "@/lib/ui/labels";

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

type NestedPrompt = {
  text?: string | null;
  intent?: string | null;
  priority?: number | null;
};

type NestedRun = {
  prompt_text_snapshot?: string | null;
  prompt_intent_snapshot?: string | null;
  prompt_priority_snapshot?: number | null;
  prompts?: NestedPrompt | NestedPrompt[] | null;
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
    return "Marka bazı cevaplarda görünür; ancak rakiplere karşı hâlâ geliştirme alanı var.";
  }

  if (score >= 25) {
    return "Marka görünürlüğü zayıf. Rakipler birçok önemli cevapta daha fazla öne çıkıyor olabilir.";
  }

  return "Marka AI cevaplarında neredeyse görünmüyor. Bu ciddi bir fırsat ve risk alanı.";
}

function getScoreLevel(score: number) {
  if (score >= 75) return "Güçlü";
  if (score >= 50) return "Orta";
  if (score >= 25) return "Zayıf";

  return "Kritik";
}

function getScoreCardClass(score: number) {
  if (score >= 75) {
    return "border-emerald-500/40 bg-emerald-500/5";
  }

  if (score >= 50) {
    return "border-blue-500/40 bg-blue-500/5";
  }

  if (score >= 25) {
    return "border-amber-500/40 bg-amber-500/5";
  }

  return "border-destructive/40 bg-destructive/5";
}

function getCompletedRate(completed: number, total: number) {
  if (total <= 0) return 0;

  return Math.round((completed / total) * 100);
}

function getNestedRun(value: NestedRun | NestedRun[] | null | undefined) {
  if (Array.isArray(value)) return value[0] ?? null;

  return value ?? null;
}

function getNestedPrompt(run: NestedRun | null) {
  if (!run?.prompts) return null;

  return Array.isArray(run.prompts) ? run.prompts[0] ?? null : run.prompts;
}

function getPromptText(run: NestedRun | null) {
  if (run?.prompt_text_snapshot) return run.prompt_text_snapshot;

  const prompt = getNestedPrompt(run);

  return prompt?.text ?? "Test sorusu bulunamadı";
}

function getPromptIntent(run: NestedRun | null) {
  if (run?.prompt_intent_snapshot) return run.prompt_intent_snapshot;

  const prompt = getNestedPrompt(run);

  return prompt?.intent ?? null;
}

function getPromptPriority(run: NestedRun | null) {
  if (
    run?.prompt_priority_snapshot !== null &&
    run?.prompt_priority_snapshot !== undefined
  ) {
    return run.prompt_priority_snapshot;
  }

  const prompt = getNestedPrompt(run);

  return prompt?.priority ?? null;
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

  const { data: websiteSnapshots } = await supabase
    .from("brand_website_snapshots")
    .select(
      "id, website_url, title, meta_description, word_count, content_score, service_signals_json, trust_signals_json, created_at"
    )
    .eq("brand_id", brand.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1);

  const websiteSnapshot = websiteSnapshots?.[0] ?? null;
  const { data: competitorWebsiteSnapshots } = await supabase
  .from("competitor_website_snapshots")
  .select(
    `
    id,
    competitor_id,
    website_url,
    content_score,
    word_count,
    service_signals_json,
    trust_signals_json,
    created_at,
    competitors (
      id,
      name
    )
  `
  )
  .eq("brand_id", brand.id)
  .eq("status", "completed")
  .order("created_at", { ascending: false });

type CompetitorWebsiteSnapshotRow = NonNullable<
  typeof competitorWebsiteSnapshots
>[number];

const latestCompetitorWebsiteSnapshotMap = new Map<
  string,
  CompetitorWebsiteSnapshotRow
>();

(competitorWebsiteSnapshots ?? []).forEach((snapshot) => {
  if (!latestCompetitorWebsiteSnapshotMap.has(snapshot.competitor_id)) {
    latestCompetitorWebsiteSnapshotMap.set(snapshot.competitor_id, snapshot);
  }
});

const latestCompetitorWebsiteSnapshots = Array.from(
  latestCompetitorWebsiteSnapshotMap.values()
).map((snapshot) => {
  const competitor = Array.isArray(snapshot.competitors)
    ? snapshot.competitors[0]
    : snapshot.competitors;

  return {
    id: snapshot.id,
    competitor_id: snapshot.competitor_id,
    competitor_name: competitor?.name ?? "Rakip",
    website_url: snapshot.website_url,
    content_score: snapshot.content_score,
    word_count: snapshot.word_count,
    service_signals_json: snapshot.service_signals_json,
    trust_signals_json: snapshot.trust_signals_json,
    created_at: snapshot.created_at,
  };
});
const competitorWebsiteSnapshotCount = latestCompetitorWebsiteSnapshots.length;

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
  .order("priority", { ascending: false })
  .order("created_at", { ascending: true });
 const recommendationCount = recommendations?.length ?? 0;

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
        audit_id,
        prompt_text_snapshot,
        prompt_intent_snapshot,
        prompt_priority_snapshot,
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

  const visibilityScore = Number(score?.visibility_score ?? 0);
  const roundedVisibilityScore = Math.round(visibilityScore);

  const completedRate = getCompletedRate(
    audit.completed_prompts,
    audit.total_prompts
  );

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

  const strongestCompetitor = competitorStats[0];
  const topRecommendation = recommendations?.[0];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI Görünürlük Raporu"
        title={brand.name}
        description="Bu rapor, markanın AI cevaplarında ne kadar görünür olduğunu, rakiplere göre konumunu ve uygulanabilir iyileştirme alanlarını gösterir."
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button asChild variant="outline">
              <Link href={`/dashboard/audits/${audit.id}`}>
                Ölçüm detayına dön
              </Link>
            </Button>

            <Button asChild variant="outline">
              <Link href={`/dashboard/brands/${brand.id}/prompts`}>
                Yeni ölçüm başlat
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/dashboard/audits/${audit.id}/client-report`}>
                Müşteri raporu
              </Link>
            </Button>
                          <form action={`/api/audits/${audit.id}/refresh-recommendations`} method="post">
              <Button type="submit" variant="outline">
                Önerileri kanıta göre güncelle
              </Button>
            </form>
            <PrintReportButton />
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        <StatusBadge status={audit.status} />

        {brand.industry ? (
          <Badge variant="secondary">{brand.industry}</Badge>
        ) : null}

        <Badge variant="outline">{brand.country || "TR"}</Badge>
        <Badge variant="outline">{brand.language || "tr"}</Badge>
        <Badge variant="outline">Oluşturulma: {formatDate(audit.created_at)}</Badge>
      </div>
      <ReportReadinessPanel
  auditId={audit.id}
  brandId={brand.id}
  hasScore={Boolean(score)}
  hasBrandWebsiteSnapshot={Boolean(websiteSnapshot)}
  competitorWebsiteSnapshotCount={competitorWebsiteSnapshotCount}
  recommendationCount={recommendationCount}
/>

      {!score ? (
        <Card className="border-destructive shadow-sm">
          <CardHeader>
            <CardTitle>Rapor henüz hazır değil</CardTitle>
            <CardDescription>
              Bu raporu görmek için önce ölçüm cevaplarını çalıştırıp analiz
              etmen gerekiyor.
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
          <section className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
            <Card className={`${getScoreCardClass(roundedVisibilityScore)} shadow-sm`}>
              <CardHeader>
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Genel AI Görünürlük Durumu
                    </p>

                    <CardTitle className="mt-2 text-5xl">
                      {roundedVisibilityScore}/100
                    </CardTitle>

                    <CardDescription className="mt-3 text-base leading-7">
                      {getScoreComment(visibilityScore)}
                    </CardDescription>
                  </div>

                  <Badge variant="secondary" className="w-fit text-sm">
                    Durum: {getScoreLevel(visibilityScore)}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border bg-background/80 p-4">
                    <p className="text-sm text-muted-foreground">Tamamlanma</p>
                    <p className="mt-1 text-2xl font-semibold">
                      {completedRate}%
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {audit.completed_prompts} / {audit.total_prompts} test
                      sorusu
                    </p>
                  </div>

                  <div className="rounded-xl border bg-background/80 p-4">
                    <p className="text-sm text-muted-foreground">
                      Görünürlük Payı
                    </p>
                    <p className="mt-1 text-2xl font-semibold">
                      {Math.round(score.share_of_voice)}%
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Rakiplere göre marka payı
                    </p>
                  </div>

                  <div className="rounded-xl border bg-background/80 p-4">
                    <p className="text-sm text-muted-foreground">
                      Fırsat Skoru
                    </p>
                    <p className="mt-1 text-2xl font-semibold">
                      {Math.round(score.opportunity_score)}%
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      İyileştirme alanı
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Hızlı İçgörü</CardTitle>
                <CardDescription>
                  Bu rapordan çıkan en önemli sinyaller.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    En görünür rakip
                  </p>
                  <p className="mt-1 font-medium">
                    {strongestCompetitor
                      ? strongestCompetitor.name
                      : "Rakip görünürlüğü yok"}
                  </p>

                  {strongestCompetitor ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {strongestCompetitor.mentionCount} cevapta göründü.
                    </p>
                  ) : null}
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground">
                    En önemli aksiyon
                  </p>
                  <p className="mt-1 font-medium">
                    {topRecommendation
                      ? topRecommendation.title
                      : "Henüz aksiyon önerisi oluşmadı"}
                  </p>

                  {topRecommendation ? (
                    <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
                      {topRecommendation.description}
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 md:grid-cols-4">
            <MetricCard
              title="Görünürlük Skoru"
              description="Markanın AI cevaplarında görünme oranı"
              value={`${Math.round(score.visibility_score)}/100`}
            />

            <MetricCard
              title="Görünürlük Payı"
              description="Rakiplere göre marka payı"
              value={`${Math.round(score.share_of_voice)}%`}
            />

            <MetricCard
              title="Ortalama Sıra"
              description="Marka geçtiğinde yaklaşık konum"
              value={score.average_rank ?? "-"}
            />

            <MetricCard
              title="Olumlu Ton"
              description="Olumlu marka bahsi oranı"
              value={`${Math.round(score.positive_sentiment_rate)}%`}
            />
          </section>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Yönetici Özeti</CardTitle>
              <CardDescription>Ölçüm sonuçlarının kısa yorumu.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-muted-foreground">
                {brand.name} için {audit.completed_prompts} /{" "}
                {audit.total_prompts} test sorusu tamamlandı. Marka{" "}
                {visibleAnalyses.length} cevapta görünürken,{" "}
                {invisibleAnalyses.length} cevapta görünmedi.
              </p>

              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="font-medium">{getScoreComment(visibilityScore)}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Markanın görünmediği sorular; içerik üretimi, karşılaştırma
                  sayfaları, otorite sinyalleri ve AI görünürlük optimizasyonu
                  için öncelikli fırsat alanı olarak değerlendirilebilir.
                </p>
              </div>
            </CardContent>
          </Card>

          <WebsiteSignalSummary
            brandId={brand.id}
            brandName={brand.name}
            snapshot={websiteSnapshot}
          />
          <CompetitorWebsiteComparison
  brandSnapshot={websiteSnapshot}
  competitorSnapshots={latestCompetitorWebsiteSnapshots}
/>
<EvidenceActionSummary
  brandName={brand.name}
  totalPrompts={audit.total_prompts}
  visibleCount={visibleAnalyses.length}
  invisibleCount={invisibleAnalyses.length}
  visibilityScore={visibilityScore}
  brandWebsiteSnapshot={websiteSnapshot}
  competitorWebsiteSnapshots={latestCompetitorWebsiteSnapshots}
  recommendations={recommendations ?? []}
/>
          {competitorStats.length > 0 ? (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Rakip Görünürlüğü</CardTitle>
                <CardDescription>
                  AI cevaplarında en çok görünen rakipler ve yaklaşık
                  sıralamaları.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  {competitorStats.map((competitor) => (
                    <div
                      key={competitor.name}
                      className="flex flex-col justify-between gap-3 rounded-xl border p-4 md:flex-row md:items-center"
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
              </CardContent>
            </Card>
          ) : null}

          {riskNotes.length > 0 || opportunityNotes.length > 0 ? (
            <section className="grid gap-4 lg:grid-cols-2">
              {riskNotes.length > 0 ? (
                <Card className="border-destructive/40 shadow-sm">
                  <CardHeader>
                    <CardTitle>Risk Notları</CardTitle>
                    <CardDescription>
                      AI cevaplarında markanın zayıf göründüğü alanlar.
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
                      {riskNotes.map((risk, index) => (
                        <li key={`${risk}-${index}`}>{risk}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ) : null}

              {opportunityNotes.length > 0 ? (
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>Fırsat Notları</CardTitle>
                    <CardDescription>
                      İçerik ve AI görünürlük optimizasyonu için öne çıkan
                      fırsatlar.
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
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
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Aksiyon Planı</CardTitle>
                <CardDescription>
                  Görünürlüğü artırmak için uygulanabilir öneriler.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {recommendations.map((recommendation, index) => (
                    <div
                      key={recommendation.id}
                      className="rounded-xl border p-4"
                    >
                      <div className="mb-2 flex flex-wrap gap-2">
                        <Badge variant="secondary">{index + 1}. öneri</Badge>

                        <Badge variant="outline">
                          {getCategoryLabel(recommendation.category)}
                        </Badge>

                        <Badge variant="outline">
                          Öncelik:{" "}
                          {getRecommendationPriorityLabel(
                            recommendation.priority
                          )}
                        </Badge>

                        <Badge variant="outline">
                          Etki: {getImpactLabel(recommendation.impact)}
                        </Badge>

                        <Badge variant="outline">
                          Efor: {getEffortLabel(recommendation.effort)}
                        </Badge>
                      </div>

                      <p className="font-medium">{recommendation.title}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {recommendation.description}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <section className="grid gap-6 lg:grid-cols-2">
            <Card className="shadow-sm">
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
                      const run = getNestedRun(analysis.audit_runs);
                      const promptIntent = getPromptIntent(run);
                      const promptPriority = getPromptPriority(run);

                      return (
                        <div key={analysis.id} className="rounded-xl border p-4">
                          <div className="mb-2 flex flex-wrap gap-2">
                            <Badge variant="secondary">Göründü</Badge>

                            {analysis.brand_rank ? (
                              <Badge variant="outline">
                                Sıra: {analysis.brand_rank}
                              </Badge>
                            ) : null}

                            {analysis.brand_sentiment ? (
                              <Badge variant="outline">
                                Ton:{" "}
                                {getSentimentLabel(analysis.brand_sentiment)}
                              </Badge>
                            ) : null}

                            {promptIntent ? (
                              <Badge variant="outline">
                                {getIntentLabel(promptIntent)}
                              </Badge>
                            ) : null}

                            <Badge variant="outline">
                              Öncelik: {getPriorityLabel(promptPriority)}
                            </Badge>
                          </div>

                          <p className="font-medium leading-6">
                            {getPromptText(run)}
                          </p>

                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {analysis.summary}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    title="Marka hiçbir soruda görünmedi"
                    description="Bu durum güçlü bir içerik ve görünürlük optimizasyonu ihtiyacı olduğunu gösterir."
                  />
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
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
                      const run = getNestedRun(analysis.audit_runs);
                      const promptIntent = getPromptIntent(run);
                      const promptPriority = getPromptPriority(run);

                      return (
                        <div key={analysis.id} className="rounded-xl border p-4">
                          <div className="mb-2 flex flex-wrap gap-2">
                            <Badge variant="outline">Görünmedi</Badge>

                            {promptIntent ? (
                              <Badge variant="outline">
                                {getIntentLabel(promptIntent)}
                              </Badge>
                            ) : null}

                            <Badge variant="outline">
                              Öncelik: {getPriorityLabel(promptPriority)}
                            </Badge>
                          </div>

                          <p className="font-medium leading-6">
                            {getPromptText(run)}
                          </p>

                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {analysis.summary}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    title="Marka tüm analiz edilen sorularda göründü"
                    description="Bu iyi bir sinyal. Takip için düzenli ölçüm yapılmalı."
                  />
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}