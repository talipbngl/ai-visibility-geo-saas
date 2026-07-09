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

type AuditDetailPageProps = {
  params: Promise<{
    auditId: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatusVariant(status: string) {
  if (status === "completed") return "default";
  if (status === "failed") return "destructive";
  if (status === "running") return "secondary";

  return "outline";
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

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 rounded-xl border bg-background p-6 md:flex-row md:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Audit Detayı
            </h1>

            <Badge variant={getStatusVariant(audit.status)}>
              {audit.status}
            </Badge>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            {brand?.name ?? "Marka"} için oluşturulan audit.
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            Oluşturulma: {formatDate(audit.created_at)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/audits">Auditlere dön</Link>
          </Button>

          {brand ? (
            <Button asChild variant="outline">
              <Link href={`/dashboard/brands/${brand.id}/prompts`}>
                Promptlara dön
              </Link>
            </Button>
          ) : null}

          {audit.status !== "completed" ? (
            <form action={`/api/audits/${audit.id}/run`} method="post">
              <Button type="submit" variant="outline">
                Audit&apos;i çalıştır
              </Button>
            </form>
          ) : null}

          <form action={`/api/audits/${audit.id}/analyze`} method="post">
            <Button type="submit">Analiz et</Button>
          </form>
        </div>
      </section>

      {query.error ? (
        <Card className="border-destructive">
          <CardContent className="pt-6 text-sm text-destructive">
            {query.error}
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Toplam Prompt</CardTitle>
            <CardDescription>Bu audit içinde çalışacak prompt</CardDescription>
          </CardHeader>

          <CardContent>
            <p className="text-3xl font-semibold">{audit.total_prompts}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tamamlanan</CardTitle>
            <CardDescription>Şu ana kadar biten prompt</CardDescription>
          </CardHeader>

          <CardContent>
            <p className="text-3xl font-semibold">
              {audit.completed_prompts}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Engine</CardTitle>
            <CardDescription>Kullanılacak AI motoru</CardDescription>
          </CardHeader>

          <CardContent>
            <p className="text-lg font-semibold">Gemini</p>
          </CardContent>
        </Card>
      </section>

      {score ? (
        <section className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Visibility Score</CardTitle>
              <CardDescription>Markanın cevaplarda görünme oranı</CardDescription>
            </CardHeader>

            <CardContent>
              <p className="text-3xl font-semibold">
                {Math.round(score.visibility_score)}/100
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Share of Voice</CardTitle>
              <CardDescription>Rakiplere göre görünürlük payı</CardDescription>
            </CardHeader>

            <CardContent>
              <p className="text-3xl font-semibold">
                {Math.round(score.share_of_voice)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ortalama Sıra</CardTitle>
              <CardDescription>Marka geçtiğinde yaklaşık sıra</CardDescription>
            </CardHeader>

            <CardContent>
              <p className="text-3xl font-semibold">
                {score.average_rank ? score.average_rank : "-"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Olumlu Ton</CardTitle>
              <CardDescription>Olumlu mention oranı</CardDescription>
            </CardHeader>

            <CardContent>
              <p className="text-3xl font-semibold">
                {Math.round(score.positive_sentiment_rate)}%
              </p>
            </CardContent>
          </Card>
        </section>
      ) : null}

      {audit.error_message ? (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>Audit Notu</CardTitle>
          </CardHeader>

          <CardContent className="text-sm text-destructive">
            {audit.error_message}
          </CardContent>
        </Card>
      ) : null}

      {recommendations && recommendations.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Aksiyon Önerileri</CardTitle>
            <CardDescription>
              Skora göre uygulanabilir GEO / AI visibility önerileri.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">
              {recommendations.map((recommendation) => (
                <div key={recommendation.id} className="rounded-lg border p-4">
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Badge variant="secondary">{recommendation.category}</Badge>
                    <Badge variant="outline">
                      Priority: {recommendation.priority}
                    </Badge>
                    <Badge variant="outline">
                      Impact: {recommendation.impact}
                    </Badge>
                    <Badge variant="outline">
                      Effort: {recommendation.effort}
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

      <Card>
        <CardHeader>
          <CardTitle>Prompt Çalıştırmaları</CardTitle>
          <CardDescription>
            Gemini cevapları ve hata durumları burada listelenir.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {runs && runs.length > 0 ? (
            <div className="space-y-3">
              {runs.map((run) => {
                const prompt = Array.isArray(run.prompts)
  ? run.prompts[0]
  : run.prompts;

const analysis = Array.isArray(run.analyses)
  ? run.analyses[0]
  : run.analyses;

const competitors = Array.isArray(analysis?.competitors_json)
  ? analysis.competitors_json
  : [];

const risks = Array.isArray(analysis?.risk_notes_json)
  ? analysis.risk_notes_json
  : [];

const opportunities = Array.isArray(analysis?.opportunity_notes_json)
  ? analysis.opportunity_notes_json
  : [];

return (
  <div key={run.id} className="rounded-lg border p-4">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <Badge variant={getStatusVariant(run.status)}>
                        {run.status}
                      </Badge>

                      <Badge variant="secondary">{run.engine}</Badge>

                      {run.model ? (
                        <Badge variant="outline">{run.model}</Badge>
                      ) : null}
                    </div>

                    <p className="font-medium">
                      {prompt?.text ?? "Prompt metni bulunamadı"}
                    </p>

                    {prompt ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Intent: {prompt.intent} / Priority: {prompt.priority}
                      </p>
                    ) : null}
                    {analysis ? (
  <div className="mt-4 rounded-lg border bg-background p-4">
    <div className="mb-3 flex flex-wrap gap-2">
      <Badge variant={analysis.brand_mentioned ? "default" : "outline"}>
        {analysis.brand_mentioned ? "Marka geçti" : "Marka geçmedi"}
      </Badge>

      <Badge variant="secondary">
        Sıra: {analysis.brand_rank ?? "-"}
      </Badge>

      <Badge variant="outline">
        Sentiment: {analysis.brand_sentiment ?? "-"}
      </Badge>

      <Badge variant="outline">
        Confidence:{" "}
        {analysis.confidence_score
          ? Math.round(analysis.confidence_score * 100)
          : "-"}
        %
      </Badge>
    </div>

    <p className="text-sm font-medium">Analiz özeti</p>
    <p className="mt-1 text-sm text-muted-foreground">
      {analysis.summary}
    </p>

    {competitors.length > 0 ? (
      <div className="mt-3">
        <p className="text-sm font-medium">Rakip görünürlüğü</p>

        <div className="mt-2 flex flex-wrap gap-2">
          {competitors.map(
  (
    competitor: {
      name: string;
      mentioned: boolean;
      rank: number | null;
    },
    index: number
  ) => (
    <Badge
      key={`${competitor.name}-${index}`}
      variant={competitor.mentioned ? "secondary" : "outline"}
    >
      {competitor.name}
      {competitor.mentioned
        ? ` geçti${competitor.rank ? ` / sıra ${competitor.rank}` : ""}`
        : " geçmedi"}
    </Badge>
  )
)}
        </div>
      </div>
    ) : null}

    {risks.length > 0 ? (
      <div className="mt-3 rounded-lg border border-destructive/40 p-3">
        <p className="text-sm font-medium text-destructive">Riskler</p>

        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {risks.map((risk: string, index: number) => (
  <li key={`${risk}-${index}`}>{risk}</li>
))}
        </ul>
      </div>
    ) : null}

    {opportunities.length > 0 ? (
      <div className="mt-3 rounded-lg border p-3">
        <p className="text-sm font-medium">Fırsatlar</p>

        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {opportunities.map((opportunity: string, index: number) => (
  <li key={`${opportunity}-${index}`}>{opportunity}</li>
))}
        </ul>
      </div>
    ) : null}
  </div>
) : (
  <div className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
    Bu prompt için henüz analiz yok. Üstteki “Analiz et” butonuna bas.
  </div>
)}

                    {run.raw_answer ? (
                      <p className="mt-3 whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm">
                        {run.raw_answer}
                      </p>
                    ) : null}

                    {run.error_message ? (
                      <p className="mt-2 text-sm text-destructive">
                        {run.error_message}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">Run kaydı yok</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Audit oluşturulurken prompt run kayıtları yazılmalıydı.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}