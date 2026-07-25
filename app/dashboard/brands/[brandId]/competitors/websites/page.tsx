import Link from "next/link";
import { notFound } from "next/navigation";
import { CompetitorContentGap } from "@/features/website/components/CompetitorContentGap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState, MetricCard, PageHeader } from "@/features/ui/components";
import { CompetitorScoreComparison } from "@/features/website/components/CompetitorScoreComparison";
import { createClient } from "@/lib/supabase/server";

type CompetitorWebsitesPageProps = {
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

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function getNumber(value: unknown, key: string) {
  const record = toRecord(value);
  const number = Number(record[key] ?? 0);

  if (!Number.isFinite(number)) return 0;

  return Math.max(0, Math.round(number));
}

function hasDetailedScores(value: unknown) {
  const record = toRecord(value);

  return ["technical", "structure", "content", "trust"].some((key) =>
    Number.isFinite(Number(record[key]))
  );
}

export default async function CompetitorWebsitesPage({
  params,
  searchParams,
}: CompetitorWebsitesPageProps) {
  const { brandId } = await params;
  const query = await searchParams;
  const supabase = await createClient();

  const { data: brand } = await supabase
    .from("brands")
    .select("id, name")
    .eq("id", brandId)
    .maybeSingle();

  if (!brand) {
    notFound();
  }

  const { data: competitors } = await supabase
    .from("competitors")
    .select("id, name, website_url, description")
    .eq("brand_id", brand.id)
    .order("created_at", { ascending: true });

  const [{ data: competitorSnapshots }, { data: brandSnapshots }] =
    await Promise.all([
      supabase
        .from("competitor_website_snapshots")
        .select(
          `
          id,
          competitor_id,
          website_url,
          title,
          technical_signals_json,
          category_scores_json,
          content_score,
          created_at
          `
        )
        .eq("brand_id", brand.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false }),

      supabase
        .from("brand_website_snapshots")
        .select(
          `
          id,
          technical_signals_json,
          category_scores_json,
          content_score,
          created_at
          `
        )
        .eq("brand_id", brand.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

  const latestSnapshotByCompetitorId = new Map<
    string,
    NonNullable<typeof competitorSnapshots>[number]
  >();

  (competitorSnapshots ?? []).forEach((snapshot) => {
    if (!latestSnapshotByCompetitorId.has(snapshot.competitor_id)) {
      latestSnapshotByCompetitorId.set(
        snapshot.competitor_id,
        snapshot
      );
    }
  });

  const latestBrandSnapshot = brandSnapshots?.[0] ?? null;
  const analyzedSnapshots = Array.from(
    latestSnapshotByCompetitorId.values()
  );

  const detailedSnapshots = analyzedSnapshots.filter((snapshot) =>
    hasDetailedScores(snapshot.category_scores_json)
  );

  const averageCompetitorScore =
    detailedSnapshots.length > 0
      ? Math.round(
          detailedSnapshots.reduce(
            (sum, snapshot) =>
              sum +
              getNumber(snapshot.category_scores_json, "overall"),
            0
          ) / detailedSnapshots.length
        )
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Rakip web sitesi analizi"
        title={`${brand.name} rakip karşılaştırması`}
        description="Markanızın teknik, yapısal, içerik ve güven puanlarını rakiplerle karşılaştırın."
        actions={
          <Button asChild variant="outline">
            <Link href={`/dashboard/brands/${brand.id}/competitors`}>
              Rakiplere dön
            </Link>
          </Button>
        }
      />

      {query.error ? (
        <Card className="border-destructive shadow-sm">
          <CardContent className="pt-6 text-sm text-destructive">
            {query.error}
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Kayıtlı rakip"
          description="Karşılaştırılabilecek rakipler"
          value={competitors?.length ?? 0}
        />

        <MetricCard
          title="Analiz edilen"
          description="Güncel analizi bulunan rakipler"
          value={analyzedSnapshots.length}
        />

        <MetricCard
          title="Rakip ortalaması"
          description="Genel web sitesi puanı"
          value={
            detailedSnapshots.length > 0
              ? `${averageCompetitorScore}/100`
              : "-"
          }
        />
      </section>

      <CompetitorScoreComparison
        brandName={brand.name}
        brandScoresValue={
          latestBrandSnapshot?.category_scores_json ?? null
        }
        competitors={(competitors ?? [])
          .map((competitor) => {
            const snapshot = latestSnapshotByCompetitorId.get(
              competitor.id
            );

            if (!snapshot) return null;

            return {
              id: competitor.id,
              name: competitor.name,
              scoresValue: snapshot.category_scores_json,
            };
          })
          .filter(
            (
              competitor
            ): competitor is {
              id: string;
              name: string;
              scoresValue: unknown;
            } => competitor !== null
          )}
      />
     <CompetitorContentGap
  brandName={brand.name}
  brandTechnicalSignalsValue={
    latestBrandSnapshot
      ?.technical_signals_json ?? null
  }
  competitors={(competitors ?? [])
    .map((competitor) => {
      const snapshot =
        latestSnapshotByCompetitorId.get(
          competitor.id
        );

      if (!snapshot) return null;

      return {
        id: competitor.id,
        name: competitor.name,
        technicalSignalsValue:
          snapshot.technical_signals_json,
      };
    })
    .filter(
      (
        competitor
      ): competitor is {
        id: string;
        name: string;
        technicalSignalsValue: unknown;
      } => competitor !== null
    )}
/>
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Rakip analizleri</CardTitle>
          <CardDescription>
            Eski analizlerde kategori puanları yoksa analizi yeniden
            çalıştırın.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {competitors && competitors.length > 0 ? (
            <div className="space-y-4">
              {competitors.map((competitor) => {
                const snapshot =
                  latestSnapshotByCompetitorId.get(competitor.id);

                const detailed = hasDetailedScores(
                  snapshot?.category_scores_json
                );

                const scoreItems = snapshot
                  ? [
                      {
                        label: "Teknik",
                        value: getNumber(
                          snapshot.category_scores_json,
                          "technical"
                        ),
                      },
                      {
                        label: "Yapı",
                        value: getNumber(
                          snapshot.category_scores_json,
                          "structure"
                        ),
                      },
                      {
                        label: "İçerik",
                        value: getNumber(
                          snapshot.category_scores_json,
                          "content"
                        ),
                      },
                      {
                        label: "Güven",
                        value: getNumber(
                          snapshot.category_scores_json,
                          "trust"
                        ),
                      },
                    ]
                  : [];

                const pagesAnalyzed = snapshot
                  ? Math.max(
                      getNumber(
                        snapshot.technical_signals_json,
                        "pagesAnalyzed"
                      ),
                      1
                    )
                  : 0;

                return (
                  <div
                    key={competitor.id}
                    className="rounded-xl border p-4"
                  >
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">
                            {competitor.name}
                          </p>

                          {detailed ? (
                            <Badge variant="secondary">
                              Analiz hazır
                            </Badge>
                          ) : snapshot ? (
                            <Badge variant="outline">
                              Yeniden analiz edilmeli
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              Analiz yok
                            </Badge>
                          )}
                        </div>

                        {competitor.website_url ? (
                          <a
                            href={competitor.website_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 block break-all text-sm text-muted-foreground underline underline-offset-4"
                          >
                            {competitor.website_url}
                          </a>
                        ) : (
                          <p className="mt-1 text-sm text-muted-foreground">
                            Web sitesi adresi bulunmuyor.
                          </p>
                        )}
                      </div>

                      <form
                        action={`/api/competitors/${competitor.id}/website-analysis`}
                        method="post"
                      >
                        <Button
                          type="submit"
                          variant={snapshot ? "outline" : "default"}
                          disabled={!competitor.website_url}
                        >
                          {snapshot
                            ? "Yeniden analiz et"
                            : "Analizi başlat"}
                        </Button>
                      </form>
                    </div>

                    {snapshot && detailed ? (
                      <div className="mt-4 border-t pt-4">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                          <div className="rounded-lg bg-primary/5 p-3">
                            <p className="text-xs text-muted-foreground">
                              Genel puan
                            </p>
                            <p className="mt-1 text-lg font-semibold">
                              {getNumber(
                                snapshot.category_scores_json,
                                "overall"
                              )}
                              /100
                            </p>
                          </div>

                          {scoreItems.map((item) => (
                            <div
                              key={item.label}
                              className="rounded-lg bg-muted/30 p-3"
                            >
                              <p className="text-xs text-muted-foreground">
                                {item.label}
                              </p>
                              <p className="mt-1 text-lg font-semibold">
                                {item.value}/100
                              </p>
                            </div>
                          ))}
                        </div>

                        <p className="mt-3 text-sm text-muted-foreground">
                          {pagesAnalyzed} sayfa incelendi · Son analiz:{" "}
                          {formatDate(snapshot.created_at)}
                        </p>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="Henüz rakip yok"
              description="Karşılaştırma yapabilmek için önce en az bir rakip ekleyin."
              action={
                <Button asChild>
                  <Link
                    href={`/dashboard/brands/${brand.id}/competitors`}
                  >
                    Rakip ekle
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