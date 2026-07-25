import { assertPublicWebsiteUrl } from "@/lib/security/public-website-url";
import { discoverSitemapPages } from "@/lib/website-analysis/discover-sitemap-pages";
const MAX_LINKED_PAGES = 5;
const MAX_REDIRECTS = 3;
const MAX_PAGE_BYTES = 512 * 1024;
const MAX_ROBOTS_BYTES = 100 * 1024;
const REQUEST_TIMEOUT_MS = 6_000;
const CONCURRENCY = 3;
const MAX_PAGE_TEXT_LENGTH = 20_000;

export type CrawledPage = {
  url: string;
  title: string | null;
  text: string;
  wordCount: number;
};

export type LinkedPageCrawlResult = {
  discoveredPageCount: number;
  analyzedPageCount: number;
  failedPageCount: number;
  blockedByRobotsCount: number;
  robotsChecked: boolean;
  pages: CrawledPage[];
  sitemapFound: boolean;
  sitemapUrl: string | null;
  sitemapPageCount: number;
};

function normalizeHostname(hostname: string) {
  return hostname
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/\.$/, "");
}

function isSameWebsite(firstUrl: string, secondUrl: string) {
  return (
    normalizeHostname(new URL(firstUrl).hostname) ===
    normalizeHostname(new URL(secondUrl).hostname)
  );
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

function extractTitle(html: string) {
  const match = html.match(
    /<title[^>]*>([\s\S]*?)<\/title>/i
  );

  return match?.[1]
    ? stripHtml(match[1]).slice(0, 300)
    : null;
}

function getHref(tag: string) {
  const match = tag.match(
    /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i
  );

  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

function getWordCount(text: string) {
  if (!text) return 0;

  return text.split(/\s+/).filter(Boolean).length;
}

async function readTextWithLimit(
  response: Response,
  byteLimit: number
) {
  const declaredLength = Number(
    response.headers.get("content-length") ?? 0
  );

  if (declaredLength > byteLimit) {
    throw new Error("İçerik boyutu izin verilen sınırı aşıyor.");
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

    if (totalBytes > byteLimit) {
      await reader.cancel();

      throw new Error(
        "İçerik boyutu izin verilen sınırı aşıyor."
      );
    }

    text += decoder.decode(value, {
      stream: true,
    });
  }

  return text + decoder.decode();
}

async function fetchPublicText({
  url,
  homepageUrl,
  byteLimit,
  requireHtml,
}: {
  url: string;
  homepageUrl: string;
  byteLimit: number;
  requireHtml: boolean;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  try {
    let currentUrl = (
      await assertPublicWebsiteUrl(url)
    ).toString();

    if (!isSameWebsite(currentUrl, homepageUrl)) {
      throw new Error(
        "Farklı alan adına yönelen adres taranamaz."
      );
    }

    for (
      let redirectCount = 0;
      redirectCount <= MAX_REDIRECTS;
      redirectCount += 1
    ) {
      const response = await fetch(currentUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; AIVisibilityAnalyzer/2.0)",
          Accept: requireHtml
            ? "text/html,application/xhtml+xml"
            : "text/plain,*/*",
        },
        redirect: "manual",
        signal: controller.signal,
        cache: "no-store",
      });

      if (
        response.status >= 300 &&
        response.status < 400
      ) {
        const location =
          response.headers.get("location");

        if (
          !location ||
          redirectCount === MAX_REDIRECTS
        ) {
          throw new Error(
            "Sayfa yönlendirmesi tamamlanamadı."
          );
        }

        const redirectedUrl = (
          await assertPublicWebsiteUrl(
            new URL(location, currentUrl).toString()
          )
        ).toString();

        if (
          !isSameWebsite(
            redirectedUrl,
            homepageUrl
          )
        ) {
          throw new Error(
            "Sayfa farklı bir alan adına yönlendirildi."
          );
        }

        currentUrl = redirectedUrl;
        continue;
      }

      if (!response.ok) {
        throw new Error(
          `Sayfa ${response.status} durum kodu döndürdü.`
        );
      }

      const contentType =
        response.headers.get("content-type") ?? "";

      if (
        requireHtml &&
        !contentType.includes("text/html")
      ) {
        throw new Error(
          "Sayfa HTML içerik döndürmedi."
        );
      }

      const text = await readTextWithLimit(
        response,
        byteLimit
      );

      return {
        text,
        finalUrl: currentUrl,
      };
    }

    throw new Error(
      "Sayfa yönlendirmesi tamamlanamadı."
    );
  } finally {
    clearTimeout(timeout);
  }
}

function shouldSkipUrl(url: URL) {
  const path = url.pathname.toLowerCase();

  const skippedPaths =
    /\/(admin|wp-admin|login|register|account|cart|checkout|search|giris|kayit|hesabim|sepet|odeme)(\/|$)/i;

  const skippedExtensions =
    /\.(jpg|jpeg|png|gif|webp|svg|pdf|zip|rar|mp4|mp3|css|js|xml|json|doc|docx|xls|xlsx)$/i;

  return (
    skippedPaths.test(path) ||
    skippedExtensions.test(path)
  );
}

function getPagePriority(url: URL) {
  const normalizedPath = url.pathname
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");

  const importantTerms = [
    "hizmet",
    "service",
    "urun",
    "product",
    "hakkimizda",
    "about",
    "iletisim",
    "contact",
    "sss",
    "faq",
    "cozum",
    "solution",
    "kategori",
    "category",
  ];

  let score = 0;

  for (const term of importantTerms) {
    if (normalizedPath.includes(term)) {
      score += 20;
    }
  }

  const segmentCount = normalizedPath
    .split("/")
    .filter(Boolean).length;

  score += Math.max(0, 10 - segmentCount * 2);

  return score;
}
function getPageCategory(url: string) {
  const pathname = new URL(url).pathname
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");

  if (
    [
      "hizmet",
      "service",
      "urun",
      "product",
      "cozum",
      "solution",
      "tedavi",
      "uygulama",
      "kategori",
      "collection",
    ].some((term) => pathname.includes(term))
  ) {
    return "service";
  }

  if (
    [
      "hakkimizda",
      "about",
      "kurumsal",
      "ekibimiz",
      "team",
    ].some((term) => pathname.includes(term))
  ) {
    return "about";
  }

  if (
    [
      "iletisim",
      "contact",
      "sube",
      "location",
      "konum",
    ].some((term) => pathname.includes(term))
  ) {
    return "contact";
  }

  if (
    [
      "sik-sorulan",
      "sss",
      "faq",
    ].some((term) => pathname.includes(term))
  ) {
    return "faq";
  }

  if (
    [
      "blog",
      "rehber",
      "guide",
      "makale",
      "article",
      "bilgi",
    ].some((term) => pathname.includes(term))
  ) {
    return "guide";
  }

  if (
    [
      "karsilastir",
      "comparison",
      "versus",
      "alternatif",
    ].some((term) => pathname.includes(term))
  ) {
    return "comparison";
  }

  if (
    [
      "fiyat",
      "pricing",
      "price",
      "ucret",
      "paket",
    ].some((term) => pathname.includes(term))
  ) {
    return "pricing";
  }

  return "other";
}

function selectDiverseCandidates(
  candidates: Array<{
    url: string;
    score: number;
  }>,
  limit: number
) {
  const selected: Array<{
    url: string;
    score: number;
  }> = [];

  const selectedUrls = new Set<string>();

  const preferredCategories = [
    "service",
    "about",
    "contact",
    "faq",
    "guide",
    "comparison",
    "pricing",
  ];

  for (const category of preferredCategories) {
    const candidate = candidates.find(
      (item) =>
        !selectedUrls.has(item.url) &&
        getPageCategory(item.url) === category
    );

    if (!candidate) continue;

    selected.push(candidate);
    selectedUrls.add(candidate.url);

    if (selected.length >= limit) {
      return selected;
    }
  }

  for (const candidate of candidates) {
    if (selectedUrls.has(candidate.url)) {
      continue;
    }

    selected.push(candidate);
    selectedUrls.add(candidate.url);

    if (selected.length >= limit) {
      break;
    }
  }

  return selected;
}

function extractCandidateUrls(
  homepageHtml: string,
  homepageUrl: string
) {
  const urls = new Map<
    string,
    {
      url: string;
      score: number;
    }
  >();

  const normalizedHomepage = new URL(
    homepageUrl
  );

  normalizedHomepage.hash = "";
  normalizedHomepage.search = "";

  const anchorTags =
    homepageHtml.match(/<a\b[^>]*>/gi) ?? [];

  for (const tag of anchorTags) {
    const href = getHref(tag);

    if (!href) continue;

    try {
      const resolvedUrl = new URL(
        href,
        homepageUrl
      );

      if (
        !["http:", "https:"].includes(
          resolvedUrl.protocol
        )
      ) {
        continue;
      }

      if (
        !isSameWebsite(
          resolvedUrl.toString(),
          homepageUrl
        )
      ) {
        continue;
      }

      resolvedUrl.hash = "";
      resolvedUrl.search = "";

      if (shouldSkipUrl(resolvedUrl)) {
        continue;
      }

      if (
        resolvedUrl.toString() ===
        normalizedHomepage.toString()
      ) {
        continue;
      }

      const normalizedUrl =
        resolvedUrl.toString();

      urls.set(normalizedUrl, {
        url: normalizedUrl,
        score: getPagePriority(resolvedUrl),
      });
    } catch {
      // Geçersiz bağlantılar taramaya alınmaz.
    }
  }

  return Array.from(urls.values()).sort(
    (first, second) =>
      second.score - first.score
  );
}

function parseRobotsDisallowRules(
  robotsText: string
) {
  const disallowRules: string[] = [];
  let appliesToAllBots = false;

  for (const rawLine of robotsText.split(/\r?\n/)) {
    const line = rawLine
      .split("#")[0]
      ?.trim();

    if (!line) continue;

    const separatorIndex = line.indexOf(":");

    if (separatorIndex === -1) continue;

    const directive = line
      .slice(0, separatorIndex)
      .trim()
      .toLowerCase();

    const value = line
      .slice(separatorIndex + 1)
      .trim();

    if (directive === "user-agent") {
      appliesToAllBots = value === "*";
      continue;
    }

    if (
      directive === "disallow" &&
      appliesToAllBots &&
      value
    ) {
      disallowRules.push(value);
    }
  }

  return disallowRules;
}

function isAllowedByRobots(
  url: string,
  disallowRules: string[]
) {
  const pathname = new URL(url).pathname;

  return !disallowRules.some((rule) => {
    const cleanRule = rule.split("*")[0];

    return cleanRule
      ? pathname.startsWith(cleanRule)
      : false;
  });
}

async function fetchRobotsRules(
  homepageUrl: string
) {
  try {
    const robotsUrl = new URL(
      "/robots.txt",
      homepageUrl
    ).toString();

    const result = await fetchPublicText({
      url: robotsUrl,
      homepageUrl,
      byteLimit: MAX_ROBOTS_BYTES,
      requireHtml: false,
    });

        return {
    checked: true,
    rules: parseRobotsDisallowRules(
        result.text
    ),
    robotsText: result.text,
    };
  } catch {
    return {
  checked: false,
  rules: [] as string[],
  robotsText: null,
};
  }
}

async function crawlPage({
  url,
  homepageUrl,
}: {
  url: string;
  homepageUrl: string;
}): Promise<CrawledPage | null> {
  try {
    const result = await fetchPublicText({
      url,
      homepageUrl,
      byteLimit: MAX_PAGE_BYTES,
      requireHtml: true,
    });

    const fullText = stripHtml(result.text);

    return {
      url: result.finalUrl,
      title: extractTitle(result.text),
      text: fullText.slice(
        0,
        MAX_PAGE_TEXT_LENGTH
      ),
      wordCount: getWordCount(fullText),
    };
  } catch {
    return null;
  }
}

export async function crawlLinkedPages({
  homepageUrl,
  homepageHtml,
}: {
  homepageUrl: string;
  homepageHtml: string;
}): Promise<LinkedPageCrawlResult> {
  const homepageCandidates =
  extractCandidateUrls(
    homepageHtml,
    homepageUrl
  );

const robots = await fetchRobotsRules(
  homepageUrl
);

const sitemap =
  await discoverSitemapPages({
    homepageUrl,
    robotsText: robots.robotsText,
  });

const mergedCandidates = new Map<
  string,
  {
    url: string;
    score: number;
  }
>();

for (const candidate of homepageCandidates) {
  mergedCandidates.set(
    candidate.url,
    candidate
  );
}

for (const sitemapUrl of sitemap.urls) {
  try {
    const url = new URL(sitemapUrl);

    if (shouldSkipUrl(url)) continue;

    const candidate = {
      url: sitemapUrl,
      score: getPagePriority(url) + 5,
    };

    const existing =
      mergedCandidates.get(sitemapUrl);

    if (
      !existing ||
      candidate.score > existing.score
    ) {
      mergedCandidates.set(
        sitemapUrl,
        candidate
      );
    }
  } catch {
    // Geçersiz sitemap adresleri atlanır.
  }
}

const candidates = Array.from(
  mergedCandidates.values()
).sort(
  (first, second) =>
    second.score - first.score
);

  const allowedCandidates = candidates.filter(
    (candidate) =>
      isAllowedByRobots(
        candidate.url,
        robots.rules
      )
  );

  const blockedByRobotsCount =
    candidates.length -
    allowedCandidates.length;

  const selectedCandidates =
  selectDiverseCandidates(
    allowedCandidates,
    MAX_LINKED_PAGES
  );
  const pages: CrawledPage[] = [];

  for (
    let index = 0;
    index < selectedCandidates.length;
    index += CONCURRENCY
  ) {
    const batch = selectedCandidates.slice(
      index,
      index + CONCURRENCY
    );

    const results = await Promise.all(
      batch.map((candidate) =>
        crawlPage({
          url: candidate.url,
          homepageUrl,
        })
      )
    );

    for (const result of results) {
      if (result) {
        pages.push(result);
      }
    }
  }

  return {
    sitemapFound: sitemap.found,
sitemapUrl: sitemap.sitemapUrl,
sitemapPageCount: sitemap.pageCount,
    discoveredPageCount: candidates.length,
    analyzedPageCount: pages.length,
    failedPageCount:
      selectedCandidates.length - pages.length,
    blockedByRobotsCount,
    robotsChecked: robots.checked,
    pages,
  };
}