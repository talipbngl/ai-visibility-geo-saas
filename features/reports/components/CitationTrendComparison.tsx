import {
  ArrowDownRight,
  ArrowUpRight,
  History,
  Minus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  buildCitationTrendComparison,
  type CitationCompetitorInput,
  type CitationRunInput,
  type CitationSourceCategory,
  type CitationTrendPromptChange,
  type CitationTrendSourceChange,
} from "@/lib/reports/citation-sources";
import { getIntentLabel } from "@/lib/ui/labels";

type CitationTrendComparisonProps = {
  brandName: string;
  brandWebsiteUrl: string | null;
  competitors: CitationCompetitorInput[];
  currentRuns: CitationRunInput[];
  previousRuns: CitationRunInput[];
  previousDate: string | null;
  variant?: "dashboard" | "client";
};

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function getDeltaPresentation(value: number) {
  if (value > 0) {
    return {
      label: `+${value} puan`,
      className: "text-emerald-700",
      icon: ArrowUpRight,
    };
  }

  if (value < 0) {
    return {
      label: `${value} puan`,
      className: "text-rose-700",
      icon: ArrowDownRight,
    };
  }

  return {
    label: "Değişmedi",
    className: "text-slate-600",
    icon: Minus,
  };
}

function getCategoryLabel(category: CitationSourceCategory) {
  if (category === "brand") return "Marka";
  if (category === "competitor") return "Rakip";

  return "Dış kaynak";
}

function getCategoryClass(category: CitationSourceCategory) {
  if (category === "brand") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (category === "competitor") {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function SourceChangeList({
  title,
  description,
  items,
  tone,
}: {
  title: string;
  description: string;
  items: CitationTrendSourceChange[];
  tone: "positive" | "negative";
}) {
  const toneClasses =
    tone === "positive"
      ? "border-emerald-200 bg-emerald-50"
      : "border-rose-200 bg-rose-50";
  const titleClass =
    tone === "positive"
      ? "text-emerald-950"
      : "text-rose-950";
  const descriptionClass =
    tone === "positive"
      ? "text-emerald-700"
      : "text-rose-700";

  return (
    <div className={`rounded-2xl border p-5 ${toneClasses}`}>
      <h4 className={`font-semibold ${titleClass}`}>{title}</h4>
      <p className={`mt-1 text-xs leading-5 ${descriptionClass}`}>
        {description}
      </p>

      {items.length > 0 ? (
        <div className="mt-4 space-y-2">
          {items.map((source) => (
            <div
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/80 bg-white p-3"
              key={source.hostname}
            >
              {source.sampleUri ? (
                <a
                  className="text-sm font-medium text-slate-950 underline-offset-4 hover:underline"
                  href={source.sampleUri}
                  target="_blank"
                  rel="noreferrer"
                >
                  {source.hostname}
                </a>
              ) : (
                <span className="text-sm font-medium text-slate-950">
                  {source.hostname}
                </span>
              )}

              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${getCategoryClass(
                  source.category
                )}`}
              >
                {source.competitorName ??
                  getCategoryLabel(source.category)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className={`mt-4 text-sm ${descriptionClass}`}>
          Bu grupta değişiklik bulunmadı.
        </p>
      )}
    </div>
  );
}

function PromptChangeList({
  title,
  items,
  emptyMessage,
  tone,
}: {
  title: string;
  items: CitationTrendPromptChange[];
  emptyMessage: string;
  tone: "positive" | "negative" | "warning";
}) {
  const toneClasses = {
    positive: "border-emerald-200 bg-emerald-50",
    negative: "border-rose-200 bg-rose-50",
    warning: "border-amber-200 bg-amber-50",
  }[tone];
  const titleClasses = {
    positive: "text-emerald-950",
    negative: "text-rose-950",
    warning: "text-amber-950",
  }[tone];
  const mutedClasses = {
    positive: "text-emerald-700",
    negative: "text-rose-700",
    warning: "text-amber-700",
  }[tone];

  return (
    <div className={`rounded-2xl border p-5 ${toneClasses}`}>
      <h4 className={`font-semibold ${titleClasses}`}>{title}</h4>

      {items.length > 0 ? (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div
              className="rounded-xl border border-white/80 bg-white p-4"
              key={item.id}
            >
              <div className="flex flex-wrap gap-2">
                {item.promptIntent ? (
                  <Badge variant="outline">
                    {getIntentLabel(item.promptIntent)}
                  </Badge>
                ) : null}
              </div>

              <p className="mt-2 text-sm font-medium leading-6 text-slate-950">
                {item.promptText}
              </p>

              {item.currentSourceHostnames.length > 0 ? (
                <p className={`mt-2 text-xs leading-5 ${mutedClasses}`}>
                  Güncel kaynaklar:{" "}
                  {item.currentSourceHostnames.join(", ")}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className={`mt-3 text-sm leading-6 ${mutedClasses}`}>
          {emptyMessage}
        </p>
      )}
    </div>
  );
}

export function CitationTrendComparison({
  brandName,
  brandWebsiteUrl,
  competitors,
  currentRuns,
  previousRuns,
  previousDate,
  variant = "dashboard",
}: CitationTrendComparisonProps) {
  const comparison = buildCitationTrendComparison({
    currentRuns,
    previousRuns,
    brandWebsiteUrl,
    competitors,
  });

  if (!comparison.hasPreviousMeasurement) {
    return null;
  }

  const isClient = variant === "client";

  if (!comparison.comparable) {
    const warning = (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <p className="font-semibold text-amber-950">
          Kaynak değişimi karşılaştırılamadı
        </p>
        <p className="mt-2 text-sm leading-6 text-amber-800">
          İki ölçümde aynı metinle yer alan ve web araması etkin olan ortak
          soru bulunmadı. Bu nedenle kaynak değişimi için varsayımsal bir sonuç
          üretilmedi.
        </p>
      </div>
    );

    if (isClient) {
      return (
        <section className="print:break-inside-avoid">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
              Kaynak değişimi
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              Kaynak görünürlüğü nasıl değişti?
            </h2>
          </div>
          {warning}
        </section>
      );
    }

    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Kaynak görünürlüğü değişimi</CardTitle>
          <CardDescription>
            Güncel ölçüm ile önceki ölçümün kaynak sonuçları.
          </CardDescription>
        </CardHeader>
        <CardContent>{warning}</CardContent>
      </Card>
    );
  }

  const sourceDelta = getDeltaPresentation(
    comparison.sourceUsageDelta
  );
  const brandDelta = getDeltaPresentation(
    comparison.brandCitationDelta
  );
  const SourceDeltaIcon = sourceDelta.icon;
  const BrandDeltaIcon = brandDelta.icon;

  const action =
    comparison.brandCitationDelta > 0
      ? {
          title: "Marka kaynak görünürlüğü gelişti",
          description: `${brandName} sitesi ortak sorularda önceki ölçüme göre daha sık kaynak seçildi. Kazanılan sorulardaki içerik biçimini koruyun ve kalıcı kaynak açıklarına aynı yapıyı uygulayın.`,
        }
      : comparison.brandCitationDelta < 0
        ? {
            title: "Marka kaynak görünürlüğünde kayıp var",
            description:
              "Kaynak kaybedilen sorulardaki sayfaların güncelliğini, doğrudan cevap veren bölümlerini, özgün verilerini ve güven sinyallerini kontrol edin. Kaybolan alan adlarını da inceleyerek kaynak tercihindeki değişimi doğrulayın.",
          }
        : {
            title: "Marka kaynak oranı sabit kaldı",
            description:
              "Oran değişmedi; büyüme için kalıcı kaynak açıklarında kullanılan dış kaynakları inceleyin ve aynı sorulara daha açık, doğrulanabilir ve alıntılanabilir içerikler hazırlayın.",
          };

  const body = (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-sm text-slate-500">Ortak kaynaklı soru</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {comparison.comparablePromptCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            İki ölçümde de web araması açık
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <p className="text-sm text-slate-500">Kaynak kullanım oranı</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="text-2xl font-semibold text-slate-950">
              %{comparison.currentSourceUsageRate}
            </p>
            <span
              className={`inline-flex items-center gap-1 text-sm font-medium ${sourceDelta.className}`}
            >
              <SourceDeltaIcon className="size-4" aria-hidden="true" />
              {sourceDelta.label}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Önceki: %{comparison.previousSourceUsageRate}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <p className="text-sm text-slate-500">Marka kaynak oranı</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="text-2xl font-semibold text-slate-950">
              %{comparison.currentBrandCitationRate}
            </p>
            <span
              className={`inline-flex items-center gap-1 text-sm font-medium ${brandDelta.className}`}
            >
              <BrandDeltaIcon className="size-4" aria-hidden="true" />
              {brandDelta.label}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Önceki: %{comparison.previousBrandCitationRate}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SourceChangeList
          title="Yeni kullanılan kaynaklar"
          description="Önceki ölçümde yokken güncel cevaplarda kullanılan alan adları."
          items={comparison.newSources}
          tone="positive"
        />
        <SourceChangeList
          title="Artık kullanılmayan kaynaklar"
          description="Önceki ölçümde kullanılıp güncel cevaplarda görülmeyen alan adları."
          items={comparison.lostSources}
          tone="negative"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <PromptChangeList
          title="Marka kaynağı kazanılan sorular"
          items={comparison.gainedBrandCitations}
          emptyMessage="Yeni marka kaynağı kazanılan ortak soru bulunmadı."
          tone="positive"
        />
        <PromptChangeList
          title="Marka kaynağı kaybedilen sorular"
          items={comparison.lostBrandCitations}
          emptyMessage="Marka kaynağı kaybedilen ortak soru bulunmadı."
          tone="negative"
        />
        <PromptChangeList
          title="Devam eden kaynak açıkları"
          items={comparison.persistentCitationGaps}
          emptyMessage="İki ölçüm boyunca devam eden belirgin kaynak açığı bulunmadı."
          tone="warning"
        />
      </div>

      <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
        <p className="font-semibold text-indigo-950">{action.title}</p>
        <p className="mt-2 text-sm leading-6 text-indigo-800">
          {action.description}
        </p>
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        Karşılaştırılan önceki ölçüm: {formatDate(previousDate)}. Değişim
        yalnızca iki ölçümde de aynı metinle bulunan ve web araması açık olan
        sorulara dayanır.
      </p>
    </>
  );

  if (isClient) {
    return (
      <section className="print:break-after-page">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Kaynak değişimi
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
            Kaynak görünürlüğü nasıl değişti?
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Marka sitesinin kaynak kazanıp kazanmadığını, değişen alan
            adlarını ve iki ölçümdür devam eden kaynak açıklarını gösterir.
          </p>
        </div>
        {body}
      </section>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <History className="size-5 text-primary" aria-hidden="true" />
          <CardTitle>Kaynak görünürlüğü değişimi</CardTitle>
        </div>
        <CardDescription>
          Marka atıfları, değişen kaynaklar ve kalıcı kaynak açıkları.
        </CardDescription>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}