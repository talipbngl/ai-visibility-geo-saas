import Link from "next/link";
import { notFound } from "next/navigation";
import { AuditProgressPanel } from "@/features/audits/components/AuditProgressPanel";
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
  ActionPanel,
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

type AuditDetailPageProps = {
  params: Promise<{
    auditId: string;
  }>;
  searchParams: Promise<{
    error?: string;
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

function getPromptText(run: {
  prompt_text_snapshot: string | null;
  prompts?: { text?: string | null } | { text?: string | null }[] | null;
}) {
  if (run.prompt_text_snapshot) return run.prompt_text_snapshot;

  const prompt = Array.isArray(run.prompts) ? run.prompts[0] : run.prompts;

  return prompt?.text ?? "Test sorusu bulunamadı";
}

function getPromptIntent(run: {
  prompt_intent_snapshot: string | null;
  prompts?: { intent?: string | null } | { intent?: string | null }[] | null;
}) {
  if (run.prompt_intent_snapshot) return run.prompt_intent_snapshot;

  const prompt = Array.isArray(run.prompts) ? run.prompts[0] : run.prompts;

  return prompt?.intent ?? null;
}

function getPromptPriority(run: {
  prompt_priority_snapshot: number | null;
  prompts?: { priority?: number | null } | { priority?: number | null }[] | null;
}) {
  if (run.prompt_priority_snapshot !== null) {
    return run.prompt_priority_snapshot;
  }

  const prompt = Array.isArray(run.prompts) ? run.prompts[0] : run.prompts;

  return prompt?.priority ?? null;
}

export default async function AuditDetailPage({
  params,
  searchParams,
}: AuditDetailPageProps) {
  const { auditId } = await params;
  const query = await searchParams;

  const supabase = await createClient();

  const { data: audit } = await supabase
    .from("audits")
    .select(
      "id, brand_id, status, total_prompts, completed_prompts, error_message, started_at, completed_at, created_at"
    )
    .eq("id", auditId)
    .maybeSingle();

  if (!audit) {
    notFound();
  }

  const { data: brand } = await supabase
    .from("brands")
    .select("id, name, industry")
    .eq("id", audit.brand_id)
    .maybeSingle();

  const { data: score } = await supabase
    .from("audit_scores")
    .select(
      "visibility_score, share_of_voice, average_rank, positive_sentiment_rate, citation_score, competitor_gap_score, opportunity_score"
    )
    .eq("audit_id", audit.id)
    .maybeSingle();

  const { data: recommendations } = await supabase
    .from("recommendations")
    .select("id, category, title, description, priority, effort, impact, status")
    .eq("audit_id", audit.id)
    .order("created_at", { ascending: true });

  const { data: runs } = await supabase
    .from("audit_runs")
    .select(
      `
      id,
      status,
      engine,
      model,
      raw_answer,
      error_message,
      started_at,
      completed_at,
      created_at,
      prompt_text_snapshot,
      prompt_intent_snapshot,
      prompt_priority_snapshot,
      prompt_language_snapshot,
      prompt_country_snapshot,
      prompt_city_snapshot,
      prompts (
        id,
        text,
        intent,
        priority
      ),
      analyses (
        id,
        brand_mentioned,
        brand_rank,
        brand_sentiment,
        competitors_json,
        summary,
        risk_notes_json,
        opportunity_notes_json,
        confidence_score
      )
    `
    )
    .eq("audit_id", audit.id)
    .order("created_at", { ascending: true });
  const failedRunCount =
  runs?.filter((run) => run.status === "failed").length ?? 0;

const pendingRunCount =
  runs?.filter((run) => run.status === "pending").length ?? 0;

const runningRunCount =
  runs?.filter((run) => run.status === "running").length ?? 0;

const completedRunCount =
  runs?.filter((run) => run.status === "completed").length ?? 0;

  const totalRunCount = runs?.length ?? 0;

const hasRuns = totalRunCount > 0;

const hasWorkToRun = pendingRunCount > 0 || runningRunCount > 0;

const canAnalyze =
  hasRuns &&
  completedRunCount === totalRunCount &&
  failedRunCount === 0 &&
  !score;

const isReportReady = Boolean(score);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ölçüm Detayı"
        title={`${brand?.name ?? "Marka"} ölçümü`}
        description="Bu ekranda AI cevaplarını, analiz durumunu, skorları ve prompt bazlı sonuçları inceleyebilirsin."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/dashboard/audits">Ölçümlere dön</Link>
            </Button>

            {brand ? (
              <Button asChild variant="outline">
                <Link href={`/dashboard/brands/${brand.id}/prompts`}>
                  Test sorularına dön
                </Link>
              </Button>
            ) : null}

            {audit.status !== "completed" ? (
              <form action={`/api/audits/${audit.id}/run`} method="post">
                <Button type="submit" variant="outline">
                  Ölçümü çalıştır
                </Button>
              </form>
            ) : null}
           
           {failedRunCount > 0 ? (
  <form action={`/api/audits/${audit.id}/retry-failed`} method="post">
    <Button type="submit" variant="outline">
      Hatalıları tekrar dene
    </Button>
  </form>
) : null}
          
            <form action={`/api/audits/${audit.id}/analyze`} method="post">
              <Button type="submit" variant="outline">
                Analiz et
              </Button>
            </form>

            <Button asChild>
              <Link href={`/dashboard/audits/${audit.id}/report`}>
                Raporu gör
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={audit.status} />

        <Badge variant="outline">
          Oluşturulma: {formatDate(audit.created_at)}
        </Badge>

        {brand?.industry ? (
          <Badge variant="secondary">{brand.industry}</Badge>
        ) : null}
      </div>

      {query.error ? (
        <Card className="border-destructive shadow-sm">
          <CardContent className="pt-6 text-sm text-destructive">
            {query.error}
          </CardContent>
        </Card>
      ) : null}
      {failedRunCount > 0 ? (
  <ActionPanel
    title="Sıradaki adım: Hatalı soruları tekrar dene"
    description="Bazı test soruları cevap alınırken hata verdi. Önce bu soruları tekrar denemelisin."
  >
    <form action={`/api/audits/${audit.id}/retry-failed`} method="post">
      <Button type="submit">Hatalıları tekrar dene</Button>
    </form>
  </ActionPanel>
) : hasWorkToRun ? (
  <ActionPanel
    title="Sıradaki adım: AI cevaplarını al"
    description="Bu ölçümde hâlâ cevap bekleyen test soruları var. Ölçümü çalıştırarak Gemini cevaplarını al."
  >
    <form action={`/api/audits/${audit.id}/run`} method="post">
      <Button type="submit">Ölçümü çalıştır</Button>
    </form>
  </ActionPanel>
) : canAnalyze ? (
  <ActionPanel
    title="Sıradaki adım: Sonuçları analiz et"
    description="Tüm test sorularının cevapları alınmış. Şimdi marka görünürlüğünü, rakipleri ve aksiyon önerilerini analiz et."
  >
    <form action={`/api/audits/${audit.id}/analyze`} method="post">
      <Button type="submit">Analiz et</Button>
    </form>
  </ActionPanel>
) : isReportReady ? (
  <ActionPanel
    title="Rapor hazır"
    description="Bu ölçüm analiz edilmiş. Müşteriye gösterilecek rapor sayfasını açabilirsin."
  >
    <Button asChild>
      <Link href={`/dashboard/audits/${audit.id}/report`}>
        Raporu gör
      </Link>
    </Button>
  </ActionPanel>
) : (
  <ActionPanel
    title="Ölçüm hazırlanıyor"
    description="Bu ölçüm için henüz tamamlanmış bir işlem yok. Ölçümü çalıştırarak başlayabilirsin."
  >
    <form action={`/api/audits/${audit.id}/run`} method="post">
      <Button type="submit">Ölçümü çalıştır</Button>
    </form>
  </ActionPanel>
)}

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Toplam Soru"
          description="Bu ölçümde test edilen soru"
          value={audit.total_prompts}
        />

        <MetricCard
          title="Tamamlanan"
          description="Cevabı alınan soru"
          value={audit.completed_prompts}
        />

        <MetricCard
          title="AI Motoru"
          description="Cevap üretiminde kullanılan sağlayıcı"
          value="Gemini"
        />
      </section>
        <AuditProgressPanel
           totalCount={totalRunCount}
              pendingCount={pendingRunCount}
                 runningCount={runningRunCount}
                    completedCount={completedRunCount}
                       failedCount={failedRunCount}
              />
      {score ? (
        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard
            title="Görünürlük Skoru"
            description="Markanın cevaplarda görünme oranı"
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
            value={score.average_rank ? score.average_rank : "-"}
          />

          <MetricCard
            title="Olumlu Ton"
            description="Olumlu marka bahsi oranı"
            value={`${Math.round(score.positive_sentiment_rate)}%`}
          />
        </section>
      ) : (
        <EmptyState
          title="Henüz skor yok"
          description="AI cevapları tamamlandıktan sonra analiz et butonuna basınca skorlar burada görünecek."
        />
      )}

      {audit.error_message ? (
        <Card className="border-destructive shadow-sm">
          <CardHeader>
            <CardTitle>Ölçüm Notu</CardTitle>
          </CardHeader>

          <CardContent className="text-sm text-destructive">
            {audit.error_message}
          </CardContent>
        </Card>
      ) : null}

      {recommendations && recommendations.length > 0 ? (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Aksiyon Önerileri</CardTitle>
            <CardDescription>
              Skora göre uygulanabilir AI görünürlük önerileri.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {recommendations.map((recommendation) => (
                <div key={recommendation.id} className="rounded-xl border p-4">
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Badge variant="secondary">
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

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Prompt Sonuçları</CardTitle>
          <CardDescription>
            AI cevapları, marka görünürlüğü ve soru bazlı analizler.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {runs && runs.length > 0 ? (
            <div className="space-y-4">
              {runs.map((run) => {
                const analysis = Array.isArray(run.analyses)
                  ? run.analyses[0]
                  : run.analyses;

                const competitors = Array.isArray(analysis?.competitors_json)
                  ? (analysis.competitors_json as CompetitorVisibility[])
                  : [];

                const risks = Array.isArray(analysis?.risk_notes_json)
                  ? (analysis.risk_notes_json as string[])
                  : [];

                const opportunities = Array.isArray(
                  analysis?.opportunity_notes_json
                )
                  ? (analysis.opportunity_notes_json as string[])
                  : [];

                const promptText = getPromptText(run);
                const promptIntent = getPromptIntent(run);
                const promptPriority = getPromptPriority(run);
                
  
                return (
                  <div
                    key={run.id}
                    className="rounded-xl border p-4 transition-colors hover:bg-muted/30"
                  >
                    <div className="mb-3 flex flex-wrap gap-2">
                      <StatusBadge status={run.status} />

                      <Badge variant="secondary">{run.engine}</Badge>

                      {run.model ? (
                        <Badge variant="outline">{run.model}</Badge>
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

                    <p className="text-sm font-medium leading-6">
                      {promptText}
                    </p>

                    {analysis ? (
                      <div className="mt-4 rounded-xl border bg-background p-4">
                        <div className="mb-3 flex flex-wrap gap-2">
                          <Badge
                            variant={
                              analysis.brand_mentioned ? "default" : "outline"
                            }
                          >
                            {analysis.brand_mentioned
                              ? "Marka geçti"
                              : "Marka geçmedi"}
                          </Badge>

                          <Badge variant="secondary">
                            Sıra: {analysis.brand_rank ?? "-"}
                          </Badge>

                          <Badge variant="outline">
                            Ton: {getSentimentLabel(analysis.brand_sentiment)}
                          </Badge>

                          <Badge variant="outline">
                            Güven:{" "}
                            {analysis.confidence_score
                              ? Math.round(analysis.confidence_score * 100)
                              : "-"}
                            %
                          </Badge>
                        </div>

                        <p className="text-sm font-medium">Analiz özeti</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {analysis.summary}
                        </p>

                        {competitors.length > 0 ? (
                          <div className="mt-4">
                            <p className="text-sm font-medium">
                              Rakip görünürlüğü
                            </p>

                            <div className="mt-2 flex flex-wrap gap-2">
                              {competitors.map((competitor, index) => (
                                <Badge
                                  key={`${competitor.name}-${index}`}
                                  variant={
                                    competitor.mentioned
                                      ? "secondary"
                                      : "outline"
                                  }
                                >
                                  {competitor.name}
                                  {competitor.mentioned
                                    ? ` geçti${
                                        competitor.rank
                                          ? ` / sıra ${competitor.rank}`
                                          : ""
                                      }`
                                    : " geçmedi"}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {risks.length > 0 || opportunities.length > 0 ? (
                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            {risks.length > 0 ? (
                              <div className="rounded-xl border border-destructive/40 p-3">
                                <p className="text-sm font-medium text-destructive">
                                  Riskler
                                </p>

                                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                                  {risks.map((risk, index) => (
                                    <li key={`${risk}-${index}`}>{risk}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}

                            {opportunities.length > 0 ? (
                              <div className="rounded-xl border p-3">
                                <p className="text-sm font-medium">
                                  Fırsatlar
                                </p>

                                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                                  {opportunities.map((opportunity, index) => (
                                    <li key={`${opportunity}-${index}`}>
                                      {opportunity}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                        Bu soru için henüz analiz yok. Üstteki “Analiz et”
                        butonuna bas.
                      </div>
                    )}

                    {run.raw_answer ? (
                      <details className="mt-4 rounded-xl border bg-muted/20 p-4">
                        <summary className="cursor-pointer text-sm font-medium">
                          AI cevabını göster
                        </summary>

                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                          {run.raw_answer}
                        </p>
                      </details>
                    ) : null}

                    {run.error_message ? (
                      <p className="mt-3 text-sm text-destructive">
                        {run.error_message}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="Run kaydı yok"
              description="Ölçüm oluşturulurken soru çalıştırma kayıtları yazılmalıydı."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}