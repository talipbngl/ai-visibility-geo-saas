export type VisibilityCompetitorInput = {
  name: string;
  mentioned: boolean;
  rank: number | null;
};

export type ReportRunIdentity = {
  promptText: string;
  runStatus: string | null | undefined;
  runCreatedAt: string | null | undefined;
};

export type VisibilityMetricRun = {
  brandMentioned: boolean;
  brandRank: number | null;
  competitors: readonly VisibilityCompetitorInput[];
};

export type CompetitorVisibilityStat = {
  name: string;
  mentionCount: number;
  averageRank: number | null;
};

function normalizeComparableText(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("tr-TR");
}

function normalizeDisplayText(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ");
}

function getTimestamp(value: string | null | undefined) {
  if (!value) return null;

  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) ? timestamp : null;
}

function getValidRank(value: number | null) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value > 0
    ? value
    : null;
}

export function prepareCompletedUniqueRuns<T extends ReportRunIdentity>(
  runs: readonly T[]
) {
  const selectedRuns = new Map<
    string,
    {
      run: T;
      firstIndex: number;
      selectedTimestamp: number | null;
    }
  >();

  runs.forEach((run, index) => {
    const normalizedStatus = run.runStatus
      ?.trim()
      .toLocaleLowerCase("en-US");

    if (normalizedStatus !== "completed") return;

    const promptKey = normalizeComparableText(run.promptText);

    if (!promptKey) return;

    const selected = selectedRuns.get(promptKey);
    const currentTimestamp = getTimestamp(run.runCreatedAt);

    if (!selected) {
      selectedRuns.set(promptKey, {
        run,
        firstIndex: index,
        selectedTimestamp: currentTimestamp,
      });
      return;
    }

    const currentIsNewer =
      currentTimestamp !== null &&
      (selected.selectedTimestamp === null ||
        currentTimestamp > selected.selectedTimestamp);

    if (currentIsNewer) {
      selectedRuns.set(promptKey, {
        run,
        firstIndex: selected.firstIndex,
        selectedTimestamp: currentTimestamp,
      });
    }
  });

  return Array.from(selectedRuns.values())
    .sort((first, second) => first.firstIndex - second.firstIndex)
    .map((item) => item.run);
}

export function buildVisibilityMetrics<T extends VisibilityMetricRun>(
  runs: readonly T[]
) {
  const visibleRuns = runs.filter(
    (run) => run.brandMentioned === true
  );

  const validBrandRanks = visibleRuns
    .map((run) => getValidRank(run.brandRank))
    .filter((rank): rank is number => rank !== null);

  const competitorStatsMap = new Map<
    string,
    {
      name: string;
      mentionCount: number;
      rankSum: number;
      rankCount: number;
    }
  >();

  let competitorMentionCount = 0;

  runs.forEach((run) => {
    const competitorsInAnswer = new Map<
      string,
      {
        name: string;
        rank: number | null;
      }
    >();

    run.competitors.forEach((competitor) => {
      if (competitor.mentioned !== true) return;

      const displayName = normalizeDisplayText(competitor.name);
      const competitorKey = normalizeComparableText(displayName);

      if (!competitorKey) return;

      const validRank = getValidRank(competitor.rank);
      const existing = competitorsInAnswer.get(competitorKey);

      if (!existing) {
        competitorsInAnswer.set(competitorKey, {
          name: displayName,
          rank: validRank,
        });
        return;
      }

      if (
        validRank !== null &&
        (existing.rank === null || validRank < existing.rank)
      ) {
        existing.rank = validRank;
      }
    });

    competitorMentionCount += competitorsInAnswer.size;

    competitorsInAnswer.forEach((competitor, competitorKey) => {
      const current = competitorStatsMap.get(competitorKey) ?? {
        name: competitor.name,
        mentionCount: 0,
        rankSum: 0,
        rankCount: 0,
      };

      current.mentionCount += 1;

      if (competitor.rank !== null) {
        current.rankSum += competitor.rank;
        current.rankCount += 1;
      }

      competitorStatsMap.set(competitorKey, current);
    });
  });

  const promptCount = runs.length;
  const visibleCount = visibleRuns.length;
  const totalMentions = visibleCount + competitorMentionCount;

  const competitorStats: CompetitorVisibilityStat[] = Array.from(
    competitorStatsMap.values()
  )
    .map((competitor) => ({
      name: competitor.name,
      mentionCount: competitor.mentionCount,
      averageRank:
        competitor.rankCount > 0
          ? Math.round(
              (competitor.rankSum / competitor.rankCount) * 10
            ) / 10
          : null,
    }))
    .sort(
      (first, second) =>
        second.mentionCount - first.mentionCount ||
        (first.averageRank ?? Number.POSITIVE_INFINITY) -
          (second.averageRank ?? Number.POSITIVE_INFINITY) ||
        first.name.localeCompare(second.name, "tr-TR")
    );

  return {
    promptCount,
    visibleRuns,
    visibleCount,
    visibilityScore:
      promptCount > 0
        ? Math.round((visibleCount / promptCount) * 100)
        : 0,
    competitorMentionCount,
    totalMentions,
    shareOfVoice:
      totalMentions > 0
        ? Math.round((visibleCount / totalMentions) * 100)
        : 0,
    averageRank:
      validBrandRanks.length > 0
        ? Math.round(
            (validBrandRanks.reduce(
              (total, rank) => total + rank,
              0
            ) /
              validBrandRanks.length) *
              10
          ) / 10
        : null,
    competitorStats,
  };
}