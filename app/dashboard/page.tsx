import Link from "next/link";

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
  getImpactLabel,
  getRecommendationPriorityLabel,
} from "@/lib/ui/labels";

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function round(value: number) {
  return Math.round(value);
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const { count: brandCount } = await supabase
    .from("brands")
    .select("id", { count: "exact", head: true });

  const { count: auditCount } = await supabase
    .from("audits")
    .select("id", { count: "exact", head: true });

  const { data: scores } = await supabase
    .from("audit_scores")
    .select("visibility_score, share_of_voice, opportunity_score");

  const averageVisibilityScore =
    scores && scores.length > 0
      ? round(
          scores.reduce(
            (total, score) => total + Number(score.visibility_score ?? 0),
            0
          ) / scores.length
        )
      : 0;

  const averageShareOfVoice =
    scores && scores.length > 0
      ? round(
          scores.reduce(
            (total, score) => total + Number(score.share_of_voice ?? 0),
            0
          ) / scores.length
        )
      : 0;

  const averageOpportunityScore =
    scores && scores.length > 0
      ? round(
          scores.reduce(
            (total, score) => total + Number(score.opportunity_score ?? 0),
            0
          ) / scores.length
        )
      : 0;

  const { data: latestAudits } = await supabase
    .from("audits")
    .select(
      "id, brand_id, status, total_prompts, completed_prompts, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(5);

  const brandIds = Array.from(
    new Set((latestAudits ?? []).map((audit) => audit.brand_id).filter(Boolean))
  );

  const brandsResult =
    brandIds.length > 0
      ? await supabase.from("brands").select("id, name").in("id", brandIds)
      : { data: [] };

  const brandNameById = new Map(
    (brandsResult.data ?? []).map((brand) => [brand.id, brand.name])
  );

  const auditIds = (latestAudits ?? []).map((audit) => audit.id);

  const scoreResult =
    auditIds.length > 0
      ? await supabase
          .from("audit_scores")
          .select("audit_id, visibility_score, share_of_voice")
          .in("audit_id", auditIds)
      : { data: [] };

  const scoreByAuditId = new Map(
    (scoreResult.data ?? []).map((score) => [score.audit_id, score])
  );

  const { data: recommendations } = await supabase
    .from("recommendations")
    .select("id, audit_id, title, description, priority, impact, category")
    .order("created_at", { ascending: false })
    .limit(5);

  const hasAnyBrand = (brandCount ?? 0) > 0;
  const hasAnyAudit = (auditCount ?? 0) > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Genel Bakış"
        title="AI Görünürlük Paneli"
        description="Markalarının AI cevaplarında ne kadar göründüğünü, rakiplere göre görünürlük payını ve aksiyon önerilerini tek ekrandan takip et."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/dashboard/brands">Markalar</Link>
            </Button>
            <Button asChild variant="outline">
  <Link href="/dashboard/demo-report">
    Demo rapor
  </Link>
</Button>

            <Button asChild>
              <Link href="/dashboard/brands/new">Yeni marka ekle</Link>
            </Button>
          </>
        }
      />

      <Card className="border-primary/20 bg-primary/5 shadow-sm">
        <CardHeader>
          <CardTitle>Hızlı başlangıç</CardTitle>
          <CardDescription>
            İlk raporu almak için bu 3 adımı tamamlaman yeterli.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border bg-background/80 p-4">
              <div className="mb-3 flex size-8 items-center justify-center rounded-full border bg-background text-sm font-semibold">
                1
              </div>
              <p className="font-medium">Markanı ekle</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ölçüm yapılacak marka ve web sitesi bilgisini gir.
              </p>
            </div>

            <div className="rounded-xl border bg-background/80 p-4">
              <div className="mb-3 flex size-8 items-center justify-center rounded-full border bg-background text-sm font-semibold">
                2
              </div>
              <p className="font-medium">Rakipleri tanımla</p>
              <p className="mt-1 text-sm text-muted-foreground">
                AI cevaplarında karşılaştırılacak rakip markaları ekle.
              </p>
            </div>

            <div className="rounded-xl border bg-background/80 p-4">
              <div className="mb-3 flex size-8 items-center justify-center rounded-full border bg-background text-sm font-semibold">
                3
              </div>
              <p className="font-medium">Ölçüm başlat</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Test sorularını çalıştır, analiz et ve raporu incele.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Markalar"
          description="Takip edilen marka"
          value={brandCount ?? 0}
        />

        <MetricCard
          title="Ölçümler"
          description="Başlatılan toplam ölçüm"
          value={auditCount ?? 0}
        />

        <MetricCard
          title="Ortalama Görünürlük"
          description="Tüm analizlerin ortalaması"
          value={`${averageVisibilityScore}/100`}
        />

        <MetricCard
          title="Görünürlük Payı"
          description="Rakiplere göre ortalama pay"
          value={`${averageShareOfVoice}%`}
        />
      </section>

      {!hasAnyBrand ? (
        <EmptyState
          title="Henüz marka eklenmemiş"
          description="İlk AI görünürlük raporunu oluşturmak için önce takip etmek istediğin markayı ekle."
          action={
            <Button asChild>
              <Link href="/dashboard/brands/new">İlk markayı ekle</Link>
            </Button>
          }
        />
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Son Ölçümler</CardTitle>
            <CardDescription>
              En son oluşturulan AI görünürlük ölçümleri.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {latestAudits && latestAudits.length > 0 ? (
              <div className="space-y-3">
                {latestAudits.map((audit) => {
                  const auditScore = scoreByAuditId.get(audit.id);

                  return (
                    <div
                      key={audit.id}
                      className="rounded-xl border p-4 transition-colors hover:bg-muted/30"
                    >
                      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">
                              {brandNameById.get(audit.brand_id) ?? "Marka"}
                            </p>

                            <StatusBadge status={audit.status} />
                          </div>

                          <p className="mt-2 text-sm text-muted-foreground">
                            {audit.completed_prompts} / {audit.total_prompts}{" "}
                            test sorusu tamamlandı
                          </p>

                          {auditScore ? (
                            <p className="mt-1 text-sm text-muted-foreground">
                              Görünürlük:{" "}
                              {Math.round(auditScore.visibility_score)}/100 ·
                              Pay: {Math.round(auditScore.share_of_voice)}%
                            </p>
                          ) : (
                            <p className="mt-1 text-sm text-muted-foreground">
                              Henüz analiz edilmedi.
                            </p>
                          )}

                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDate(audit.created_at)}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
  <form action={`/api/audits/${audit.id}/continue`} method="post">
    <Button type="submit" size="sm">
      Devam et
    </Button>
  </form>

  <Button asChild variant="outline" size="sm">
    <Link href={`/dashboard/audits/${audit.id}`}>
      Detay
    </Link>
  </Button>

  <Button asChild variant="outline" size="sm">
    <Link href={`/dashboard/audits/${audit.id}/report`}>
      Rapor
    </Link>
  </Button>
</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="Henüz ölçüm yok"
                description="Bir marka ekleyip test sorularını hazırladıktan sonra ilk AI görünürlük ölçümünü başlat."
                action={
                  <Button asChild>
                    <Link href="/dashboard/brands">Markalara git</Link>
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Aksiyon Önerileri</CardTitle>
              <CardDescription>
                Son analizlerden çıkan uygulanabilir öneriler.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {recommendations && recommendations.length > 0 ? (
                <div className="space-y-3">
                  {recommendations.map((recommendation) => (
                    <div
                      key={recommendation.id}
                      className="rounded-xl border p-4"
                    >
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
                      </div>

                      <p className="font-medium">{recommendation.title}</p>
                      <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                        {recommendation.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Henüz öneri yok"
                  description="Ölçüm cevaplarını analiz edince öneriler burada görünecek."
                />
              )}
            </CardContent>
          </Card>

          <MetricCard
            title="Fırsat Skoru"
            description="Markanın görünmediği ama rakiplerin göründüğü alanlar"
            value={`${averageOpportunityScore}%`}
            footer={
              hasAnyAudit
                ? "Skor yükseldikçe içerik ve AI görünürlük fırsatı artar."
                : "İlk ölçümden sonra bu alan dolacak."
            }
          />
        </div>
      </section>
    </div>
  );
}