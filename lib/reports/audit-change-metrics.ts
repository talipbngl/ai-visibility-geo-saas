import {
  buildPromptVisibilityComparison,
  type ComparisonReliability,
} from "./prompt-comparison";

export type AuditScoreSnapshot = {
  visibility_score: unknown;
  share_of_voice: unknown;
  average_rank: unknown;
  positive_sentiment_rate: unknown;
};

export type AuditChangeMetricStatus =
  | "improved"
  | "declined"
  | "unchanged"
  | "limited"
  | "unavailable";

export type AuditChangeMetric = {
  id:
    | "visibility"
    | "share_of_voice"
    | "average_rank"
    | "positive_sentiment";
  label: string;
  currentValue: number | null;
  previousValue: number | null;
  valueSuffix: string;
  difference: number | null;
  differenceSuffix: string;
  status: AuditChangeMetricStatus;
};

export type AuditChangeOverview = {
  currentUniquePromptCount: number;
  previousUniquePromptCount: number;
  largestPromptSetSize: number;
  comparablePromptCount: number;
  coverageRate: number;
  reliability: ComparisonReliability;
  promptSetsAreIdentical: boolean;
  metrics: AuditChangeMetric[];
};

type MetricDefinition = {
  id: AuditChangeMetric["id"];
  label: string;
  currentValue: unknown;
  previousValue: unknown;
  valueSuffix: string;
  differenceSuffix: string;
  lowerIsBetter?: boolean;
  parse: (value: unknown) => number | null;
};

function roundToOneDecimal(value: number) {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

function parseStrictFiniteNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") return null;

  const normalizedValue = value.trim();

  if (
    !normalizedValue ||
    !/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/u.test(
      normalizedValue
    )
  ) {
    return null;
  }

  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : null;
}

export function parsePercentageValue(value: unknown) {
  const parsedValue = parseStrictFiniteNumber(value);

  if (
    parsedValue === null ||
    parsedValue < 0 ||
    parsedValue > 100
  ) {
    return null;
  }

  return roundToOneDecimal(parsedValue);
}

export function parseAverageRankValue(value: unknown) {
  const parsedValue = parseStrictFiniteNumber(value);

  if (parsedValue === null || parsedValue <= 0) {
    return null;
  }

  return roundToOneDecimal(parsedValue);
}

export function formatAuditComparisonDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return "-";
  }

  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeZone: "Europe/Istanbul",
  }).format(new Date(timestamp));
}

function getMetricStatus(
  difference: number | null,
  reliability: ComparisonReliability,
  lowerIsBetter: boolean
): AuditChangeMetricStatus {
  if (difference === null) return "unavailable";

  if (reliability.level === "low") {
    return "limited";
  }

  if (difference === 0) return "unchanged";

  const improved = lowerIsBetter
    ? difference < 0
    : difference > 0;

  return improved ? "improved" : "declined";
}

function buildMetric(
  definition: MetricDefinition,
  reliability: ComparisonReliability
): AuditChangeMetric {
  const currentValue = definition.parse(
    definition.currentValue
  );
  const previousValue = definition.parse(
    definition.previousValue
  );
  const difference =
    currentValue !== null && previousValue !== null
      ? roundToOneDecimal(currentValue - previousValue)
      : null;

  return {
    id: definition.id,
    label: definition.label,
    currentValue,
    previousValue,
    valueSuffix: definition.valueSuffix,
    difference,
    differenceSuffix: definition.differenceSuffix,
    status: getMetricStatus(
      difference,
      reliability,
      definition.lowerIsBetter === true
    ),
  };
}

function toPromptComparisonInputs(
  promptTexts: readonly (string | null | undefined)[]
) {
  return promptTexts.map((promptText) => ({
    promptText,
    mentioned: false,
    rank: null,
  }));
}

export function buildAuditChangeOverview({
  currentScore,
  previousScore,
  currentPromptTexts,
  previousPromptTexts,
}: {
  currentScore: AuditScoreSnapshot;
  previousScore: AuditScoreSnapshot | null;
  currentPromptTexts: readonly (
    | string
    | null
    | undefined
  )[];
  previousPromptTexts: readonly (
    | string
    | null
    | undefined
  )[];
}): AuditChangeOverview {
  const promptComparison =
    buildPromptVisibilityComparison(
      toPromptComparisonInputs(currentPromptTexts),
      toPromptComparisonInputs(previousPromptTexts)
    );

  const metricDefinitions: MetricDefinition[] = [
    {
      id: "visibility",
      label: "AI görünürlük",
      currentValue: currentScore.visibility_score,
      previousValue:
        previousScore?.visibility_score ?? null,
      valueSuffix: "/100",
      differenceSuffix: " puan",
      parse: parsePercentageValue,
    },
    {
      id: "share_of_voice",
      label: "Görünürlük payı",
      currentValue: currentScore.share_of_voice,
      previousValue:
        previousScore?.share_of_voice ?? null,
      valueSuffix: "%",
      differenceSuffix: " puan",
      parse: parsePercentageValue,
    },
    {
      id: "average_rank",
      label: "Ortalama sıra",
      currentValue: currentScore.average_rank,
      previousValue:
        previousScore?.average_rank ?? null,
      valueSuffix: "",
      differenceSuffix: "",
      lowerIsBetter: true,
      parse: parseAverageRankValue,
    },
    {
      id: "positive_sentiment",
      label: "Olumlu ton",
      currentValue:
        currentScore.positive_sentiment_rate,
      previousValue:
        previousScore?.positive_sentiment_rate ??
        null,
      valueSuffix: "%",
      differenceSuffix: " puan",
      parse: parsePercentageValue,
    },
  ];

  return {
    currentUniquePromptCount:
      promptComparison.currentUniqueCount,
    previousUniquePromptCount:
      promptComparison.previousUniqueCount,
    largestPromptSetSize:
      promptComparison.largestPromptSetSize,
    comparablePromptCount:
      promptComparison.comparablePromptCount,
    coverageRate: promptComparison.coverageRate,
    reliability: promptComparison.reliability,
    promptSetsAreIdentical:
      promptComparison.currentUniqueCount ===
        promptComparison.previousUniqueCount &&
      promptComparison.comparablePromptCount ===
        promptComparison.currentUniqueCount,
    metrics: metricDefinitions.map((definition) =>
      buildMetric(
        definition,
        promptComparison.reliability
      )
    ),
  };
}