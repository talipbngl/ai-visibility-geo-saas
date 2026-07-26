import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/features/ui/components";
import { BrandSectionNav } from "@/features/brands/components/BrandSectionNav";
import { WebsiteAnalysisSummary } from "@/features/website/components/WebsiteAnalysisSummary";
import { createClient } from "@/lib/supabase/server";

type WebsiteAnalysisPageProps = {
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

export default async function WebsiteAnalysisPage({
  params,
  searchParams,
}: WebsiteAnalysisPageProps) {
  const { brandId } = await params;
  const query = await searchParams;

  const supabase = await createClient();

  const { data: brand } = await supabase
    .from("brands")
    .select("id, name, website_url, industry")
    .eq("id", brandId)
    .maybeSingle();

  if (!brand) {
    notFound();
  }

  const { data: snapshots } = await supabase
    .from("brand_website_snapshots")
    .select(
      `
      id,
      website_url,
      status,
      http_status,
      title,
      meta_description,
      headings_json,
      word_count,
      service_signals_json,
      trust_signals_json,
      technical_signals_json,
      category_scores_json,
      content_score,
      error_message,
      created_at
      `
    )
    .eq("brand_id", brand.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const latestSnapshot = snapshots?.[0] ?? null;
  const previousSnapshots = snapshots?.slice(1) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
  eyebrow="Web Sitesi Analizi"
  title={`${brand.name} web sitesi analizi`}
  description="Sitenin önemli teknik, içerik ve güven sinyallerini ölçün."
  actions={
    <form
      action={`/api/brands/${brand.id}/website-analysis`}
      method="post"
    >
      <Button type="submit">
        {latestSnapshot
          ? "Yeniden Analiz Et"
          : "Analizi Başlat"}
      </Button>
    </form>
  }
/>

<BrandSectionNav
  brandId={brand.id}
  active="website"
/>

      {query.error ? (
        <Card className="border-destructive shadow-sm">
          <CardContent className="pt-6 text-sm text-destructive">
            {query.error}
          </CardContent>
        </Card>
      ) : null}

      {latestSnapshot ? (
        latestSnapshot.status === "completed" ? (
          <>
            <Card className="shadow-sm">
              <CardContent className="flex flex-col justify-between gap-4 pt-6 md:flex-row md:items-center">
                <div>
                  <p className="font-medium">
                    Son analiz
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDate(latestSnapshot.created_at)}
                  </p>

                  <a
                    href={latestSnapshot.website_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block break-all text-sm underline underline-offset-4"
                  >
                    {latestSnapshot.website_url}
                  </a>
                </div>

                <Badge>
                  Analiz tamamlandı
                </Badge>
              </CardContent>
            </Card>

            <WebsiteAnalysisSummary
              categoryScoresValue={
                latestSnapshot.category_scores_json
              }
              technicalSignalsValue={
                latestSnapshot.technical_signals_json
              }
              headingsValue={latestSnapshot.headings_json}
              serviceSignalsValue={
                latestSnapshot.service_signals_json
              }
              trustSignalsValue={
                latestSnapshot.trust_signals_json
              }
              title={latestSnapshot.title}
              metaDescription={
                latestSnapshot.meta_description
              }
              wordCount={latestSnapshot.word_count}
            />

            {previousSnapshots.length > 0 ? (
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Önceki analizler</CardTitle>
                  <CardDescription>
                    Son analiz sonuçlarının kısa geçmişi.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  {previousSnapshots.map((snapshot) => (
                    <div
                      key={snapshot.id}
                      className="flex flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center"
                    >
                      <div>
                        <p className="font-medium">
                          {formatDate(snapshot.created_at)}
                        </p>

                        <p className="mt-1 text-sm text-muted-foreground">
                          Genel puan:{" "}
                          {Math.round(
                            Number(snapshot.content_score ?? 0)
                          )}
                          /100
                        </p>
                      </div>

                      <Badge
                        variant={
                          snapshot.status === "completed"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {snapshot.status === "completed"
                          ? "Tamamlandı"
                          : "Başarısız"}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="text-sm leading-6 text-muted-foreground">
                Bu analiz ana sayfa ve seçilen önemli alt sayfalardaki
                teknik, içerik ve güven sinyallerini değerlendirir.
                Google sıralaması veya arama motorlarındaki kesin indeks
                durumu doğrudan ölçülmez.
              </p>
            </div>
          </>
        ) : (
          <EmptyState
            title="Analiz tamamlanamadı"
            description={
              latestSnapshot.error_message ||
              "Web sitesi analiz edilirken bir sorun oluştu."
            }
            action={
              <form
                action={`/api/brands/${brand.id}/website-analysis`}
                method="post"
              >
                <Button type="submit">
                  Tekrar dene
                </Button>
              </form>
            }
          />
        )
      ) : (
        <EmptyState
          title="Henüz web sitesi analizi yok"
          description="Markanın ana sayfa ve önemli alt sayfalarındaki teknik, içerik ve güven sinyallerini ücretsiz olarak analiz edin."          action={
            <form
              action={`/api/brands/${brand.id}/website-analysis`}
              method="post"
            >
              <Button type="submit">
                Analizi başlat
              </Button>
            </form>
          }
        />
      )}
    </div>
  );
}