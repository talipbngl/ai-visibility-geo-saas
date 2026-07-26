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

export function buildIntentPerformance(
  analyses: IntentAnalysisInput[]
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
    const intent = analysis.intent ?? "other";

    const current = performanceMap.get(intent) ?? {
      intent,
      total: 0,
      mentionCount: 0,
      rankSum: 0,
      rankCount: 0,
    };

    current.total += 1;

    if (analysis.brandMentioned) {
      current.mentionCount += 1;

      if (
        typeof analysis.brandRank === "number" &&
        analysis.brandRank > 0
      ) {
        current.rankSum += analysis.brandRank;
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
        second.visibilityRate - first.visibilityRate
    );
}