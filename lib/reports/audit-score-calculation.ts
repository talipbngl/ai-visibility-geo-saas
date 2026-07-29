import {
  buildVisibilityMetrics,
  prepareCompletedUniqueRuns,
  type VisibilityCompetitorInput,
} from "@/lib/reports/visibility-metrics";

export type AuditScoreCalculationRun = {
  id: string;
  promptText: string;
  runStatus: string | null | undefined;
  runCreatedAt: string | null | undefined;
  isSeededPrompt: boolean;
  brandMentioned: boolean;
  brandRank: number | null;
  brandSentiment: string | null | undefined;
  competitors: readonly VisibilityCompetitorInput[];
};

function roundToTwoDecimals(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isPositiveSentiment(
  value: string | null | undefined
) {
  return (
    value
      ?.normalize("NFKC")
      .trim()
      .toLocaleLowerCase("en-US") === "positive"
  );
}

export function buildAuditScoreCalculation<
  T extends AuditScoreCalculationRun,
>(runs: readonly T[]) {
  const uniqueCompletedRuns =
    prepareCompletedUniqueRuns(runs);
  const discoveryRuns = uniqueCompletedRuns.filter(
    (run) => run.isSeededPrompt !== true
  );
  const seededRuns = uniqueCompletedRuns.filter(
    (run) => run.isSeededPrompt === true
  );

  const visibilityMetrics =
    buildVisibilityMetrics(discoveryRuns);
  const positiveMentionCount = discoveryRuns.filter(
    (run) =>
      run.brandMentioned === true &&
      isPositiveSentiment(run.brandSentiment)
  ).length;
  const competitorOnlyOpportunityCount =
    discoveryRuns.filter(
      (run) =>
        run.brandMentioned !== true &&
        run.competitors.some(
          (competitor) =>
            competitor.mentioned === true
        )
    ).length;
  const discoveryPromptCount =
    visibilityMetrics.promptCount;
  const opportunityScore =
    discoveryPromptCount > 0
      ? roundToTwoDecimals(
          (competitorOnlyOpportunityCount /
            discoveryPromptCount) *
            100
        )
      : 0;

  return {
    inputRunCount: runs.length,
    uniqueCompletedRunCount:
      uniqueCompletedRuns.length,
    excludedRunCount:
      runs.length - uniqueCompletedRuns.length,
    discoveryPromptCount,
    seededPromptCount: seededRuns.length,
    hasDiscoveryMeasurement:
      discoveryPromptCount > 0,
    brandMentionCount:
      visibilityMetrics.visibleCount,
    competitorMentionCount:
      visibilityMetrics.competitorMentionCount,
    visibilityScore:
      visibilityMetrics.visibilityScore,
    shareOfVoice: visibilityMetrics.shareOfVoice,
    averageRank: visibilityMetrics.averageRank,
    positiveMentionCount,
    positiveSentimentRate:
      visibilityMetrics.visibleCount > 0
        ? roundToTwoDecimals(
            (positiveMentionCount /
              visibilityMetrics.visibleCount) *
              100
          )
        : 0,
    competitorOnlyOpportunityCount,
    competitorGapScore:
      discoveryPromptCount > 0
        ? roundToTwoDecimals(100 - opportunityScore)
        : 0,
    opportunityScore,
    uniqueCompletedRuns,
    discoveryRuns,
    seededRuns,
  };
}