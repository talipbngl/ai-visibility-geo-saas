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

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-background p-6">
        <p className="text-sm text-muted-foreground">Dashboard</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          AI Görünürlük Paneli
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Markalarının AI cevaplarında ne kadar göründüğünü, rakiplere göre ses
          payını ve aksiyon önerilerini buradan takip edebilirsin.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Markalar</CardTitle>
            <CardDescription>Takip edilen marka sayısı</CardDescription>
          </CardHeader>

          <CardContent>
            <p className="text-3xl font-semibold">{brandCount ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Auditler</CardTitle>
            <CardDescription>Başlatılan toplam audit</CardDescription>
          </CardHeader>

          <CardContent>
            <p className="text-3xl font-semibold">{auditCount ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ortalama Görünürlük</CardTitle>
            <CardDescription>Marka görünürlük skoru</CardDescription>
          </CardHeader>

          <CardContent>
            <p className="text-3xl font-semibold">
              {averageVisibilityScore}/100
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Görünürlük Payı</CardTitle>
            <CardDescription>Rakiplere göre ortalama pay</CardDescription>
          </CardHeader>

          <CardContent>
            <p className="text-3xl font-semibold">
              {averageShareOfVoice}%
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Son Auditler</CardTitle>
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
                      className="flex flex-col justify-between gap-3 rounded-lg border p-4 md:flex-row md:items-center"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">
                            {brandNameById.get(audit.brand_id) ?? "Marka"}
                          </p>

                          <Badge variant={getStatusVariant(audit.status)}>
                            {audit.status}
                          </Badge>
                        </div>

                        <p className="mt-1 text-sm text-muted-foreground">
                          {audit.completed_prompts} / {audit.total_prompts} prompt
                          tamamlandı
                        </p>

                        {auditScore ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            Görünürlük:{" "}
                            {Math.round(auditScore.visibility_score)}/100 ·
                            Pay:{" "}
                            {Math.round(auditScore.share_of_voice)}%
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

                      <Button asChild size="sm">
                        <Link href={`/dashboard/audits/${audit.id}`}>
                          Detaya git
                        </Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="font-medium">Henüz audit yok</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Bir marka ekleyip prompt oluşturduktan sonra audit başlat.
                </p>

                <Button asChild className="mt-4">
                  <Link href="/dashboard/brands">Markalara git</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
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
                  <div key={recommendation.id} className="rounded-lg border p-4">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <Badge variant="secondary">
                        {recommendation.category}
                      </Badge>
                      <Badge variant="outline">
                        Priority: {recommendation.priority}
                      </Badge>
                      <Badge variant="outline">
                        Impact: {recommendation.impact}
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
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="font-medium">Henüz öneri yok</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Audit cevaplarını analiz edince öneriler burada görünecek.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Fırsat Skoru</CardTitle>
          <CardDescription>
            Rakiplerin görünüp markanın görünmediği alanların ortalama oranı.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <p className="text-3xl font-semibold">
            {averageOpportunityScore}%
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Bu değer yükseldikçe, içerik ve GEO optimizasyonu için daha fazla
            fırsat var demektir.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}