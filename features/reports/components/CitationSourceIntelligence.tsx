import { ExternalLink, Link2, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  buildCitationIntelligence,
  type CitationCompetitorInput,
  type CitationRunInput,
  type CitationSourceCategory,
} from "@/lib/reports/citation-sources";
import { getIntentLabel } from "@/lib/ui/labels";

type CitationSourceIntelligenceProps = {
  brandName: string;
  brandWebsiteUrl: string | null;
  competitors: CitationCompetitorInput[];
  runs: CitationRunInput[];
  variant?: "dashboard" | "client";
};

function getCategoryLabel(category: CitationSourceCategory) {
  if (category === "brand") return "Marka kaynağı";
  if (category === "competitor") return "Rakip kaynağı";

  return "Dış kaynak";
}

function getCategoryClass(
  category: CitationSourceCategory,
  variant: "dashboard" | "client"
) {
  if (variant === "client") {
    if (category === "brand") {
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    }

    if (category === "competitor") {
      return "bg-rose-50 text-rose-700 ring-rose-200";
    }

    return "bg-slate-100 text-slate-700 ring-slate-200";
  }

  if (category === "brand") {
    return "bg-emerald-500/10 text-emerald-700 ring-emerald-500/30";
  }

  if (category === "competitor") {
    return "bg-destructive/10 text-destructive ring-destructive/30";
  }

  return "bg-muted text-muted-foreground ring-border";
}

function getAction({
  brandName,
  brandCitationRate,
  citationGapCount,
}: {
  brandName: string;
  brandCitationRate: number;
  citationGapCount: number;
}) {
  if (brandCitationRate === 0) {
    return {
      title: `${brandName} henüz kaynak olarak seçilmiyor`,
      description:
        "AI cevaplarında başka alan adları kullanılıyor ancak marka sitesi kaynaklar arasında görünmüyor. Öncelik; açık istatistikler, uzman görüşleri, karşılaştırmalar, güncel kategori rehberleri ve doğrudan alıntılanabilir kısa cevaplar üretmek olmalıdır.",
    };
  }

  if (brandCitationRate < 30) {
    return {
      title: "Marka kaynak görünürlüğü sınırlı",
      description: `${citationGapCount} kaynaklı soruda marka sitesi kullanılmadı. Bu soruların niyetlerine karşılık gelen sayfalarda özgün veri, net ürün veya hizmet açıklamaları ve doğrulanabilir güven unsurları güçlendirilmelidir.`,
    };
  }

  return {
    title: "Kaynak görünürlüğünü koruyun ve genişletin",
    description:
      "Marka sitesi bazı cevaplarda kaynak olarak kullanılıyor. Sonraki hedef, bu görünürlüğü daha fazla satın alma, karşılaştırma ve güven sorusuna yaymak; tek bir sayfaya bağımlı kalmadan kaynak olabilen içerik sayısını artırmaktır.",
  };
}

export function CitationSourceIntelligence({
  brandName,
  brandWebsiteUrl,
  competitors,
  runs,
  variant = "dashboard",
}: CitationSourceIntelligenceProps) {
  const intelligence = buildCitationIntelligence({
    runs,
    brandWebsiteUrl,
    competitors,
  });

  if (!intelligence.measured) {
    if (variant === "client") {
      return (
        <section className="print:break-inside-avoid">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
              Ek analiz · Kaynaklar
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              Kaynak ve atıf zekâsı
            </h2>
          </div>

          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <p className="font-semibold text-amber-950">
              Kaynak ölçümü yapılmadı
            </p>
            <p className="mt-2 text-sm leading-6 text-amber-800">
              Bu ölçüm web araması etkinleştirilmeden oluşturulduğu için AI
              cevabında kullanılan kaynaklar ve marka sitesinin atıf oranı
              değerlendirilemedi. Bu durum sıfır kaynak başarısı anlamına
              gelmez.
            </p>
          </div>
        </section>
      );
    }

    return (
      <Card className="border-amber-500/30 shadow-sm">
        <CardHeader>
          <CardTitle>Kaynak ve atıf zekâsı</CardTitle>
          <CardDescription>
            Bu ölçüm web araması kullanılmadan oluşturulduğu için kaynak
            görünürlüğü değerlendirilmedi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm leading-6 text-muted-foreground">
            Kaynak verisi bulunmaması başarısızlık değildir. Yeni bir ölçümde
            Gemini grounding açıldığında kullanılan alan adları, marka kaynak
            oranı ve kaynak fırsatları burada gösterilir.
          </p>
        </CardContent>
      </Card>
    );
  }

  const action = getAction({
    brandName,
    brandCitationRate: intelligence.brandCitationRate,
    citationGapCount: intelligence.citationGaps.length,
  });

  const metricItems = [
    {
      label: "Web kaynaklı soru",
      value: intelligence.groundedPromptCount,
      helper: "Kaynak ölçümüne dahil edilen soru",
    },
    {
      label: "Kaynak içeren cevap",
      value: `${intelligence.sourcedPromptCount}/${intelligence.groundedPromptCount}`,
      helper: `%${intelligence.sourceUsageRate} kaynak kullanım oranı`,
    },
    {
      label: "Marka sitesi kaynak",
      value: `${intelligence.brandCitedPromptCount}/${intelligence.groundedPromptCount}`,
      helper: `%${intelligence.brandCitationRate} marka kaynak oranı`,
    },
    {
      label: "Benzersiz alan adı",
      value: intelligence.uniqueSourceCount,
      helper: "AI cevaplarında kullanılan farklı kaynak",
    },
  ];

  const metricClass =
    variant === "client"
      ? "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
      : "rounded-xl border bg-muted/20 p-4";

  const mutedTextClass =
    variant === "client" ? "text-slate-500" : "text-muted-foreground";

  const bodyTextClass =
    variant === "client" ? "text-slate-600" : "text-muted-foreground";

  const sourceBorderClass =
    variant === "client"
      ? "border-slate-200 bg-white"
      : "border-border bg-background";

  const content = (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metricItems.map((item) => (
          <div className={metricClass} key={item.label}>
            <p className={`text-sm ${mutedTextClass}`}>{item.label}</p>
            <p
              className={`mt-2 text-2xl font-semibold ${
                variant === "client" ? "text-slate-950" : ""
              }`}
            >
              {item.value}
            </p>
            <p className={`mt-1 text-xs leading-5 ${mutedTextClass}`}>
              {item.helper}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className={`rounded-2xl border p-5 ${sourceBorderClass}`}>
          <div className="flex items-center gap-2">
            <Link2
              aria-hidden="true"
              className={
                variant === "client"
                  ? "size-4 text-indigo-600"
                  : "size-4 text-primary"
              }
            />
            <h3
              className={`font-semibold ${
                variant === "client" ? "text-slate-950" : ""
              }`}
            >
              En çok kullanılan kaynaklar
            </h3>
          </div>

          {intelligence.topSources.length > 0 ? (
            <div className="mt-4 space-y-3">
              {intelligence.topSources.map((source, index) => (
                <div
                  className={`rounded-xl border p-3 ${sourceBorderClass}`}
                  key={source.hostname}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs ${mutedTextClass}`}>
                          {index + 1}.
                        </span>

                        {source.sampleUri ? (
                          <a
                            className={`inline-flex min-w-0 items-center gap-1 font-medium underline-offset-4 hover:underline ${
                              variant === "client"
                                ? "text-slate-950"
                                : ""
                            }`}
                            href={source.sampleUri}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <span className="truncate">{source.hostname}</span>
                            <ExternalLink
                              aria-hidden="true"
                              className="size-3 shrink-0"
                            />
                          </a>
                        ) : (
                          <span className="font-medium">
                            {source.hostname}
                          </span>
                        )}
                      </div>

                      {source.competitorName ? (
                        <p className={`mt-1 text-xs ${mutedTextClass}`}>
                          {source.competitorName}
                        </p>
                      ) : null}
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${getCategoryClass(
                        source.category,
                        variant
                      )}`}
                    >
                      {getCategoryLabel(source.category)}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className={`text-xs ${mutedTextClass}`}>
                      {source.promptCount} soruda · {source.usageCount} kullanım
                    </p>
                    <strong
                      className={`text-sm ${
                        variant === "client" ? "text-slate-950" : ""
                      }`}
                    >
                      %{source.coverageRate}
                    </strong>
                  </div>

                  <div
                    className={`mt-2 h-1.5 overflow-hidden rounded-full ${
                      variant === "client" ? "bg-slate-100" : "bg-muted"
                    }`}
                  >
                    <div
                      className={
                        source.category === "brand"
                          ? "h-full rounded-full bg-emerald-500"
                          : source.category === "competitor"
                            ? "h-full rounded-full bg-rose-500"
                            : "h-full rounded-full bg-blue-500"
                      }
                      style={{ width: `${source.coverageRate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={`mt-4 text-sm leading-6 ${bodyTextClass}`}>
              Kaynak ölçümü açık olmasına rağmen ayrıştırılabilir bir alan adı
              bulunamadı.
            </p>
          )}
        </div>

        <div className={`rounded-2xl border p-5 ${sourceBorderClass}`}>
          <div className="flex items-center gap-2">
            <Target
              aria-hidden="true"
              className={
                variant === "client"
                  ? "size-4 text-rose-600"
                  : "size-4 text-destructive"
              }
            />
            <h3
              className={`font-semibold ${
                variant === "client" ? "text-slate-950" : ""
              }`}
            >
              Marka kaynağı fırsatları
            </h3>
          </div>

          {intelligence.citationGaps.length > 0 ? (
            <div className="mt-4 space-y-3">
              {intelligence.citationGaps.map((gap) => (
                <div
                  className={`rounded-xl border p-4 ${sourceBorderClass}`}
                  key={gap.id}
                >
                  <div className="flex flex-wrap gap-2">
                    {gap.promptIntent ? (
                      variant === "client" ? (
                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200">
                          {getIntentLabel(gap.promptIntent)}
                        </span>
                      ) : (
                        <Badge variant="outline">
                          {getIntentLabel(gap.promptIntent)}
                        </Badge>
                      )
                    ) : null}

                    {variant === "client" ? (
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
                          gap.brandMentioned
                            ? "bg-amber-50 text-amber-700 ring-amber-200"
                            : "bg-rose-50 text-rose-700 ring-rose-200"
                        }`}
                      >
                        {gap.brandMentioned
                          ? "Marka var, kaynak değil"
                          : "Marka görünmüyor"}
                      </span>
                    ) : (
                      <Badge
                        variant={
                          gap.brandMentioned ? "secondary" : "destructive"
                        }
                      >
                        {gap.brandMentioned
                          ? "Marka var, kaynak değil"
                          : "Marka görünmüyor"}
                      </Badge>
                    )}
                  </div>

                  <p
                    className={`mt-3 text-sm font-medium leading-6 ${
                      variant === "client" ? "text-slate-950" : ""
                    }`}
                  >
                    {gap.promptText}
                  </p>

                  {gap.sourceHostnames.length > 0 ? (
                    <p className={`mt-2 text-xs leading-5 ${mutedTextClass}`}>
                      Kullanılan kaynaklar: {gap.sourceHostnames.join(", ")}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className={`mt-4 text-sm leading-6 ${bodyTextClass}`}>
              Kaynak içeren cevaplarda belirgin bir marka kaynağı açığı
              bulunmadı.
            </p>
          )}
        </div>
      </div>

      <div
        className={`mt-5 rounded-2xl border p-5 ${
          variant === "client"
            ? "border-indigo-200 bg-gradient-to-r from-indigo-50 to-cyan-50"
            : "border-primary/20 bg-primary/5"
        }`}
      >
        <p
          className={`font-semibold ${
            variant === "client" ? "text-slate-950" : ""
          }`}
        >
          {action.title}
        </p>
        <p className={`mt-2 text-sm leading-6 ${bodyTextClass}`}>
          {action.description}
        </p>

        {intelligence.brandMentionedWithoutCitationCount > 0 ? (
          <p
            className={`mt-3 text-xs font-medium ${
              variant === "client" ? "text-indigo-700" : "text-primary"
            }`}
          >
            {intelligence.brandMentionedWithoutCitationCount} soruda marka
            cevapta geçti ancak marka sitesi kaynak olarak kullanılmadı.
          </p>
        ) : null}
      </div>

      <p className={`mt-4 text-xs leading-5 ${mutedTextClass}`}>
        Kaynak oranları yalnızca web araması etkin olan sorular üzerinden
        hesaplanır. Kaynak olarak görünmek, AI cevabında tavsiye edilme garantisi
        değildir; ölçüm anındaki kaynak tercihlerini gösterir.
      </p>
    </>
  );

  if (variant === "client") {
    return (
      <section className="print:break-after-page">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
            03 - Kaynak Zekâsı
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
            AI cevapları hangi kaynakları kullanıyor?
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Marka sitesinin kaynak olarak kullanılma oranını, en sık seçilen
            alan adlarını ve marka kaynağının eksik kaldığı soruları gösterir.
          </p>
        </div>

        {content}
      </section>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Kaynak ve atıf zekâsı</CardTitle>
        <CardDescription>
          AI cevaplarında kullanılan alan adları, marka sitesi kaynak oranı ve
          kaynak kazanım fırsatları.
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}