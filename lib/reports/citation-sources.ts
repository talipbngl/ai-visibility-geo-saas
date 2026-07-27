export type CitationSource = {
  uri: string;
  title: string;
};

export type CitationRunInput = {
  id: string;
  promptText: string;
  promptIntent: string | null;
  brandMentioned: boolean;
  citationsValue: unknown;
};

export type CitationCompetitorInput = {
  name: string;
  websiteUrl: string | null;
};

export type CitationSourceCategory =
  | "brand"
  | "competitor"
  | "external";

export type CitationSourceStat = {
  hostname: string;
  displayName: string;
  sampleUri: string;
  category: CitationSourceCategory;
  competitorName: string | null;
  usageCount: number;
  promptCount: number;
  coverageRate: number;
};

export type CitationGap = {
  id: string;
  promptText: string;
  promptIntent: string | null;
  brandMentioned: boolean;
  sourceHostnames: string[];
};

export type CitationIntelligence = {
  measured: boolean;
  groundedPromptCount: number;
  sourcedPromptCount: number;
  brandCitedPromptCount: number;
  brandMentionedWithoutCitationCount: number;
  sourceUsageRate: number;
  brandCitationRate: number;
  uniqueSourceCount: number;
  topSources: CitationSourceStat[];
  citationGaps: CitationGap[];
};

const GEMINI_REDIRECT_HOSTS = new Set([
  "vertexaisearch.cloud.google.com",
]);

function getHostname(value: string | null | undefined) {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    return null;
  }

  try {
    const url = new URL(
      normalizedValue.startsWith("http://") ||
        normalizedValue.startsWith("https://")
        ? normalizedValue
        : `https://${normalizedValue}`
    );

    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function getHostnameFromTitle(title: string) {
  const directHostname = getHostname(title);

  if (directHostname) {
    return directHostname;
  }

  const domainMatch = title
    .toLowerCase()
    .match(/(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)/i);

  return domainMatch ? getHostname(domainMatch[0]) : null;
}

export function getCitationSourceHostname(source: CitationSource) {
  const uriHostname = getHostname(source.uri);

  if (uriHostname && !GEMINI_REDIRECT_HOSTS.has(uriHostname)) {
    return uriHostname;
  }

  return getHostnameFromTitle(source.title);
}

export function citationSourceMatchesWebsite(
  source: CitationSource,
  websiteUrl: string | null | undefined
) {
  const websiteHostname = getHostname(websiteUrl);
  const sourceHostname = getCitationSourceHostname(source);

  if (!websiteHostname || !sourceHostname) {
    return false;
  }

  return (
    sourceHostname === websiteHostname ||
    sourceHostname.endsWith(`.${websiteHostname}`)
  );
}

function getCitationData(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      groundingEnabled: false,
      sources: [] as CitationSource[],
    };
  }

  const record = value as {
    groundingEnabled?: unknown;
    sources?: unknown;
  };

  const sources = Array.isArray(record.sources)
    ? record.sources
        .map((item) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) {
            return null;
          }

          const source = item as {
            uri?: unknown;
            title?: unknown;
          };

          const uri = String(source.uri ?? "").trim();
          const title = String(source.title ?? "").trim();

          if (!uri && !title) {
            return null;
          }

          return {
            uri,
            title,
          };
        })
        .filter((item): item is CitationSource => item !== null)
    : [];

  return {
    groundingEnabled: record.groundingEnabled === true,
    sources,
  };
}

function getSourceCategory({
  source,
  brandWebsiteUrl,
  competitors,
}: {
  source: CitationSource;
  brandWebsiteUrl: string | null;
  competitors: CitationCompetitorInput[];
}) {
  if (citationSourceMatchesWebsite(source, brandWebsiteUrl)) {
    return {
      category: "brand" as const,
      competitorName: null,
    };
  }

  const matchedCompetitor = competitors.find((competitor) =>
    citationSourceMatchesWebsite(source, competitor.websiteUrl)
  );

  if (matchedCompetitor) {
    return {
      category: "competitor" as const,
      competitorName: matchedCompetitor.name,
    };
  }

  return {
    category: "external" as const,
    competitorName: null,
  };
}

function toPercentage(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

export function buildCitationIntelligence({
  runs,
  brandWebsiteUrl,
  competitors,
}: {
  runs: CitationRunInput[];
  brandWebsiteUrl: string | null;
  competitors: CitationCompetitorInput[];
}): CitationIntelligence {
  const groundedRuns = runs
    .map((run) => ({
      ...run,
      citationData: getCitationData(run.citationsValue),
    }))
    .filter((run) => run.citationData.groundingEnabled);

  const sourceStats = new Map<
    string,
    Omit<CitationSourceStat, "coverageRate">
  >();

  let sourcedPromptCount = 0;
  let brandCitedPromptCount = 0;
  let brandMentionedWithoutCitationCount = 0;

  const citationGaps: CitationGap[] = [];

  groundedRuns.forEach((run) => {
    const sources = run.citationData.sources;

    if (sources.length > 0) {
      sourcedPromptCount += 1;
    }

    const brandCited = sources.some((source) =>
      citationSourceMatchesWebsite(source, brandWebsiteUrl)
    );

    if (brandCited) {
      brandCitedPromptCount += 1;
    } else if (run.brandMentioned) {
      brandMentionedWithoutCitationCount += 1;
    }

    const promptSourceHostnames = new Set<string>();

    sources.forEach((source) => {
      const hostname = getCitationSourceHostname(source);

      if (!hostname) {
        return;
      }

      const classification = getSourceCategory({
        source,
        brandWebsiteUrl,
        competitors,
      });

      const current = sourceStats.get(hostname) ?? {
        hostname,
        displayName: source.title || hostname,
        sampleUri: source.uri,
        category: classification.category,
        competitorName: classification.competitorName,
        usageCount: 0,
        promptCount: 0,
      };

      current.usageCount += 1;

      if (!promptSourceHostnames.has(hostname)) {
        current.promptCount += 1;
        promptSourceHostnames.add(hostname);
      }

      sourceStats.set(hostname, current);
    });

    if (!brandCited && sources.length > 0) {
      citationGaps.push({
        id: run.id,
        promptText: run.promptText,
        promptIntent: run.promptIntent,
        brandMentioned: run.brandMentioned,
        sourceHostnames: Array.from(promptSourceHostnames).slice(0, 4),
      });
    }
  });

  const groundedPromptCount = groundedRuns.length;

  const topSources = Array.from(sourceStats.values())
    .map((source) => ({
      ...source,
      coverageRate: toPercentage(
        source.promptCount,
        groundedPromptCount
      ),
    }))
    .sort((first, second) => {
      if (second.promptCount !== first.promptCount) {
        return second.promptCount - first.promptCount;
      }

      return second.usageCount - first.usageCount;
    })
    .slice(0, 8);

  return {
    measured: groundedPromptCount > 0,
    groundedPromptCount,
    sourcedPromptCount,
    brandCitedPromptCount,
    brandMentionedWithoutCitationCount,
    sourceUsageRate: toPercentage(
      sourcedPromptCount,
      groundedPromptCount
    ),
    brandCitationRate: toPercentage(
      brandCitedPromptCount,
      groundedPromptCount
    ),
    uniqueSourceCount: sourceStats.size,
    topSources,
    citationGaps: citationGaps.slice(0, 5),
  };
}