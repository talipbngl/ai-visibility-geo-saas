import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

type BrandDetailPageProps = {
  params: Promise<{
    brandId: string;
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

function getWebsiteLabel(value: string | null) {
  if (!value) return "-";

  return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export default async function BrandDetailPage({
  params,
  searchParams,
}: BrandDetailPageProps) {
  const { brandId } = await params;
  const query = await searchParams;

  const supabase = await createClient();

  const { data: brand } = await supabase
    .from("brands")
    .select(
      "id, name, website_url, industry, country, language, description, target_audience, primary_offer, created_at"
    )
    .eq("id", brandId)
    .maybeSingle();

  if (!brand) {
    notFound();
  }

  const { data: aliases } = await supabase
    .from("brand_aliases")
    .select("id, alias")
    .eq("brand_id", brand.id)
    .order("created_at", { ascending: true });

  const { count: competitorCount } = await supabase
    .from("competitors")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", brand.id);

  const { count: promptCount } = await supabase
    .from("prompts")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", brand.id);

  const { count: auditCount } = await supabase
    .from("audits")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", brand.id);

  const { data: latestAudit } = await supabase
    .from("audits")
    .select("id, status, total_prompts, completed_prompts, created_at")
    .eq("brand_id", brand.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: latestScore } = latestAudit
    ? await supabase
        .from("audit_scores")
        .select(
          "visibility_score, share_of_voice, average_rank, positive_sentiment_rate, opportunity_score"
        )
        .eq("audit_id", latestAudit.id)
        .maybeSingle()
    : { data: null };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Marka Detayı"
        title={brand.name}
        description="Bu markanın rakiplerini, test sorularını, ölçüm geçmişini ve son AI görünürlük raporunu buradan yönet."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/dashboard/brands">Markalara dön</Link>
            </Button>
           
             <Button asChild variant="outline">
              <Link href={`/dashboard/brands/${brand.id}/edit`}>
                     Düzenle
                  </Link>
                    </Button>

            <Button asChild variant="outline">
              <Link href={`/dashboard/brands/${brand.id}/history`}>
                Ölçüm geçmişi
              </Link>
            </Button>

            <Button asChild variant="outline">
              <Link href={`/dashboard/brands/${brand.id}/competitors`}>
                Rakipler
              </Link>
            </Button>

            <Button asChild>
              <Link href={`/dashboard/brands/${brand.id}/prompts`}>
                Test soruları
              </Link>
            </Button>
          </>
        }
      />

      {query.error ? (
        <Alert variant="destructive">
          <AlertDescription>{query.error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Rakipler"
          description="Karşılaştırılan marka"
          value={competitorCount ?? 0}
        />

        <MetricCard
          title="Test Soruları"
          description="Ölçümde kullanılacak soru"
          value={promptCount ?? 0}
        />

        <MetricCard
          title="Ölçümler"
          description="Başlatılan toplam ölçüm"
          value={auditCount ?? 0}
        />
      </section>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Son AI Görünürlük Ölçümü</CardTitle>
          <CardDescription>
            Bu marka için en son oluşturulan ölçümün kısa özeti.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {latestAudit ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-xl border p-4">
                  <p className="text-sm text-muted-foreground">Durum</p>
                  <div className="mt-2">
                    <StatusBadge status={latestAudit.status} />
                  </div>
                </div>

                <div className="rounded-xl border p-4">
                  <p className="text-sm text-muted-foreground">Tamamlanan</p>
                  <p className="mt-1 text-xl font-semibold">
                    {latestAudit.completed_prompts} /{" "}
                    {latestAudit.total_prompts}
                  </p>
                </div>

                <div className="rounded-xl border p-4">
                  <p className="text-sm text-muted-foreground">Görünürlük</p>
                  <p className="mt-1 text-xl font-semibold">
                    {latestScore
                      ? `${Math.round(latestScore.visibility_score)}/100`
                      : "-"}
                  </p>
                </div>

                <div className="rounded-xl border p-4">
                  <p className="text-sm text-muted-foreground">
                    Görünürlük Payı
                  </p>
                  <p className="mt-1 text-xl font-semibold">
                    {latestScore
                      ? `${Math.round(latestScore.share_of_voice)}%`
                      : "-"}
                  </p>
                </div>
              </div>

              <div className="flex flex-col justify-between gap-3 rounded-xl border bg-muted/20 p-4 md:flex-row md:items-center">
                <div>
                  <p className="font-medium">Son ölçüm raporu</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Oluşturulma: {formatDate(latestAudit.created_at)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/audits/${latestAudit.id}`}>
                      Ölçüm detayı
                    </Link>
                  </Button>

                  <Button asChild size="sm">
                    <Link href={`/dashboard/audits/${latestAudit.id}/report`}>
                      Raporu gör
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Henüz ölçüm yok"
              description="Bu marka için önce rakipleri ve test sorularını hazırla. Ardından ilk AI görünürlük ölçümünü başlat."
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

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Marka Bilgileri</CardTitle>
            <CardDescription>
              Prompt üretimi ve analizlerde kullanılan temel bilgiler.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">Website</p>
                {brand.website_url ? (
                  <Link
                    href={brand.website_url}
                    target="_blank"
                    className="mt-1 block font-medium underline underline-offset-4"
                  >
                    {getWebsiteLabel(brand.website_url)}
                  </Link>
                ) : (
                  <p className="mt-1 font-medium">-</p>
                )}
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">Pazar</p>
                <p className="mt-1 font-medium">
                  {brand.country || "TR"} / {brand.language || "tr"}
                </p>
              </div>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">Sektör</p>
              <p className="mt-1 font-medium">
                {brand.industry || "Sektör belirtilmedi"}
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">Açıklama</p>
              <p className="mt-1 text-sm leading-6">
                {brand.description || "-"}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">Hedef kitle</p>
                <p className="mt-1 text-sm leading-6">
                  {brand.target_audience || "-"}
                </p>
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">Ana teklif</p>
                <p className="mt-1 text-sm leading-6">
                  {brand.primary_offer || "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Marka Aliasları</CardTitle>
            <CardDescription>
              AI cevaplarında markayı yakalamak için kullanılan farklı yazımlar.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {aliases && aliases.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {aliases.map((item) => (
                  <Badge key={item.id} variant="secondary">
                    {item.alias}
                  </Badge>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Henüz alias eklenmedi"
                description="Markanın farklı yazımları analiz kalitesini artırır."
              />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}