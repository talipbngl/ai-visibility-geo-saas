type AuditScoreSnapshot = {
  visibility_score: number | string | null;
  share_of_voice: number | string | null;
  average_rank: number | string | null;
  positive_sentiment_rate: number | string | null;
};

type AuditChangeSummaryProps = {
  currentScore: AuditScoreSnapshot;
  previousScore: AuditScoreSnapshot | null;
  currentPromptCount: number;
  previousPromptCount: number | null;
  currentPromptTexts: string[];
  previousPromptTexts: string[];
  previousDate: string | null;
};

type ComparisonMetric = {
  label: string;
  currentValue: number | null;
  previousValue: number | null;
  suffix: string;
  lowerIsBetter?: boolean;
};

function toNumber(value: number | string | null) {
  if (value === null || value === undefined) return null;

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function formatNumber(value: number | null) {
  if (value === null) return "-";

  return Number.isInteger(value)
    ? `${value}`
    : value.toFixed(1);
}

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
  }).format(new Date(value));
}
function normalizePromptText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ");
}

function getComparisonReliability(
  comparablePromptCount: number,
  coverageRate: number
) {
  if (
    comparablePromptCount >= 5 &&
    coverageRate >= 80
  ) {
    return {
      level: "high",
      label: "Yüksek",
      className:
        "bg-emerald-50 text-emerald-700",
    };
  }

  if (
    comparablePromptCount >= 3 &&
    coverageRate >= 50
  ) {
    return {
      level: "medium",
      label: "Orta",
      className:
        "bg-amber-50 text-amber-700",
    };
  }

  return {
    level: "low",
    label: "Düşük",
    className: "bg-rose-50 text-rose-700",
  };
}
function getChangeStatus(
  difference: number,
  lowerIsBetter: boolean
) {
  if (difference === 0) {
    return {
      label: "Değişmedi",
      className: "bg-slate-100 text-slate-700",
    };
  }

  const improved = lowerIsBetter
    ? difference < 0
    : difference > 0;

  return improved
    ? {
        label: "Gelişti",
        className: "bg-emerald-50 text-emerald-700",
      }
    : {
        label: "Geriledi",
        className: "bg-rose-50 text-rose-700",
      };
}

export function AuditChangeSummary({
  currentScore,
  previousScore,
  currentPromptCount,
  previousPromptCount,
  currentPromptTexts,
  previousPromptTexts,
  previousDate,
}: AuditChangeSummaryProps) {
  if (!previousScore) return null;
  const currentPromptKeys = new Set(
  currentPromptTexts
    .map(normalizePromptText)
    .filter(Boolean)
);

const previousPromptKeys = new Set(
  previousPromptTexts
    .map(normalizePromptText)
    .filter(Boolean)
);

const comparablePromptCount = Array.from(
  currentPromptKeys
).filter((promptKey) =>
  previousPromptKeys.has(promptKey)
).length;

const largestPromptSetSize = Math.max(
  currentPromptKeys.size,
  previousPromptKeys.size
);

const comparisonCoverage =
  largestPromptSetSize > 0
    ? Math.round(
        (comparablePromptCount /
          largestPromptSetSize) *
          100
      )
    : 0;

const comparisonReliability =
  getComparisonReliability(
    comparablePromptCount,
    comparisonCoverage
  );

  const metrics: ComparisonMetric[] = [
    {
      label: "AI görünürlük",
      currentValue: toNumber(
        currentScore.visibility_score
      ),
      previousValue: toNumber(
        previousScore.visibility_score
      ),
      suffix: "/100",
    },
    {
      label: "Görünürlük payı",
      currentValue: toNumber(
        currentScore.share_of_voice
      ),
      previousValue: toNumber(
        previousScore.share_of_voice
      ),
      suffix: "%",
    },
    {
      label: "Ortalama sıra",
      currentValue: toNumber(
        currentScore.average_rank
      ),
      previousValue: toNumber(
        previousScore.average_rank
      ),
      suffix: "",
      lowerIsBetter: true,
    },
    {
      label: "Olumlu ton",
      currentValue: toNumber(
        currentScore.positive_sentiment_rate
      ),
      previousValue: toNumber(
        previousScore.positive_sentiment_rate
      ),
      suffix: "%",
    },
  ];

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
          Ölçüm değişimi
        </p>

        <h2 className="mt-1 text-2xl font-semibold tracking-tight">
          Önceki ölçüme göre ne değişti?
        </h2>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Karşılaştırılan önceki ölçüm:{" "}
          {formatDate(previousDate)}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${comparisonReliability.className}`}
                >
                    Karşılaştırma güveni:{" "}
                    {comparisonReliability.label}
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                    Ortak soru: {comparablePromptCount}/
                    {largestPromptSetSize} · %{comparisonCoverage}
                </span>
                </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => {
          const difference =
            metric.currentValue !== null &&
            metric.previousValue !== null
              ? Math.round(
                  (metric.currentValue -
                    metric.previousValue) *
                    10
                ) / 10
              : null;

          const status =
        difference === null
            ? null
            : comparisonReliability.level === "low"
            ? {
          label: "Sınırlı veri",
          className:
            "bg-amber-50 text-amber-700",
        }
      : getChangeStatus(
          difference,
          Boolean(metric.lowerIsBetter)
        );

          return (
            <div
              key={metric.label}
              className="rounded-2xl border bg-background p-4 shadow-sm"
            >
              <p className="text-sm text-muted-foreground">
                {metric.label}
              </p>

              <div className="mt-3 flex items-end justify-between gap-3">
                <p className="text-2xl font-semibold">
                  {formatNumber(metric.currentValue)}
                  {metric.currentValue !== null
                    ? metric.suffix
                    : ""}
                </p>

                {status ? (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${status.className}`}
                  >
                    {status.label}
                  </span>
                ) : null}
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Önceki:{" "}
                {formatNumber(metric.previousValue)}
                {metric.previousValue !== null
                  ? metric.suffix
                  : ""}
              </p>

              <p className="mt-1 text-xs font-medium">
                Değişim:{" "}
                {difference === null
                  ? "-"
                  : `${difference > 0 ? "+" : ""}${difference}`}
              </p>
            </div>
          );
        })}
      </div>

     {comparisonReliability.level === "low" ? (
  <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-800">
    İki ölçüm arasında yeterli sayıda ortak test sorusu
    bulunmadığı için skor değişimleri kesin gelişim veya
    gerileme olarak yorumlanmamalıdır.
  </p>
) : previousPromptCount !== null &&
  previousPromptCount !== currentPromptCount ? (
  <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800">
    Güncel ölçümde {currentPromptCount}, önceki ölçümde{" "}
    {previousPromptCount} soru kullanılmıştır. Ortak soru
    kapsamı dikkate alınarak değerlendirme yapılmalıdır.
  </p>
) : null}
    </section>
  );
}