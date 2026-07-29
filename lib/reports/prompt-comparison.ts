export type PromptVisibilityInput = {
  promptText: string | null | undefined;
  mentioned: boolean | null | undefined;
  rank: number | null | undefined;
};

export type ComparablePromptResult = {
  promptKey: string;
  promptText: string;
  currentMentioned: boolean;
  previousMentioned: boolean;
  currentRank: number | null;
  previousRank: number | null;
};

export type ComparisonReliability = {
  level: "low" | "medium" | "high";
  label: "Düşük" | "Orta" | "Yüksek";
};

function normalizeDisplayText(
  value: string | null | undefined
) {
  if (typeof value !== "string") return "";

  return value.normalize("NFKC").trim().replace(/\s+/gu, " ");
}

export function normalizePromptText(
  value: string | null | undefined
) {
  return normalizeDisplayText(value).toLocaleLowerCase("tr-TR");
}

function getValidRank(value: number | null | undefined) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value > 0
    ? value
    : null;
}

function buildUniqueResultMap(
  results: readonly PromptVisibilityInput[]
) {
  const resultMap = new Map<
    string,
    {
      promptText: string;
      mentioned: boolean;
      rank: number | null;
    }
  >();

  results.forEach((result) => {
    const promptText = normalizeDisplayText(result.promptText);
    const promptKey = normalizePromptText(promptText);

    if (!promptKey || resultMap.has(promptKey)) return;

    const mentioned = result.mentioned === true;

    resultMap.set(promptKey, {
      promptText,
      mentioned,
      rank: mentioned ? getValidRank(result.rank) : null,
    });
  });

  return resultMap;
}

function getComparisonReliability(
  comparablePromptCount: number,
  coverageRate: number
): ComparisonReliability {
  if (
    comparablePromptCount >= 5 &&
    coverageRate >= 80
  ) {
    return {
      level: "high",
      label: "Yüksek",
    };
  }

  if (
    comparablePromptCount >= 3 &&
    coverageRate >= 50
  ) {
    return {
      level: "medium",
      label: "Orta",
    };
  }

  return {
    level: "low",
    label: "Düşük",
  };
}

export function buildPromptVisibilityComparison(
  currentResults: readonly PromptVisibilityInput[],
  previousResults: readonly PromptVisibilityInput[]
) {
  const currentResultMap =
    buildUniqueResultMap(currentResults);
  const previousResultMap =
    buildUniqueResultMap(previousResults);

  const comparableResults: ComparablePromptResult[] = [];

  currentResultMap.forEach(
    (currentResult, promptKey) => {
      const previousResult =
        previousResultMap.get(promptKey);

      if (!previousResult) return;

      comparableResults.push({
        promptKey,
        promptText: currentResult.promptText,
        currentMentioned: currentResult.mentioned,
        previousMentioned: previousResult.mentioned,
        currentRank: currentResult.rank,
        previousRank: previousResult.rank,
      });
    }
  );

  const gainedVisibility = comparableResults.filter(
    (result) =>
      !result.previousMentioned &&
      result.currentMentioned
  );

  const lostVisibility = comparableResults.filter(
    (result) =>
      result.previousMentioned &&
      !result.currentMentioned
  );

  const unchangedVisibility = comparableResults.filter(
    (result) =>
      result.previousMentioned === result.currentMentioned
  );

  const currentUniqueCount = currentResultMap.size;
  const previousUniqueCount = previousResultMap.size;
  const largestPromptSetSize = Math.max(
    currentUniqueCount,
    previousUniqueCount
  );
  const comparablePromptCount = comparableResults.length;
  const coverageRate =
    largestPromptSetSize > 0
      ? Math.round(
          (comparablePromptCount /
            largestPromptSetSize) *
            100
        )
      : 0;

  return {
    currentUniqueCount,
    previousUniqueCount,
    largestPromptSetSize,
    comparablePromptCount,
    coverageRate,
    reliability: getComparisonReliability(
      comparablePromptCount,
      coverageRate
    ),
    comparableResults,
    gainedVisibility,
    lostVisibility,
    unchangedVisibility,
  };
}