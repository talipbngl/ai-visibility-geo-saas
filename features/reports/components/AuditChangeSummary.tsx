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
  previousDate,
}: AuditChangeSummaryProps) {
  if (!previousScore) return null;

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
            difference !== null
              ? getChangeStatus(
                  difference,
                  Boolean(metric.lowerIsBetter)
                )
              : null;

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

      {previousPromptCount !== null &&
      previousPromptCount !== currentPromptCount ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800">
          İki ölçümdeki soru sayısı farklıdır. Güncel ölçümde{" "}
          {currentPromptCount}, önceki ölçümde{" "}
          {previousPromptCount} soru kullanılmıştır. Değişimi
          kesin sonuç yerine yön göstergesi olarak değerlendirin.
        </p>
      ) : null}
    </section>
  );
}