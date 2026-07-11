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

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Bekliyor",
    running: "Çalışıyor",
    completed: "Tamamlandı",
    failed: "Başarısız",
  };

  return labels[status] ?? status;
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
  .select(
    "id, status, total_prompts, completed_prompts, created_at"
  )
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
      <section className="flex flex-col justify-between gap-4 rounded-xl border bg-background p-6 md:flex-row md:items-center">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {brand.name}
            </h1>

            <Badge variant="secondary">{brand.country || "TR"}</Badge>
            <Badge variant="outline">{brand.language || "tr"}</Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            {brand.industry || "Sektör belirtilmedi"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/brands">Markalara dön</Link>
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
              Promptlar
            </Link>
          </Button>
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
            <CardTitle>Rakipler</CardTitle>
            <CardDescription>Eklenen rakip sayısı</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{competitorCount ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Promptlar</CardTitle>
            <CardDescription>Test edilecek prompt sayısı</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{promptCount ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ölçümler</CardTitle>
            <CardDescription>Çalıştırılan analiz sayısı</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{auditCount ?? 0}</p>
          </CardContent>
        </Card>
      </section>
      <Card>
  <CardHeader>
    <CardTitle>Son AI Görünürlük Ölçümü</CardTitle>
    <CardDescription>
      Bu marka için en son oluşturulan ölçüm ve rapor özeti.
    </CardDescription>
  </CardHeader>

  <CardContent>
    {latestAudit ? (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Durum</p>
            <p className="mt-1 text-lg font-semibold">
              {getStatusLabel(latestAudit.status)}
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Tamamlanan</p>
            <p className="mt-1 text-lg font-semibold">
              {latestAudit.completed_prompts} / {latestAudit.total_prompts}
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Görünürlük</p>
            <p className="mt-1 text-lg font-semibold">
              {latestScore
                ? `${Math.round(latestScore.visibility_score)}/100`
                : "-"}
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Görünürlük Payı</p>
            <p className="mt-1 text-lg font-semibold">
              {latestScore
                ? `${Math.round(latestScore.share_of_voice)}%`
                : "-"}
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 rounded-lg border p-4 md:flex-row md:items-center">
          <div>
            <p className="font-medium">Son ölçüm raporu</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Oluşturulma: {formatDate(latestAudit.created_at)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/audits/${latestAudit.id}`}>
                Ölçüm detayına git
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
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="font-medium">Henüz ölçüm yok</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Bu marka için test soruları oluşturduktan sonra ilk AI görünürlük
          ölçümünü başlatabilirsin.
        </p>

        <Button asChild className="mt-4">
          <Link href={`/dashboard/brands/${brand.id}/prompts`}>
            Test sorularına git
          </Link>
        </Button>
      </div>
    )}
  </CardContent>
</Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Marka Bilgileri</CardTitle>
            <CardDescription>
              Audit ve prompt üretiminde kullanılacak temel bilgiler.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Website</p>
              {brand.website_url ? (
                <Link
                  href={brand.website_url}
                  target="_blank"
                  className="font-medium underline"
                >
                  {brand.website_url}
                </Link>
              ) : (
                <p className="font-medium">-</p>
              )}
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Açıklama</p>
              <p className="font-medium">{brand.description || "-"}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Hedef kitle</p>
              <p className="font-medium">{brand.target_audience || "-"}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Ana teklif</p>
              <p className="font-medium">{brand.primary_offer || "-"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aliaslar</CardTitle>
            <CardDescription>
              AI cevaplarında markayı yakalamak için farklı yazımlar.
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
              <p className="text-sm text-muted-foreground">
                Henüz alias eklenmedi.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}