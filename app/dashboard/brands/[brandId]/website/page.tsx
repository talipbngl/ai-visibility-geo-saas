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

type WebsiteAnalysisPageProps = {
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

type HeadingsJson = {
  h1?: string[];
  h2?: string[];
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

function toHeadings(value: unknown): HeadingsJson {
  if (!value || typeof value !== "object") {
    return {
      h1: [],
      h2: [],
    };
  }

  const headings = value as HeadingsJson;

  return {
    h1: Array.isArray(headings.h1) ? headings.h1 : [],
    h2: Array.isArray(headings.h2) ? headings.h2 : [],
  };
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
      "id, website_url, status, http_status, title, meta_description, headings_json, word_count, service_signals_json, trust_signals_json, content_score, error_message, created_at"
    )
    .eq("brand_id", brand.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const latestSnapshot = snapshots?.[0] ?? null;

  const serviceSignals = latestSnapshot
    ? toSignalArray(latestSnapshot.service_signals_json)
    : [];

  const trustSignals = latestSnapshot
    ? toSignalArray(latestSnapshot.trust_signals_json)
    : [];

  const headings = latestSnapshot
    ? toHeadings(latestSnapshot.headings_json)
    : { h1: [], h2: [] };

  const foundServiceSignals = serviceSignals.filter((signal) => signal.found);
  const foundTrustSignals = trustSignals.filter((signal) => signal.found);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Website Analizi"
        title={`${brand.name} website sinyalleri`}
        description="Bu ekran markanın web sitesindeki temel içerik, hizmet ve güven sinyallerini analiz eder. Şimdilik ana sayfa odaklıdır."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/dashboard/brands/${brand.id}`}>
                Marka detayına dön
              </Link>
            </Button>

            <form action={`/api/brands/${brand.id}/website-analysis`} method="post">
              <Button type="submit">Website analiz et</Button>
            </form>
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

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="İçerik Skoru"
          description="Basit website sinyal skoru"
          value={
            latestSnapshot
              ? `${Math.round(Number(latestSnapshot.content_score))}/100`
              : "-"
          }
        />

        <MetricCard
          title="Kelime Sayısı"
          description="Ana sayfadan çıkarılan metin"
          value={latestSnapshot?.word_count ?? "-"}
        />

        <MetricCard
          title="Hizmet Sinyali"
          description="Tespit edilen hizmet kelimesi"
          value={foundServiceSignals.length}
        />

        <MetricCard
          title="Güven Sinyali"
          description="Tespit edilen güven kelimesi"
          value={foundTrustSignals.length}
        />
      </section>

      {latestSnapshot ? (
        <>
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                  <CardTitle>Son Website Analizi</CardTitle>
                  <CardDescription>
                    Analiz tarihi: {formatDate(latestSnapshot.created_at)}
                  </CardDescription>
                </div>

                <Badge
                  variant={
                    latestSnapshot.status === "completed"
                      ? "default"
                      : "destructive"
                  }
                >
                  {latestSnapshot.status === "completed"
                    ? "Tamamlandı"
                    : "Hatalı"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="text-sm text-muted-foreground">URL</p>
                <a
                  href={latestSnapshot.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block break-all text-sm font-medium underline underline-offset-4"
                >
                  {latestSnapshot.website_url}
                </a>
              </div>

              {latestSnapshot.error_message ? (
                <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                  {latestSnapshot.error_message}
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border p-4">
                  <p className="text-sm font-medium">Title</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {latestSnapshot.title || "-"}
                  </p>
                </div>

                <div className="rounded-xl border p-4">
                  <p className="text-sm font-medium">Meta Description</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {latestSnapshot.meta_description || "-"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <section className="grid gap-6 lg:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Sektör / Hizmet Sinyalleri</CardTitle>
                <CardDescription>
                  Markanın sektörüne göre ana sayfa metninde aranan önemli kelimeler.
                </CardDescription>
              </CardHeader>

              <CardContent>
                {serviceSignals.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {serviceSignals.map((signal) => (
                      <Badge
                        key={signal.keyword}
                        variant={signal.found ? "default" : "outline"}
                      >
                        {signal.keyword}: {signal.count}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="Hizmet sinyali yok"
                    description="Website analizi henüz hizmet sinyali üretmedi."
                  />
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Güven Sinyalleri</CardTitle>
                <CardDescription>
                  Doktor, yorum, randevu, iletişim gibi güven işaretleri.
                </CardDescription>
              </CardHeader>

              <CardContent>
                {trustSignals.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {trustSignals.map((signal) => (
                      <Badge
                        key={signal.keyword}
                        variant={signal.found ? "secondary" : "outline"}
                      >
                        {signal.keyword}: {signal.count}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="Güven sinyali yok"
                    description="Website analizi henüz güven sinyali üretmedi."
                  />
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>H1 Başlıkları</CardTitle>
                <CardDescription>
                  Sayfanın en önemli ana başlık sinyalleri.
                </CardDescription>
              </CardHeader>

              <CardContent>
                {headings.h1 && headings.h1.length > 0 ? (
                  <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                    {headings.h1.map((heading, index) => (
                      <li key={`${heading}-${index}`}>{heading}</li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    title="H1 bulunamadı"
                    description="Ana sayfada belirgin H1 başlığı tespit edilemedi."
                  />
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>H2 Başlıkları</CardTitle>
                <CardDescription>
                  Sayfadaki bölüm başlıkları.
                </CardDescription>
              </CardHeader>

              <CardContent>
                {headings.h2 && headings.h2.length > 0 ? (
                  <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                    {headings.h2.map((heading, index) => (
                      <li key={`${heading}-${index}`}>{heading}</li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    title="H2 bulunamadı"
                    description="Ana sayfada H2 başlığı tespit edilemedi."
                  />
                )}
              </CardContent>
            </Card>
          </section>

          {snapshots && snapshots.length > 1 ? (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Önceki Analizler</CardTitle>
                <CardDescription>
                  Son 5 website analizi kaydı.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                {snapshots.map((snapshot) => (
                  <div
                    key={snapshot.id}
                    className="flex flex-col justify-between gap-3 rounded-xl border p-4 md:flex-row md:items-center"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {formatDate(snapshot.created_at)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Skor: {Math.round(Number(snapshot.content_score))}/100
                      </p>
                    </div>

                    <Badge
                      variant={
                        snapshot.status === "completed"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {snapshot.status === "completed" ? "Tamamlandı" : "Hatalı"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : (
        <EmptyState
          title="Henüz website analizi yok"
          description="Website analiz et butonuna basarak markanın ana sayfasındaki içerik sinyallerini çıkar."
          action={
            <form action={`/api/brands/${brand.id}/website-analysis`} method="post">
              <Button type="submit">Website analiz et</Button>
            </form>
          }
        />
      )}
    </div>
  );
}