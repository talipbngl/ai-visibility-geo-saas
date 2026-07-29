export type VisibilityCompetitorInput = {
  name: string;
  mentioned: boolean;
  rank: number | null;
};

export type ReportRunIdentity = {
  promptText: string | null | undefined;
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

type StrictTimestamp = {
  epochSecond: number;
  fractionalNanoseconds: string;
};

const STRICT_TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|([+-])(\d{2})(?::?(\d{2}))?)$/u;

function normalizeComparableText(
  value: string | null | undefined
) {
  if (typeof value !== "string") return "";

  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("tr-TR");
}

function normalizeDisplayText(value: string | null | undefined) {
  if (typeof value !== "string") return "";

  return value.normalize("NFKC").trim().replace(/\s+/gu, " ");
}

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function getDaysInMonth(year: number, month: number) {
  if (month === 2) return isLeapYear(year) ? 29 : 28;

  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function getTimestamp(
  value: string | null | undefined
): StrictTimestamp | null {
  if (typeof value !== "string") return null;

  const match = STRICT_TIMESTAMP_PATTERN.exec(value.trim());

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const fraction = match[7] ?? "";
  const timezone = match[8];
  const timezoneSign = match[9];
  const timezoneHour = Number(match[10] ?? 0);
  const timezoneMinute = Number(match[11] ?? 0);

  const dateIsValid =
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= getDaysInMonth(year, month) &&
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59 &&
    second >= 0 &&
    second <= 59;

  const timezoneIsValid =
    timezone === "Z" ||
    (timezoneHour >= 0 &&
      timezoneHour <= 14 &&
      timezoneMinute >= 0 &&
      timezoneMinute <= 59 &&
      (timezoneHour < 14 || timezoneMinute === 0));

  if (!dateIsValid || !timezoneIsValid) return null;

  const localDate = new Date(0);
  localDate.setUTCFullYear(year, month - 1, day);
  localDate.setUTCHours(hour, minute, second, 0);

  const unsignedOffsetMinutes =
    timezoneHour * 60 + timezoneMinute;
  const signedOffsetMinutes =
    timezoneSign === "-"
      ? -unsignedOffsetMinutes
      : unsignedOffsetMinutes;
  const epochSecond = Math.trunc(
    (localDate.getTime() - signedOffsetMinutes * 60_000) /
      1_000
  );

  if (!Number.isFinite(epochSecond)) return null;

  return {
    epochSecond,
    fractionalNanoseconds: fraction.padEnd(9, "0"),
  };
}

function isTimestampNewer(
  current: StrictTimestamp | null,
  selected: StrictTimestamp | null
) {
  if (current === null) return false;
  if (selected === null) return true;

  return (
    current.epochSecond > selected.epochSecond ||
    (current.epochSecond === selected.epochSecond &&
      current.fractionalNanoseconds >
        selected.fractionalNanoseconds)
  );
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
      selectedTimestamp: StrictTimestamp | null;
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

    if (
      isTimestampNewer(
        currentTimestamp,
        selected.selectedTimestamp
      )
    ) {
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