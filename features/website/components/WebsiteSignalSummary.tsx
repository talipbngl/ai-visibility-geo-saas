import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MetricCard } from "@/features/ui/components";

type Signal = {
  keyword: string;
  count: number;
  found: boolean;
};

type WebsiteSnapshot = {
  id: string;
  website_url: string;
  title: string | null;
  meta_description: string | null;
  word_count: number | null;
  content_score: number | null;
  service_signals_json: unknown;
  trust_signals_json: unknown;
  created_at: string | null;
};

type WebsiteSignalSummaryProps = {
  brandId: string;
  brandName: string;
  snapshot: WebsiteSnapshot | null;
};

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

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getScoreLabel(score: number) {
  if (score >= 75) return "Güçlü";
  if (score >= 50) return "Orta";
  if (score >= 25) return "Zayıf";

  return "Çok zayıf";
}

function getScoreComment(score: number, brandName: string) {
  if (score >= 75) {
    return `${brandName} web sitesinde temel içerik ve güven sinyalleri güçlü görünüyor. Bu durum AI cevaplarında marka bağlamının anlaşılmasını destekleyebilir.`;
  }

  if (score >= 50) {
    return `${brandName} web sitesinde bazı içerik sinyalleri var ancak hizmet ve güven sinyalleri daha net hale getirilebilir.`;
  }

  if (score >= 25) {
    return `${brandName} web sitesindeki içerik sinyalleri sınırlı görünüyor. Hizmet sayfaları, açıklayıcı başlıklar, SSS ve güven unsurları güçlendirilmeli.`;
  }

  return `${brandName} web sitesinden yeterli içerik sinyali alınamadı. Site yapısı, ana sayfa metinleri, hizmet başlıkları ve güven unsurları ayrıca kontrol edilmeli.`;
}

export function WebsiteSignalSummary({
  brandId,
  brandName,
  snapshot,
}: WebsiteSignalSummaryProps) {
  if (!snapshot) {
    return (
      <Card className="border-dashed shadow-sm">
        <CardHeader>
          <CardTitle>Website Sinyalleri</CardTitle>
          <CardDescription>
            Bu rapora bağlı website analizi henüz yapılmamış.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Marka görünürlüğünün neden güçlü veya zayıf olduğunu daha iyi
            yorumlamak için website analizi yap. Bu analiz ana sayfadaki başlık,
            metin, hizmet kelimeleri ve güven sinyallerini çıkarır.
          </p>

          <Button asChild variant="outline">
            <Link href={`/dashboard/brands/${brandId}/website`}>
              Website analizine git
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const contentScore = Math.round(Number(snapshot.content_score ?? 0));
  const serviceSignals = toSignalArray(snapshot.service_signals_json);
  const trustSignals = toSignalArray(snapshot.trust_signals_json);

  const foundServiceSignals = serviceSignals.filter((signal) => signal.found);
  const missingServiceSignals = serviceSignals.filter((signal) => !signal.found);

  const foundTrustSignals = trustSignals.filter((signal) => signal.found);
  const missingTrustSignals = trustSignals.filter((signal) => !signal.found);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <CardTitle>Website Sinyalleri</CardTitle>
            <CardDescription>
              Bu bölüm markanın web sitesinden alınan temel içerik sinyallerini
              gösterir. Analiz tarihi: {formatDate(snapshot.created_at)}
            </CardDescription>
          </div>

          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/brands/${brandId}/website`}>
              Detaylı website analizi
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard
            title="Website Skoru"
            description="Temel içerik sinyali"
            value={`${contentScore}/100`}
            footer={getScoreLabel(contentScore)}
          />

          <MetricCard
            title="Kelime Sayısı"
            description="Ana sayfa metni"
            value={snapshot.word_count ?? "-"}
          />

          <MetricCard
            title="Bulunan Hizmet Sinyali"
            description="Sektörel kelimeler"
            value={foundServiceSignals.length}
          />

          <MetricCard
            title="Bulunan Güven Sinyali"
            description="Güven unsurları"
            value={foundTrustSignals.length}
          />
        </section>

        <div className="rounded-xl border bg-muted/20 p-4">
          <p className="text-sm font-medium">Yorum</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {getScoreComment(contentScore, brandName)}
          </p>
        </div>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border p-4">
            <p className="text-sm font-medium">Bulunan sektör / hizmet sinyalleri</p>

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
                Sektörel hizmet sinyali tespit edilemedi.
              </p>
            )}
          </div>

          <div className="rounded-xl border p-4">
            <p className="text-sm font-medium">Bulunan güven sinyalleri</p>

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
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-medium text-destructive">
              Eksik görünen hizmet sinyalleri
            </p>

            {missingServiceSignals.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {missingServiceSignals.slice(0, 12).map((signal) => (
                  <Badge key={signal.keyword} variant="outline">
                    {signal.keyword}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Önemli hizmet sinyallerinin çoğu tespit edilmiş.
              </p>
            )}
          </div>

          <div className="rounded-xl border p-4">
            <p className="text-sm font-medium">
              Eksik görünen güven sinyalleri
            </p>

            {missingTrustSignals.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {missingTrustSignals.slice(0, 12).map((signal) => (
                  <Badge key={signal.keyword} variant="outline">
                    {signal.keyword}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Temel güven sinyallerinin çoğu tespit edilmiş.
              </p>
            )}
          </div>
        </section>

        <div className="rounded-xl border bg-background p-4">
          <p className="text-sm font-medium">Metodoloji notu</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Website analizi bu MVP sürümünde ana sayfa HTML’i üzerinden yapılır.
            Site içi tüm sayfalar, Google yorumları, backlinkler veya teknik SEO
            detayları bu analiz kapsamına dahil değildir. Bu nedenle sonuçlar
            kesin SEO teşhisi değil, içerik sinyali ön değerlendirmesidir.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}