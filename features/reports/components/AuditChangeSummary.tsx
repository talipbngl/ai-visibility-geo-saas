import {
  buildAuditChangeOverview,
  formatAuditComparisonDate,
  type AuditChangeMetricStatus,
  type AuditScoreSnapshot,
} from "@/lib/reports/audit-change-metrics";

type AuditChangeSummaryProps = {
  currentScore: AuditScoreSnapshot;
  previousScore: AuditScoreSnapshot | null;
  currentPromptCount: number;
  previousPromptCount: number | null;
  currentPromptTexts: string[];
  previousPromptTexts: string[];
  previousDate: string | null;
};

const STATUS_PRESENTATION: Record<
  AuditChangeMetricStatus,
  {
    label: string;
    className: string;
  }
> = {
  improved: {
    label: "Gelişti",
    className: "bg-emerald-50 text-emerald-700",
  },
  declined: {
    label: "Geriledi",
    className: "bg-rose-50 text-rose-700",
  },
  unchanged: {
    label: "Değişmedi",
    className: "bg-slate-100 text-slate-700",
  },
  limited: {
    label: "Sınırlı veri",
    className: "bg-amber-50 text-amber-700",
  },
  unavailable: {
    label: "Veri yok",
    className: "bg-slate-100 text-slate-500",
  },
};

function formatNumber(value: number | null) {
  if (value === null) return "-";

  return Number.isInteger(value)
    ? `${value}`
    : value.toFixed(1);
}

function formatDifference(
  value: number | null,
  suffix: string
) {
  if (value === null) return "-";

  const prefix = value > 0 ? "+" : "";

  return `${prefix}${formatNumber(value)}${suffix}`;
}

export function AuditChangeSummary({
  currentScore,
  previousScore,
  currentPromptTexts,
  previousPromptTexts,
  previousDate,
}: AuditChangeSummaryProps) {
  if (!previousScore) return null;

  const overview = buildAuditChangeOverview({
    currentScore,
    previousScore,
    currentPromptTexts,
    previousPromptTexts,
  });

  const reliabilityClassName = {
    high: "bg-emerald-50 text-emerald-700",
    medium: "bg-amber-50 text-amber-700",
    low: "bg-rose-50 text-rose-700",
  }[overview.reliability.level];

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
          {formatAuditComparisonDate(previousDate)}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${reliabilityClassName}`}
          >
            Karşılaştırma güveni:{" "}
            {overview.reliability.label}
          </span>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
            Ortak soru: {overview.comparablePromptCount}/
            {overview.largestPromptSetSize} · %
            {overview.coverageRate}
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {overview.metrics.map((metric) => {
          const status =
            STATUS_PRESENTATION[metric.status];

          return (
            <div
              key={metric.id}
              className="rounded-2xl border bg-background p-4 shadow-sm"
            >
              <p className="text-sm text-muted-foreground">
                {metric.label}
              </p>

              <div className="mt-3 flex items-end justify-between gap-3">
                <p className="text-2xl font-semibold">
                  {formatNumber(metric.currentValue)}
                  {metric.currentValue !== null
                    ? metric.valueSuffix
                    : ""}
                </p>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${status.className}`}
                >
                  {status.label}
                </span>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Önceki:{" "}
                {formatNumber(metric.previousValue)}
                {metric.previousValue !== null
                  ? metric.valueSuffix
                  : ""}
              </p>

              <p className="mt-1 text-xs font-medium">
                Değişim:{" "}
                {formatDifference(
                  metric.difference,
                  metric.differenceSuffix
                )}
              </p>
            </div>
          );
        })}
      </div>

      {overview.reliability.level === "low" ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-800">
          İki ölçüm arasında yeterli sayıda ortak ve
          benzersiz test sorusu bulunmadığı için skor
          değişimleri kesin gelişim veya gerileme olarak
          yorumlanmamalıdır.
        </p>
      ) : !overview.promptSetsAreIdentical ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800">
          Güncel ölçümde{" "}
          {overview.currentUniquePromptCount}, önceki
          ölçümde {overview.previousUniquePromptCount}{" "}
          benzersiz ve tamamlanmış soru bulunmaktadır.
          Değişim yalnızca iki ölçümde ortak olan{" "}
          {overview.comparablePromptCount} soru dikkate
          alınarak yorumlanmalıdır.
        </p>
      ) : null}
    </section>
  );
}