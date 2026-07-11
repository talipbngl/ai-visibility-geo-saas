import Link from "next/link";
import { notFound } from "next/navigation";

import { VisibilityTrendChart } from "@/features/brands/components/VisibilityTrendChart";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  EmptyState,
  MetricCard,
  PageHeader,
  StatusBadge,
} from "@/features/ui/components";

type BrandHistoryPageProps = {
  params: Promise<{
    brandId: string;
  }>;
};

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatShortDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function formatScore(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";

  return `${Math.round(value)}`;
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";

  return `${Math.round(value)}%`;
}

function getChangeValue(change: number | null) {
  if (change === null) return "-";
  if (change > 0) return `+${Math.round(change)}`;

  return `${Math.round(change)}`;
}

function getChangeLabel(change: number | null) {
  if (change === null) {
    return "Karşılaştırma için en az iki analizli ölçüm gerekli.";
  }

  if (change > 0) {
    return `Önceki ölçüme göre +${Math.round(change)} puan arttı.`;
  }

  if (change < 0) {
    return `Önceki ölçüme göre ${Math.round(change)} puan düştü.`;
  }

  return "Önceki ölçüme göre değişim yok.";
}

export default async function BrandHistoryPage({
  params,
}: BrandHistoryPageProps) {
  const { brandId } = await params;

  const supabase = await createClient();

  const { data: brand } = await supabase
    .from("brands")
    .select("id, name, website_url, industry, country, language")
    .eq("id", brandId)
    .maybeSingle();

  if (!brand) {
    notFound();
  }

  const { data: audits } = await supabase
    .from("audits")
    .select("id, status, total_prompts, completed_prompts, created_at")
    .eq("brand_id", brand.id)
    .order("created_at", { ascending: false });

  const auditIds = (audits ?? []).map((audit) => audit.id);

  const scoreResult =
    auditIds.length > 0
      ? await supabase
          .from("audit_scores")
          .select(
            "audit_id, visibility_score, share_of_voice, average_rank, positive_sentiment_rate, opportunity_score"
          )
          .in("audit_id", auditIds)
      : { data: [] };

  const scoreByAuditId = new Map(
    (scoreResult.data ?? []).map((score) => [score.audit_id, score])
  );

  const auditsWithScores = (audits ?? []).map((audit) => ({
    ...audit,
    score: scoreByAuditId.get(audit.id) ?? null,
  }));

  const analyzedAudits = auditsWithScores.filter((audit) => audit.score);

  const latestAnalyzedAudit = analyzedAudits[0];
  const previousAnalyzedAudit = analyzedAudits[1];

  const visibilityChange =
    latestAnalyzedAudit?.score && previousAnalyzedAudit?.score
      ? Number(latestAnalyzedAudit.score.visibility_score) -
        Number(previousAnalyzedAudit.score.visibility_score)
      : null;

  const trendData = analyzedAudits
    .slice()
    .reverse()
    .map((audit) => ({
      date: formatShortDate(audit.created_at),
      visibilityScore: Math.round(Number(audit.score?.visibility_score ?? 0)),
      shareOfVoice: Math.round(Number(audit.score?.share_of_voice ?? 0)),
      opportunityScore: Math.round(Number(audit.score?.opportunity_score ?? 0)),
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ölçüm Geçmişi"
        title={`${brand.name} geçmişi`}
        description="Markanın AI görünürlük skorunun zaman içindeki değişimini, önceki raporlarını ve ölçüm detaylarını buradan takip et."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/dashboard/brands/${brand.id}`}>
                Marka detayına dön
              </Link>
            </Button>

            <Button asChild>
              <Link href={`/dashboard/brands/${brand.id}/prompts`}>
                Yeni ölçüm başlat
              </Link>
            </Button>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Toplam Ölçüm"
          description="Bu marka için oluşturulan ölçüm"
          value={audits?.length ?? 0}
        />

        <MetricCard
          title="Son Görünürlük"
          description="En son analiz edilmiş skor"
          value={
            latestAnalyzedAudit?.score
              ? `${formatScore(latestAnalyzedAudit.score.visibility_score)}/100`
              : "-"
          }
        />

        <MetricCard
          title="Skor Değişimi"
          description="Önceki analizli ölçüme göre"
          value={getChangeValue(visibilityChange)}
          footer={getChangeLabel(visibilityChange)}
        />

        <MetricCard
          title="Son Fırsat Skoru"
          description="İyileştirme alanı oranı"
          value={
            latestAnalyzedAudit?.score
              ? formatPercent(latestAnalyzedAudit.score.opportunity_score)
              : "-"
          }
        />
      </section>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Görünürlük Trendi</CardTitle>
          <CardDescription>
            Ölçümler boyunca görünürlük, görünürlük payı ve fırsat skoru değişimi.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <VisibilityTrendChart data={trendData} />
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Geçmiş Ölçümler</CardTitle>
          <CardDescription>
            Tüm ölçümleri, skorları ve rapor bağlantılarını buradan takip et.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {auditsWithScores.length > 0 ? (
            <div className="space-y-3">
              {auditsWithScores.map((audit) => (
                <div
                  key={audit.id}
                  className="rounded-xl border p-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={audit.status} />

                        <Badge variant="outline">
                          {audit.completed_prompts} / {audit.total_prompts} soru
                        </Badge>
                      </div>

                      <p className="mt-2 text-sm text-muted-foreground">
                        Oluşturulma: {formatDate(audit.created_at)}
                      </p>
                    </div>

                    <div className="grid gap-2 text-sm md:grid-cols-4 xl:min-w-[520px]">
                      <div className="rounded-lg border p-3">
                        <p className="text-muted-foreground">Görünürlük</p>
                        <p className="font-semibold">
                          {audit.score
                            ? `${formatScore(audit.score.visibility_score)}/100`
                            : "-"}
                        </p>
                      </div>

                      <div className="rounded-lg border p-3">
                        <p className="text-muted-foreground">Pay</p>
                        <p className="font-semibold">
                          {audit.score
                            ? formatPercent(audit.score.share_of_voice)
                            : "-"}
                        </p>
                      </div>

                      <div className="rounded-lg border p-3">
                        <p className="text-muted-foreground">Ortalama sıra</p>
                        <p className="font-semibold">
                          {audit.score?.average_rank ?? "-"}
                        </p>
                      </div>

                      <div className="rounded-lg border p-3">
                        <p className="text-muted-foreground">Olumlu ton</p>
                        <p className="font-semibold">
                          {audit.score
                            ? formatPercent(audit.score.positive_sentiment_rate)
                            : "-"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/audits/${audit.id}`}>
                          Detay
                        </Link>
                      </Button>

                      <Button asChild size="sm">
                        <Link href={`/dashboard/audits/${audit.id}/report`}>
                          Rapor
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Henüz ölçüm yok"
              description="Bu marka için test soruları oluşturup ilk AI görünürlük ölçümünü başlat."
              action={
                <Button asChild>
                  <Link href={`/dashboard/brands/${brand.id}/prompts`}>
                    Test sorularına git
                  </Link>
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}