export type IntentAnalysisInput = {
  intent: string | null | undefined;
  brandMentioned: boolean;
  brandRank: number | null;
};

export type IntentPerformanceItem = {
  intent: string;
  total: number;
  mentionCount: number;
  visibilityRate: number;
  averageRank: number | null;
};

const INTERNAL_INTENTS = new Set([
  "buying_intent",
  "comparison",
  "local_recommendation",
  "problem_solution",
  "alternative_search",
  "budget_friendly",
  "premium_choice",
  "trust_reputation",
  "other",
]);

function normalizeIntent(value: string | null | undefined) {
  if (typeof value !== "string") return "other";

  const compactValue = value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/gu, " ");

  if (!compactValue) return "other";

  const internalIntent = compactValue.toLocaleLowerCase("en-US");

  if (INTERNAL_INTENTS.has(internalIntent)) {
    return internalIntent;
  }

  return compactValue.toLocaleLowerCase("tr-TR");
}

function getValidRank(value: number | null) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value > 0
    ? value
    : null;
}

export function buildIntentPerformance(
  analyses: readonly IntentAnalysisInput[]
): IntentPerformanceItem[] {
  const performanceMap = new Map<
    string,
    {
      intent: string;
      total: number;
      mentionCount: number;
      rankSum: number;
      rankCount: number;
    }
  >();

  analyses.forEach((analysis) => {
    const intent = normalizeIntent(analysis.intent);

    const current = performanceMap.get(intent) ?? {
      intent,
      total: 0,
      mentionCount: 0,
      rankSum: 0,
      rankCount: 0,
    };

    current.total += 1;

    if (analysis.brandMentioned === true) {
      current.mentionCount += 1;

      const validRank = getValidRank(analysis.brandRank);

      if (validRank !== null) {
        current.rankSum += validRank;
        current.rankCount += 1;
      }
    }

    performanceMap.set(intent, current);
  });

  return Array.from(performanceMap.values())
    .map((item) => ({
      intent: item.intent,
      total: item.total,
      mentionCount: item.mentionCount,
      visibilityRate:
        item.total > 0
          ? Math.round((item.mentionCount / item.total) * 100)
          : 0,
      averageRank:
        item.rankCount > 0
          ? Math.round((item.rankSum / item.rankCount) * 10) / 10
          : null,
    }))
    .sort(
      (first, second) =>
        second.total - first.total ||
        second.visibilityRate - first.visibilityRate ||
        first.intent.localeCompare(second.intent, "en-US")
    );
}