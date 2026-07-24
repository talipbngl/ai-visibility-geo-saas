import { assertPublicWebsiteUrl } from "@/lib/security/public-website-url";
import { getWebsiteKeywordPreset } from "@/lib/website-analysis/keyword-presets";
import { crawlLinkedPages } from "@/lib/website-analysis/crawl-linked-pages";
const MAX_REDIRECTS = 5;
const MAX_HTML_BYTES = 2 * 1024 * 1024;
const MAX_STORED_TEXT_LENGTH = 30_000;
const MAX_SEARCHABLE_TEXT_LENGTH = 100_000;

export type SignalResult = {
  keyword: string;
  count: number;
  found: boolean;
};

export type TechnicalSignals = {
  finalUrl: string | null;
  isHttps: boolean;
  canonicalUrl: string | null;
  robotsDirective: string | null;
  indexable: boolean;
  htmlLanguage: string | null;
  sitemapFound: boolean;
  sitemapUrl: string | null;
  sitemapPageCount: number;
  hasViewport: boolean;
  hasFavicon: boolean;
  hasManifest: boolean;
  hasOpenGraph: boolean;
  hasOpenGraphTitle: boolean;
  hasOpenGraphDescription: boolean;
  hasOpenGraphImage: boolean;
  hasTwitterCard: boolean;
  schemaTypes: string[];
  imageCount: number;
  imagesWithoutAlt: number;
  imageAltCoverage: number;
  internalLinkCount: number;
  externalLinkCount: number;
  hasContactLink: boolean;
  hasAboutLink: boolean;
  hasPrivacyLink: boolean;
pagesAnalyzed: number;
pagesFailed: number;
pagesBlockedByRobots: number;
robotsTxtChecked: boolean;
analyzedPages: Array<{
  url: string;
  title: string | null;
  wordCount: number;
}>;
  headingOrderValid: boolean;
  pagesDiscovered: number;
};

export type CategoryScores = {
  technical: number;
  structure: number;
  content: number;
  trust: number;
  overall: number;
};

export type WebsiteAnalysisResult = {
  status: "completed" | "failed";
  httpStatus: number | null;
  title: string | null;
  metaDescription: string | null;
  headings: {
    h1: string[];
    h2: string[];
  };
  extractedText: string | null;
  wordCount: number;
  serviceSignals: SignalResult[];
  trustSignals: SignalResult[];
  technicalSignals: TechnicalSignals;
  categoryScores: CategoryScores;
  contentScore: number;
  errorMessage: string | null;
};

export function normalizeWebsiteUrl(value: string | null) {
  if (!value) return null;

  const trimmedValue = value.trim();

  if (!trimmedValue) return null;

  if (
    trimmedValue.startsWith("http://") ||
    trimmedValue.startsWith("https://")
  ) {
    return trimmedValue;
  }

  return `https://${trimmedValue}`;
}

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripHtml(value: string) {
  return decodeHtmlEntities(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function getOpeningTags(html: string, tagName: string) {
  const regex = new RegExp(`<${tagName}\\b[^>]*>`, "gi");

  return Array.from(html.matchAll(regex), (match) => match[0]);
}

function getAttribute(tag: string, attributeName: string) {
  const regex = new RegExp(
    `\\b${attributeName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i"
  );

  const match = tag.match(regex);

  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

function getMetaContent(
  html: string,
  attributeName: "name" | "property",
  attributeValue: string
) {
  const normalizedTarget = attributeValue.toLowerCase();

  for (const tag of getOpeningTags(html, "meta")) {
    const currentValue = getAttribute(tag, attributeName)?.toLowerCase();

    if (currentValue === normalizedTarget) {
      const content = getAttribute(tag, "content");

      return content ? decodeHtmlEntities(content).trim() : null;
    }
  }

  return null;
}

function extractTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const rawTitle = match?.[1];

  return rawTitle ? stripHtml(rawTitle).slice(0, 300) : null;
}

function extractMetaDescription(html: string) {
  return getMetaContent(html, "name", "description")?.slice(0, 500) ?? null;
}

function extractTagTexts(html: string, tagName: "h1" | "h2") {
  const regex = new RegExp(
    `<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`,
    "gi"
  );

  const results: string[] = [];

  for (const match of html.matchAll(regex)) {
    const rawText = match[1];

    if (!rawText) continue;

    const text = stripHtml(rawText).trim();

    if (text) {
      results.push(text.slice(0, 200));
    }

    if (results.length >= 20) break;
  }

  return results;
}

function extractCanonicalUrl(html: string, pageUrl: string) {
  for (const tag of getOpeningTags(html, "link")) {
    const rel = getAttribute(tag, "rel")
      ?.toLowerCase()
      .split(/\s+/);

    if (!rel?.includes("canonical")) continue;

    const href = getAttribute(tag, "href");

    if (!href) return null;

    try {
      return new URL(href, pageUrl).toString();
    } catch {
      return href.slice(0, 500);
    }
  }

  return null;
}

function extractHtmlLanguage(html: string) {
  const htmlTag = getOpeningTags(html, "html")[0];

  return htmlTag ? getAttribute(htmlTag, "lang")?.slice(0, 20) ?? null : null;
}

function extractSchemaTypes(html: string) {
  const schemaTypes = new Set<string>();

  function collectTypes(value: unknown) {
    if (Array.isArray(value)) {
      value.forEach(collectTypes);
      return;
    }

    if (!value || typeof value !== "object") return;

    const objectValue = value as Record<string, unknown>;
    const typeValue = objectValue["@type"];

    if (typeof typeValue === "string") {
      schemaTypes.add(typeValue);
    }

    if (Array.isArray(typeValue)) {
      typeValue.forEach((type) => {
        if (typeof type === "string") {
          schemaTypes.add(type);
        }
      });
    }

    Object.values(objectValue).forEach(collectTypes);
  }

  const regex =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  for (const match of html.matchAll(regex)) {
    const jsonText = match[1]?.trim();

    if (!jsonText) continue;

    try {
      collectTypes(JSON.parse(jsonText));
    } catch {
      // Geçersiz JSON-LD bütün analizi durdurmamalı.
    }
  }

  return Array.from(schemaTypes).slice(0, 50);
}

function extractHeadingOrderValidity(html: string) {
  const levels = Array.from(
    html.matchAll(/<h([1-6])\b[^>]*>/gi),
    (match) => Number(match[1])
  );

  if (levels.length === 0) return false;

  for (let index = 1; index < levels.length; index += 1) {
    const previousLevel = levels[index - 1];
    const currentLevel = levels[index];

    if (
      previousLevel !== undefined &&
      currentLevel !== undefined &&
      currentLevel - previousLevel > 1
    ) {
      return false;
    }
  }

  return true;
}

function extractLinkSignals(html: string, pageUrl: string) {
  const internalLinks = new Set<string>();
  const externalLinks = new Set<string>();

  let hasContactLink = false;
  let hasAboutLink = false;
  let hasPrivacyLink = false;

  const pageHostname = new URL(pageUrl).hostname
    .toLowerCase()
    .replace(/^www\./, "");

  for (const tag of getOpeningTags(html, "a")) {
    const href = getAttribute(tag, "href")?.trim();

    if (!href) continue;

    const normalizedHref = normalizeText(href);

    if (
      normalizedHref.includes("iletisim") ||
      normalizedHref.includes("contact") ||
      normalizedHref.startsWith("mailto:") ||
      normalizedHref.startsWith("tel:")
    ) {
      hasContactLink = true;
    }

    if (
      normalizedHref.includes("hakkimizda") ||
      normalizedHref.includes("about")
    ) {
      hasAboutLink = true;
    }

    if (
      normalizedHref.includes("gizlilik") ||
      normalizedHref.includes("kvkk") ||
      normalizedHref.includes("privacy")
    ) {
      hasPrivacyLink = true;
    }

    try {
      const resolvedUrl = new URL(href, pageUrl);

      if (!["http:", "https:"].includes(resolvedUrl.protocol)) {
        continue;
      }

      resolvedUrl.hash = "";

      const targetHostname = resolvedUrl.hostname
        .toLowerCase()
        .replace(/^www\./, "");

      if (targetHostname === pageHostname) {
        internalLinks.add(resolvedUrl.toString());
      } else {
        externalLinks.add(resolvedUrl.toString());
      }
    } catch {
      // Geçersiz bağlantılar sayılmaz.
    }
  }

  return {
    internalLinkCount: internalLinks.size,
    externalLinkCount: externalLinks.size,
    hasContactLink,
    hasAboutLink,
    hasPrivacyLink,
  };
}

function extractImageSignals(html: string) {
  const imageTags = getOpeningTags(html, "img");
  const imagesWithoutAlt = imageTags.filter((tag) => {
    const alt = getAttribute(tag, "alt");

    return !alt?.trim();
  }).length;

  const imageAltCoverage =
    imageTags.length === 0
      ? 100
      : Math.round(
          ((imageTags.length - imagesWithoutAlt) / imageTags.length) * 100
        );

  return {
    imageCount: imageTags.length,
    imagesWithoutAlt,
    imageAltCoverage,
  };
}

function hasLinkRelation(html: string, relation: string) {
  return getOpeningTags(html, "link").some((tag) => {
    const relValues = getAttribute(tag, "rel")
      ?.toLowerCase()
      .split(/\s+/);

    return relValues?.includes(relation) ?? false;
  });
}

function countOccurrences(text: string, keyword: string) {
  const normalizedKeyword = normalizeText(keyword);

  if (!normalizedKeyword) return 0;

  let count = 0;
  let position = 0;

  while (position !== -1) {
    position = text.indexOf(normalizedKeyword, position);

    if (position !== -1) {
      count += 1;
      position += normalizedKeyword.length;
    }
  }

  return count;
}

function getSignals(text: string, keywords: string[]): SignalResult[] {
  return keywords.map((keyword) => {
    const count = countOccurrences(text, keyword);

    return {
      keyword,
      count,
      found: count > 0,
    };
  });
}

function getWordCount(text: string) {
  if (!text) return 0;

  return text.split(/\s+/).filter(Boolean).length;
}

function getCoverage(signals: SignalResult[]) {
  if (signals.length === 0) return 0;

  const foundCount = signals.filter((signal) => signal.found).length;

  return foundCount / signals.length;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function calculateCategoryScores({
  title,
  metaDescription,
  headings,
  wordCount,
  serviceSignals,
  trustSignals,
  technicalSignals,
}: {
  title: string | null;
  metaDescription: string | null;
  headings: {
    h1: string[];
    h2: string[];
  };
  wordCount: number;
  serviceSignals: SignalResult[];
  trustSignals: SignalResult[];
  technicalSignals: TechnicalSignals;
}): CategoryScores {
  let technical = 0;

  if (technicalSignals.isHttps) technical += 15;
  if (technicalSignals.hasViewport) technical += 10;
  if (technicalSignals.canonicalUrl) technical += 15;
  if (technicalSignals.indexable) technical += 15;
  if (technicalSignals.htmlLanguage) technical += 10;
  if (technicalSignals.hasFavicon) technical += 10;
  if (technicalSignals.hasOpenGraph) technical += 15;
  if (technicalSignals.hasTwitterCard) technical += 5;
  if (technicalSignals.hasManifest) technical += 5;

  let structure = 0;

  if (title) {
    structure += title.length >= 10 && title.length <= 65 ? 20 : 10;
  }

  if (metaDescription) {
    structure +=
      metaDescription.length >= 70 && metaDescription.length <= 170 ? 20 : 10;
  }

  if (headings.h1.length === 1) {
    structure += 20;
  } else if (headings.h1.length > 0) {
    structure += 10;
  }

  if (headings.h2.length > 0) structure += 10;
  if (technicalSignals.headingOrderValid) structure += 10;

  structure += technicalSignals.imageAltCoverage * 0.1;
  structure += Math.min(technicalSignals.internalLinkCount / 5, 1) * 10;

  const serviceCoverage = getCoverage(serviceSignals);
  const trustCoverage = getCoverage(trustSignals);

  let content = 0;

  content += Math.min(wordCount / 1_000, 1) * 35;
  content += serviceCoverage * 30;
  content += trustCoverage * 25;
  if (title) content += 5;
  if (metaDescription) content += 5;

  const trustSchemaTypes = new Set([
    "Organization",
    "LocalBusiness",
    "ProfessionalService",
    "Person",
    "Product",
    "Service",
    "MedicalOrganization",
    "Dentist",
  ]);

  const hasTrustSchema = technicalSignals.schemaTypes.some((type) =>
    trustSchemaTypes.has(type)
  );

  let trust = 0;

  trust += trustCoverage * 35;
  if (technicalSignals.hasContactLink) trust += 20;
  if (technicalSignals.hasAboutLink) trust += 15;
  if (technicalSignals.hasPrivacyLink) trust += 10;
  if (hasTrustSchema) trust += 20;

  const normalizedTechnical = clampScore(technical);
  const normalizedStructure = clampScore(structure);
  const normalizedContent = clampScore(content);
  const normalizedTrust = clampScore(trust);

  const overall = clampScore(
    normalizedTechnical * 0.3 +
      normalizedStructure * 0.2 +
      normalizedContent * 0.3 +
      normalizedTrust * 0.2
  );

  return {
    technical: normalizedTechnical,
    structure: normalizedStructure,
    content: normalizedContent,
    trust: normalizedTrust,
    overall,
  };
}

function createEmptyTechnicalSignals(): TechnicalSignals {
  return {
    finalUrl: null,
    isHttps: false,
    canonicalUrl: null,
    robotsDirective: null,
    indexable: false,
    htmlLanguage: null,
    hasViewport: false,
    hasFavicon: false,
    hasManifest: false,
    hasOpenGraph: false,
    hasOpenGraphTitle: false,
    hasOpenGraphDescription: false,
    hasOpenGraphImage: false,
    hasTwitterCard: false,
    schemaTypes: [],
    imageCount: 0,
    imagesWithoutAlt: 0,
    imageAltCoverage: 0,
    internalLinkCount: 0,
    externalLinkCount: 0,
    hasContactLink: false,
    hasAboutLink: false,
    hasPrivacyLink: false,
    pagesDiscovered: 0,
    sitemapFound: false,
sitemapUrl: null,
sitemapPageCount: 0,
pagesAnalyzed: 0,
pagesFailed: 0,
pagesBlockedByRobots: 0,
robotsTxtChecked: false,
analyzedPages: [],
    headingOrderValid: false,
  };
}

function createEmptyCategoryScores(): CategoryScores {
  return {
    technical: 0,
    structure: 0,
    content: 0,
    trust: 0,
    overall: 0,
  };
}

function createFailedResult({
  httpStatus = null,
  errorMessage,
}: {
  httpStatus?: number | null;
  errorMessage: string;
}): WebsiteAnalysisResult {
  return {
    status: "failed",
    httpStatus,
    title: null,
    metaDescription: null,
    headings: {
      h1: [],
      h2: [],
    },
    extractedText: null,
    wordCount: 0,
    serviceSignals: [],
    trustSignals: [],
    technicalSignals: createEmptyTechnicalSignals(),
    categoryScores: createEmptyCategoryScores(),
    contentScore: 0,
    errorMessage,
  };
}

async function readTextWithLimit(response: Response) {
  const declaredLength = Number(
    response.headers.get("content-length") ?? 0
  );

  if (declaredLength > MAX_HTML_BYTES) {
    throw new Error(
      "Web sitesi içeriği izin verilen 2 MB sınırını aşıyor."
    );
  }

  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let totalBytes = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    totalBytes += value.byteLength;

    if (totalBytes > MAX_HTML_BYTES) {
      await reader.cancel();

      throw new Error(
        "Web sitesi içeriği izin verilen 2 MB sınırını aşıyor."
      );
    }

    text += decoder.decode(value, { stream: true });
  }

  return text + decoder.decode();
}

async function fetchWebsiteHtml(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    let currentUrl = (await assertPublicWebsiteUrl(url)).toString();

    for (
      let redirectCount = 0;
      redirectCount <= MAX_REDIRECTS;
      redirectCount += 1
    ) {
      const response = await fetch(currentUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; AIVisibilityAnalyzer/2.0)",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "manual",
        signal: controller.signal,
        cache: "no-store",
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");

        if (!location) {
          throw new Error(
            "Web sitesi geçersiz bir yönlendirme cevabı döndürdü."
          );
        }

        if (redirectCount === MAX_REDIRECTS) {
          throw new Error("Web sitesi çok fazla yönlendirme yaptı.");
        }

        currentUrl = (
          await assertPublicWebsiteUrl(
            new URL(location, currentUrl).toString()
          )
        ).toString();

        continue;
      }

      const contentType =
        response.headers.get("content-type") ?? "";

      const html = await readTextWithLimit(response);

      return {
        response,
        contentType,
        html,
        finalUrl: currentUrl,
      };
    }

    throw new Error("Web sitesi yönlendirmesi tamamlanamadı.");
  } finally {
    clearTimeout(timeout);
  }
}

export async function analyzeWebsite({
  url,
  industry,
}: {
  url: string;
  industry: string | null;
}): Promise<WebsiteAnalysisResult> {
  try {
    const {
      response,
      contentType,
      html,
      finalUrl,
    } = await fetchWebsiteHtml(url);

    if (!response.ok) {
      return createFailedResult({
        httpStatus: response.status,
        errorMessage: `Web sitesi ${response.status} durum kodu döndürdü.`,
      });
    }

    if (!contentType.includes("text/html")) {
      return createFailedResult({
        httpStatus: response.status,
        errorMessage:
          "Web sitesi analiz edilebilir bir HTML sayfası döndürmedi.",
      });
    }

    const title = extractTitle(html);
    const metaDescription = extractMetaDescription(html);
    const h1 = extractTagTexts(html, "h1");
    const h2 = extractTagTexts(html, "h2");

    const homepageText = stripHtml(html);

const linkedPageCrawl = await crawlLinkedPages({
  homepageHtml: html,
  homepageUrl: finalUrl,
});

const combinedText = [
  homepageText,
  ...linkedPageCrawl.pages.map((page) => page.text),
]
  .filter(Boolean)
  .join(" ");

const extractedText = combinedText.slice(
  0,
  MAX_STORED_TEXT_LENGTH
);

const searchableText = normalizeText(
  [
    title,
    metaDescription,
    h1.join(" "),
    h2.join(" "),
    combinedText.slice(0, MAX_SEARCHABLE_TEXT_LENGTH),
  ]
    .filter(Boolean)
    .join(" ")
);

    const keywordPreset = getWebsiteKeywordPreset(industry);
    const wordCount = getWordCount(combinedText);

    const serviceSignals = getSignals(
      searchableText,
      keywordPreset.serviceKeywords
    );

    const trustSignals = getSignals(
      searchableText,
      keywordPreset.trustKeywords
    );

    const robotsMeta = getMetaContent(html, "name", "robots");
    const xRobotsTag = response.headers.get("x-robots-tag");

    const robotsDirective =
      [robotsMeta, xRobotsTag].filter(Boolean).join(", ") || null;

    const openGraphTitle = getMetaContent(
      html,
      "property",
      "og:title"
    );

    const openGraphDescription = getMetaContent(
      html,
      "property",
      "og:description"
    );

    const openGraphImage = getMetaContent(
      html,
      "property",
      "og:image"
    );

    const linkSignals = extractLinkSignals(html, finalUrl);
    const imageSignals = extractImageSignals(html);

    const technicalSignals: TechnicalSignals = {
      finalUrl,
      isHttps: new URL(finalUrl).protocol === "https:",
      canonicalUrl: extractCanonicalUrl(html, finalUrl),
      robotsDirective,
      indexable: !normalizeText(robotsDirective ?? "").includes(
        "noindex"
      ),
      htmlLanguage: extractHtmlLanguage(html),
      hasViewport: Boolean(
        getMetaContent(html, "name", "viewport")
      ),
      hasFavicon:
        hasLinkRelation(html, "icon") ||
        hasLinkRelation(html, "shortcut"),
      hasManifest: hasLinkRelation(html, "manifest"),
      hasOpenGraph: Boolean(
        openGraphTitle ||
          openGraphDescription ||
          openGraphImage
      ),
      hasOpenGraphTitle: Boolean(openGraphTitle),
      hasOpenGraphDescription: Boolean(openGraphDescription),
      hasOpenGraphImage: Boolean(openGraphImage),
      hasTwitterCard: Boolean(
        getMetaContent(html, "name", "twitter:card")
      ),
      schemaTypes: extractSchemaTypes(html),
      ...imageSignals,
      ...linkSignals,
      headingOrderValid: extractHeadingOrderValidity(html),
      pagesDiscovered:
  linkedPageCrawl.discoveredPageCount + 1,
pagesAnalyzed:
  linkedPageCrawl.analyzedPageCount + 1,
pagesFailed:
  linkedPageCrawl.failedPageCount,
pagesBlockedByRobots:
  linkedPageCrawl.blockedByRobotsCount,
robotsTxtChecked:
  linkedPageCrawl.robotsChecked,

sitemapFound:
  linkedPageCrawl.sitemapFound,
sitemapUrl:
  linkedPageCrawl.sitemapUrl,
sitemapPageCount:
  linkedPageCrawl.sitemapPageCount,

analyzedPages: [
  {
    url: finalUrl,
    title,
    wordCount: getWordCount(homepageText),
  },
  ...linkedPageCrawl.pages.map((page) => ({
    url: page.url,
    title: page.title,
    wordCount: page.wordCount,
  })),
],
    };

    const categoryScores = calculateCategoryScores({
      title,
      metaDescription,
      headings: {
        h1,
        h2,
      },
      wordCount,
      serviceSignals,
      trustSignals,
      technicalSignals,
    });

    return {
      status: "completed",
      httpStatus: response.status,
      title,
      metaDescription,
      headings: {
        h1,
        h2,
      },
      extractedText,
      wordCount,
      serviceSignals,
      trustSignals,
      technicalSignals,
      categoryScores,
      contentScore: categoryScores.overall,
      errorMessage: null,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Web sitesi analiz edilirken bilinmeyen bir hata oluştu.";

    return createFailedResult({
      errorMessage,
    });
  }
}