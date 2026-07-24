import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type WebsiteAnalysisSummaryProps = {
  categoryScoresValue: unknown;
  technicalSignalsValue: unknown;
  headingsValue: unknown;
  serviceSignalsValue: unknown;
  trustSignalsValue: unknown;
  title: string | null;
  metaDescription: string | null;
  wordCount: number | null;
};

type Issue = {
  title: string;
  description: string;
  priority: "Yüksek" | "Orta" | "Düşük";
};

type Strength = {
  title: string;
  description: string;
};

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function getNumber(record: Record<string, unknown>, key: string) {
  const value = Number(record[key] ?? 0);

  return Number.isFinite(value) ? Math.round(value) : 0;
}

function getBoolean(record: Record<string, unknown>, key: string) {
  return Boolean(record[key]);
}

function getStringArray(record: Record<string, unknown>, key: string) {
  const value = record[key];

  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .slice(0, 20);
}

function getArrayLength(record: Record<string, unknown>, key: string) {
  const value = record[key];

  return Array.isArray(value) ? value.length : 0;
}

function countFoundSignals(value: unknown) {
  if (!Array.isArray(value)) return 0;

  return value.filter((item) => {
    if (!item || typeof item !== "object") return false;

    return Boolean((item as Record<string, unknown>).found);
  }).length;
}

function getScoreLabel(score: number) {
  if (score >= 80) return "Güçlü";
  if (score >= 60) return "İyi";
  if (score >= 40) return "Geliştirilmeli";

  return "Zayıf";
}

function getScoreColor(score: number) {
  if (score >= 80) {
    return {
      text: "text-emerald-700",
      bar: "bg-emerald-500",
    };
  }

  if (score >= 60) {
    return {
      text: "text-blue-700",
      bar: "bg-blue-500",
    };
  }

  if (score >= 40) {
    return {
      text: "text-amber-700",
      bar: "bg-amber-500",
    };
  }

  return {
    text: "text-destructive",
    bar: "bg-destructive",
  };
}

function getPriorityVariant(priority: Issue["priority"]) {
  if (priority === "Yüksek") return "destructive" as const;
  if (priority === "Orta") return "secondary" as const;

  return "outline" as const;
}

export function WebsiteAnalysisSummary({
  categoryScoresValue,
  technicalSignalsValue,
  headingsValue,
  serviceSignalsValue,
  trustSignalsValue,
  title,
  metaDescription,
  wordCount,
}: WebsiteAnalysisSummaryProps) {
  const scores = toRecord(categoryScoresValue);
  const technicalSignals = toRecord(technicalSignalsValue);
  const headings = toRecord(headingsValue);

  const technicalScore = getNumber(scores, "technical");
  const structureScore = getNumber(scores, "structure");
  const contentScore = getNumber(scores, "content");
  const trustScore = getNumber(scores, "trust");
  const overallScore = getNumber(scores, "overall");

  const h1Count = getArrayLength(headings, "h1");
  const h2Count = getArrayLength(headings, "h2");

  const imageCount = getNumber(technicalSignals, "imageCount");
  const imageAltCoverage = getNumber(
    technicalSignals,
    "imageAltCoverage"
  );

  const internalLinkCount = getNumber(
    technicalSignals,
    "internalLinkCount"
  );

  const schemaTypes = getStringArray(
    technicalSignals,
    "schemaTypes"
  );

  const foundServiceCount = countFoundSignals(
    serviceSignalsValue
  );

  const foundTrustCount = countFoundSignals(
    trustSignalsValue
  );

  const issues: Issue[] = [];

  if (!getBoolean(technicalSignals, "indexable")) {
    issues.push({
      title: "İndekslenebilirlik sinyali sorunlu",
      description:
        "Sayfada arama motorlarının indekslemesini engelleyebilecek bir noindex sinyali bulunuyor.",
      priority: "Yüksek",
    });
  }

  if (!getBoolean(technicalSignals, "isHttps")) {
    issues.push({
      title: "Güvenli bağlantı kullanılmıyor",
      description:
        "Web sitesinin HTTPS üzerinden çalışması güven ve teknik kalite açısından önemlidir.",
      priority: "Yüksek",
    });
  }

  if (!title || !metaDescription) {
    issues.push({
      title: "Sayfa başlığı veya açıklaması eksik",
      description:
        "Ana sayfada açıklayıcı bir sayfa başlığı ve meta açıklaması kullanılmalıdır.",
      priority: "Yüksek",
    });
  }

  if (h1Count !== 1) {
    issues.push({
      title: "Ana başlık yapısı düzeltilmeli",
      description:
        h1Count === 0
          ? "Ana sayfada H1 seviyesinde bir ana başlık bulunamadı."
          : `Ana sayfada ${h1Count} adet H1 bulunuyor. Genellikle tek bir ana H1 kullanılması daha anlaşılırdır.`,
      priority: "Yüksek",
    });
  }

  if (
    !getBoolean(technicalSignals, "hasContactLink") ||
    !getBoolean(technicalSignals, "hasAboutLink")
  ) {
    issues.push({
      title: "Güven sayfaları yeterince görünür değil",
      description:
        "İletişim ve hakkımızda sayfalarına ana sayfadan anlaşılır bağlantılar verilmelidir.",
      priority: "Orta",
    });
  }

  if (!getBoolean(technicalSignals, "canonicalUrl")) {
    issues.push({
      title: "Canonical adresi bulunamadı",
      description:
        "Sayfanın tercih edilen adresini belirten canonical etiketi eklenmelidir.",
      priority: "Orta",
    });
  }

  if (imageCount > 0 && imageAltCoverage < 80) {
    issues.push({
      title: "Görsel açıklamaları eksik",
      description: `Görsellerin yaklaşık %${imageAltCoverage} kadarı açıklayıcı alt metne sahip.`,
      priority: "Orta",
    });
  }

  if (schemaTypes.length === 0) {
    issues.push({
      title: "Yapısal veri bulunamadı",
      description:
        "Marka, kurum, hizmet veya ürün bilgilerini açıklayan JSON-LD yapısal verileri eklenebilir.",
      priority: "Orta",
    });
  }

  if (internalLinkCount < 3) {
    issues.push({
      title: "Site içi bağlantılar zayıf",
      description:
        "Ana sayfadan önemli hizmet, ürün ve bilgi sayfalarına daha fazla bağlantı verilmelidir.",
      priority: "Orta",
    });
  }

  if ((wordCount ?? 0) < 300) {
    issues.push({
      title: "Ana sayfa içeriği sınırlı",
      description:
        "Markanın hizmetlerini, hedef kitlesini ve güçlü yönlerini açıklayan içerik artırılabilir.",
      priority: "Düşük",
    });
  }

  if (!getBoolean(technicalSignals, "hasOpenGraph")) {
    issues.push({
      title: "Sosyal paylaşım bilgileri eksik",
      description:
        "Sosyal medyada düzgün görünüm için Open Graph başlık, açıklama ve görsel bilgileri eklenebilir.",
      priority: "Düşük",
    });
  }

  const priorityOrder = {
    Yüksek: 3,
    Orta: 2,
    Düşük: 1,
  };

  const importantIssues = issues
    .sort(
      (first, second) =>
        priorityOrder[second.priority] -
        priorityOrder[first.priority]
    )
    .slice(0, 5);

  const strengths: Strength[] = [];

  if (technicalScore >= 70) {
    strengths.push({
      title: "Teknik temel güçlü",
      description:
        "Sayfanın temel teknik sinyalleri iyi durumda.",
    });
  }

  if (structureScore >= 70) {
    strengths.push({
      title: "Sayfa yapısı anlaşılır",
      description:
        "Başlıklar, açıklamalar ve sayfa düzeni genel olarak yeterli.",
    });
  }

  if (contentScore >= 70) {
    strengths.push({
      title: "İçerik kapsamı güçlü",
      description:
        "Ana sayfa markayı ve sunduğu hizmetleri yeterli seviyede açıklıyor.",
    });
  }

  if (trustScore >= 70) {
    strengths.push({
      title: "Güven sinyalleri güçlü",
      description:
        "Markanın güvenilirliğini destekleyen bilgiler görünür durumda.",
    });
  }

  if (schemaTypes.length > 0) {
    strengths.push({
      title: "Yapısal veri kullanılıyor",
      description: `Tespit edilen türler: ${schemaTypes
        .slice(0, 3)
        .join(", ")}.`,
    });
  }

  if (imageCount > 0 && imageAltCoverage >= 90) {
    strengths.push({
      title: "Görseller açıklanmış",
      description:
        "Görsellerin büyük bölümünde açıklayıcı alt metin bulunuyor.",
    });
  }

  if (
    getBoolean(technicalSignals, "hasContactLink") &&
    getBoolean(technicalSignals, "hasAboutLink")
  ) {
    strengths.push({
      title: "Temel güven sayfaları erişilebilir",
      description:
        "İletişim ve hakkımızda sayfalarına bağlantı bulunuyor.",
    });
  }

  const scoreItems = [
    {
      label: "Teknik",
      score: technicalScore,
    },
    {
      label: "Sayfa yapısı",
      score: structureScore,
    },
    {
      label: "İçerik",
      score: contentScore,
    },
    {
      label: "Güven",
      score: trustScore,
    },
  ];

  const overallColor = getScoreColor(overallScore);

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5 shadow-sm">
        <CardContent className="grid gap-6 pt-6 lg:grid-cols-[240px_1fr] lg:items-center">
          <div className="text-center lg:text-left">
            <p className="text-sm text-muted-foreground">
              Genel web sitesi puanı
            </p>

            <p
              className={`mt-2 text-5xl font-semibold ${overallColor.text}`}
            >
              {overallScore}
              <span className="text-xl text-muted-foreground">
                /100
              </span>
            </p>

            <Badge className="mt-3" variant="secondary">
              {getScoreLabel(overallScore)}
            </Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {scoreItems.map((item) => {
              const color = getScoreColor(item.score);

              return (
                <div
                  key={item.label}
                  className="rounded-xl border bg-background p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">
                      {item.label}
                    </p>

                    <p className={`font-semibold ${color.text}`}>
                      {item.score}/100
                    </p>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${color.bar}`}
                      style={{
                        width: `${item.score}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Öncelikli iyileştirmeler</CardTitle>
            <CardDescription>
              Önce ele alınması gereken en önemli konular.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {importantIssues.length > 0 ? (
              <div className="space-y-3">
                {importantIssues.map((issue, index) => (
                  <div
                    key={issue.title}
                    className="rounded-xl border p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">
                        {index + 1}
                      </Badge>

                      <Badge
                        variant={getPriorityVariant(issue.priority)}
                      >
                        {issue.priority} öncelik
                      </Badge>
                    </div>

                    <p className="mt-3 font-medium">
                      {issue.title}
                    </p>

                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {issue.description}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                Kritik bir iyileştirme alanı bulunamadı.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Güçlü yönler</CardTitle>
            <CardDescription>
              Korunması gereken olumlu sinyaller.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {strengths.length > 0 ? (
              <div className="space-y-3">
                {strengths.slice(0, 4).map((strength) => (
                  <div
                    key={strength.title}
                    className="rounded-xl border bg-muted/20 p-4"
                  >
                    <p className="font-medium">
                      {strength.title}
                    </p>

                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {strength.description}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                Belirgin güçlü sinyaller henüz tespit edilmedi.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Kısa içerik özeti</CardTitle>
          <CardDescription>
            Ana sayfadan çıkarılan temel bilgiler.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">
              Kelime sayısı
            </p>
            <p className="mt-1 text-xl font-semibold">
              {wordCount ?? 0}
            </p>
          </div>

          <div className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">
              Başlık yapısı
            </p>
            <p className="mt-1 font-medium">
              {h1Count} ana başlık, {h2Count} bölüm başlığı
            </p>
          </div>

          <div className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">
              Bulunan sinyaller
            </p>
            <p className="mt-1 font-medium">
              {foundServiceCount} hizmet, {foundTrustCount} güven
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}