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

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Bekliyor",
    running: "Çalışıyor",
    completed: "Tamamlandı",
    failed: "Başarısız",
  };

  return labels[status] ?? status;
}

function getStatusVariant(status: string) {
  if (status === "completed") return "default" as const;
  if (status === "failed") return "destructive" as const;
  if (status === "running") return "secondary" as const;

  return "outline" as const;
}

function formatScore(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";

  return `${Math.round(value)}`;
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";

  return `${Math.round(value)}%`;
}

function getChangeLabel(change: number | null) {
  if (change === null) return "Karşılaştırma için en az iki analizli ölçüm gerekli.";
  if (change > 0) return `Önceki ölçüme göre +${Math.round(change)} puan arttı.`;
  if (change < 0) return `Önceki ölçüme göre ${Math.round(change)} puan düştü.`;

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

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 rounded-xl border bg-background p-6 md:flex-row md:items-center">
        <div>
          <p className="text-sm text-muted-foreground">Ölçüm Geçmişi</p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {brand.name}
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Bu sayfada markanın geçmiş AI görünürlük ölçümlerini ve skor
            değişimini takip edebilirsin.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
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
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Toplam Ölçüm</CardTitle>
            <CardDescription>Bu marka için oluşturulan audit sayısı</CardDescription>
          </CardHeader>

          <CardContent>
            <p className="text-3xl font-semibold">{audits?.length ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Son Görünürlük</CardTitle>
            <CardDescription>En son analiz edilmiş ölçüm skoru</CardDescription>
          </CardHeader>

          <CardContent>
            <p className="text-3xl font-semibold">
              {latestAnalyzedAudit?.score
                ? `${formatScore(latestAnalyzedAudit.score.visibility_score)}/100`
                : "-"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Skor Değişimi</CardTitle>
            <CardDescription>Önceki analizli ölçüme göre fark</CardDescription>
          </CardHeader>

          <CardContent>
            <p className="text-3xl font-semibold">
              {visibilityChange === null
                ? "-"
                : visibilityChange > 0
                  ? `+${Math.round(visibilityChange)}`
                  : Math.round(visibilityChange)}
            </p>

            <p className="mt-2 text-sm text-muted-foreground">
              {getChangeLabel(visibilityChange)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Son Fırsat Skoru</CardTitle>
            <CardDescription>İyileştirme alanı oranı</CardDescription>
          </CardHeader>

          <CardContent>
            <p className="text-3xl font-semibold">
              {latestAnalyzedAudit?.score
                ? formatPercent(latestAnalyzedAudit.score.opportunity_score)
                : "-"}
            </p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Geçmiş Ölçümler</CardTitle>
          <CardDescription>
            Tüm auditleri, skorları ve rapor bağlantılarını buradan takip et.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {auditsWithScores.length > 0 ? (
            <div className="space-y-3">
              {auditsWithScores.map((audit) => (
                <div
                  key={audit.id}
                  className="flex flex-col justify-between gap-4 rounded-lg border p-4 lg:flex-row lg:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={getStatusVariant(audit.status)}>
                        {getStatusLabel(audit.status)}
                      </Badge>

                      <Badge variant="outline">
                        {audit.completed_prompts} / {audit.total_prompts} prompt
                      </Badge>
                    </div>

                    <p className="mt-2 text-sm text-muted-foreground">
                      Oluşturulma: {formatDate(audit.created_at)}
                    </p>
                  </div>

                  <div className="grid gap-3 text-sm md:grid-cols-4 lg:min-w-[520px]">
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
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">Henüz ölçüm yok</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Bu marka için prompt oluşturup ilk ölçümü başlat.
              </p>

              <Button asChild className="mt-4">
                <Link href={`/dashboard/brands/${brand.id}/prompts`}>
                  Promptlara git
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}