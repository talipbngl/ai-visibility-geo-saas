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
import { EmptyState, MetricCard, PageHeader } from "@/features/ui/components";

type CompetitorWebsitesPageProps = {
  params: Promise<{
    brandId: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

type Signal = {
  keyword: string;
  count: number;
  found: boolean;
};

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function toSignalArray(value: unknown): Signal[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const signal = item as Partial<Signal>;

      return {
        keyword: String(signal.keyword ?? ""),
        count: Number(signal.count ?? 0),
        found: Boolean(signal.found),
      };
    })
    .filter((item): item is Signal => Boolean(item?.keyword));
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
    .select("id, name, industry")
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

  const { data: snapshots } = await supabase
    .from("competitor_website_snapshots")
    .select(
      "id, competitor_id, website_url, status, http_status, title, meta_description, word_count, service_signals_json, trust_signals_json, content_score, error_message, created_at"
    )
    .eq("brand_id", brand.id)
    .order("created_at", { ascending: false });

  const latestSnapshotByCompetitorId = new Map<string, NonNullable<typeof snapshots>[number]>();

  (snapshots ?? []).forEach((snapshot) => {
    if (!latestSnapshotByCompetitorId.has(snapshot.competitor_id)) {
      latestSnapshotByCompetitorId.set(snapshot.competitor_id, snapshot);
    }
  });

  const analyzedCompetitorCount = latestSnapshotByCompetitorId.size;

  const averageCompetitorScore =
    analyzedCompetitorCount > 0
      ? Math.round(
          Array.from(latestSnapshotByCompetitorId.values()).reduce(
            (sum, snapshot) => sum + Number(snapshot.content_score ?? 0),
            0
          ) / analyzedCompetitorCount
        )
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Rakip Website Analizi"
        title={`${brand.name} rakip website karşılaştırması`}
        description="Rakiplerin web sitelerindeki temel içerik, hizmet ve güven sinyallerini analiz et. Bu bölüm rapordaki rakip kıyasını güçlendirir."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/dashboard/brands/${brand.id}/competitors`}>
                Rakiplere dön
              </Link>
            </Button>

            <Button asChild variant="outline">
              <Link href={`/dashboard/brands/${brand.id}/website`}>
                Marka website analizi
              </Link>
            </Button>
          </>
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
          title="Rakip Sayısı"
          description="Kayıtlı rakip"
          value={competitors?.length ?? 0}
        />

        <MetricCard
          title="Analiz Edilen"
          description="Website analizi yapılan rakip"
          value={analyzedCompetitorCount}
        />

        <MetricCard
          title="Ortalama Rakip Skoru"
          description="Website içerik sinyali"
          value={analyzedCompetitorCount > 0 ? `${averageCompetitorScore}/100` : "-"}
        />
      </section>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Rakip Website Kartları</CardTitle>
          <CardDescription>
            Her rakip için website analizi başlatabilir ve son sonucu
            görebilirsin.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {competitors && competitors.length > 0 ? (
            <div className="space-y-4">
              {competitors.map((competitor) => {
                const snapshot = latestSnapshotByCompetitorId.get(competitor.id);

                const serviceSignals = snapshot
                  ? toSignalArray(snapshot.service_signals_json)
                  : [];

                const trustSignals = snapshot
                  ? toSignalArray(snapshot.trust_signals_json)
                  : [];

                const foundServiceSignals = serviceSignals.filter(
                  (signal) => signal.found
                );

                const foundTrustSignals = trustSignals.filter(
                  (signal) => signal.found
                );

                return (
                  <div
                    key={competitor.id}
                    className="rounded-xl border p-4 transition-colors hover:bg-muted/30"
                  >
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{competitor.name}</p>

                          {snapshot ? (
                            <Badge
                              variant={
                                snapshot.status === "completed"
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {snapshot.status === "completed"
                                ? "Analiz edildi"
                                : "Hatalı"}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Analiz yok</Badge>
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
                            Website URL yok
                          </p>
                        )}

                        {competitor.description ? (
                          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                            {competitor.description}
                          </p>
                        ) : null}
                      </div>

                      <form
                        action={`/api/competitors/${competitor.id}/website-analysis`}
                        method="post"
                      >
                        <Button
                          type="submit"
                          variant="outline"
                          disabled={!competitor.website_url}
                        >
                          Website analiz et
                        </Button>
                      </form>
                    </div>

                    {snapshot ? (
                      <div className="mt-4 space-y-4 border-t pt-4">
                        <section className="grid gap-4 md:grid-cols-4">
                          <div className="rounded-xl border bg-muted/20 p-4">
                            <p className="text-sm text-muted-foreground">
                              Website Skoru
                            </p>
                            <p className="mt-1 text-2xl font-semibold">
                              {Math.round(Number(snapshot.content_score ?? 0))}
                              /100
                            </p>
                          </div>

                          <div className="rounded-xl border bg-muted/20 p-4">
                            <p className="text-sm text-muted-foreground">
                              Kelime Sayısı
                            </p>
                            <p className="mt-1 text-2xl font-semibold">
                              {snapshot.word_count ?? 0}
                            </p>
                          </div>

                          <div className="rounded-xl border bg-muted/20 p-4">
                            <p className="text-sm text-muted-foreground">
                              Hizmet Sinyali
                            </p>
                            <p className="mt-1 text-2xl font-semibold">
                              {foundServiceSignals.length}
                            </p>
                          </div>

                          <div className="rounded-xl border bg-muted/20 p-4">
                            <p className="text-sm text-muted-foreground">
                              Güven Sinyali
                            </p>
                            <p className="mt-1 text-2xl font-semibold">
                              {foundTrustSignals.length}
                            </p>
                          </div>
                        </section>

                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="rounded-xl border p-4">
                            <p className="text-sm font-medium">
                              Bulunan sektör / hizmet sinyalleri
                            </p>

                            {foundServiceSignals.length > 0 ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {foundServiceSignals.map((signal) => (
                                  <Badge key={signal.keyword} variant="secondary">
                                    {signal.keyword}: {signal.count}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-2 text-sm text-muted-foreground">
                                Hizmet sinyali tespit edilemedi.
                              </p>
                            )}
                          </div>

                          <div className="rounded-xl border p-4">
                            <p className="text-sm font-medium">
                              Bulunan güven sinyalleri
                            </p>

                            {foundTrustSignals.length > 0 ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {foundTrustSignals.map((signal) => (
                                  <Badge key={signal.keyword} variant="secondary">
                                    {signal.keyword}: {signal.count}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-2 text-sm text-muted-foreground">
                                Güven sinyali tespit edilemedi.
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="rounded-xl border bg-background p-4">
                          <p className="text-sm font-medium">Son analiz</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {formatDate(snapshot.created_at)}
                          </p>

                          {snapshot.error_message ? (
                            <p className="mt-2 text-sm text-destructive">
                              {snapshot.error_message}
                            </p>
                          ) : null}

                          {snapshot.title ? (
                            <p className="mt-2 text-sm text-muted-foreground">
                              Title: {snapshot.title}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="Henüz rakip yok"
              description="Rakip website analizi yapabilmek için önce rakip eklemelisin."
              action={
                <Button asChild>
                  <Link href={`/dashboard/brands/${brand.id}/competitors`}>
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