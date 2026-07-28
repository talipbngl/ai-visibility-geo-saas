type CompetitorMentionTermsInput = {
  name: string;
  aliases?: string[] | null;
  websiteUrl?: string | null;
};

const genericFirstWords = new Set([
  "coffee",
  "kahve",
  "cafe",
  "kafe",
  "the",
  "company",
  "roasting",
  "roastery",
  "clinic",
  "klinik",
  "dental",
  "health",
  "saglik",
  "hotel",
  "otel",
  "software",
  "yazilim",
  "technology",
  "teknoloji",
  "tech",
  "digital",
  "group",
  "grup",
  "holding",
  "agency",
  "ajans",
  "law",
  "hukuk",
  "danismanlik",
  "grand",
]);

const descriptorWords = new Set([
  "coffee",
  "company",
  "co",
  "roasting",
  "roastery",
  "cafe",
  "café",
  "inc",
  "ltd",
  "limited",
  "turkey",
  "türkiye",
  "clinic",
  "klinik",
  "dental",
  "health",
  "saglik",
  "medical",
  "medikal",
  "hotel",
  "otel",
  "software",
  "yazilim",
  "technology",
  "teknoloji",
  "tech",
  "digital",
  "group",
  "grup",
  "holding",
  "agency",
  "ajans",
  "law",
  "hukuk",
  "danismanlik",
  "akademi",
  "academy",
]);

export function normalizeMentionText(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replaceAll("â", "a")
    .replaceAll("î", "i")
    .replaceAll("û", "u")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function uniqueMentionTerms(values: string[]) {
  const terms = new Map<string, string>();

  values.forEach((value) => {
    const trimmedValue = value.trim();
    const normalizedValue = normalizeMentionText(trimmedValue);

    if (normalizedValue.length < 3 || terms.has(normalizedValue)) {
      return;
    }

    terms.set(normalizedValue, trimmedValue);
  });

  return Array.from(terms.values());
}

function getAutomaticNameAliases(name: string) {
  const tokens = name
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length < 2) {
    return [];
  }

  const firstToken = tokens[0];
  const normalizedFirstToken = normalizeMentionText(firstToken);

  if (
    normalizedFirstToken.length < 4 ||
    genericFirstWords.has(normalizedFirstToken)
  ) {
    return [];
  }

  const descriptorIndex = tokens.findIndex(
    (token, index) =>
      index > 0 &&
      descriptorWords.has(normalizeMentionText(token))
  );

  if (descriptorIndex < 1) {
    return [];
  }

  return [tokens.slice(0, descriptorIndex).join(" ")];
}

function getWebsiteAlias(websiteUrl: string | null | undefined) {
  if (!websiteUrl) return null;

  try {
    const hostname = new URL(websiteUrl).hostname
      .replace(/^www\./, "")
      .split(".")[0];

    return hostname && hostname.length >= 4 ? hostname : null;
  } catch {
    return null;
  }
}

export function buildCompetitorMentionTerms({
  name,
  aliases = [],
  websiteUrl,
}: CompetitorMentionTermsInput) {
  const websiteAlias = getWebsiteAlias(websiteUrl);

  return uniqueMentionTerms([
    name,
    ...(aliases ?? []),
    ...getAutomaticNameAliases(name),
    ...(websiteAlias ? [websiteAlias] : []),
  ]);
}

export function findFirstMentionIndex(
  answer: string,
  terms: string[]
) {
  const normalizedAnswer = normalizeMentionText(answer);

  if (!normalizedAnswer) {
    return null;
  }

  const paddedAnswer = ` ${normalizedAnswer} `;
  const indexes = uniqueMentionTerms(terms)
    .map((term) => normalizeMentionText(term))
    .map((term) => paddedAnswer.indexOf(` ${term} `))
    .filter((index) => index >= 0);

  return indexes.length > 0 ? Math.min(...indexes) : null;
}