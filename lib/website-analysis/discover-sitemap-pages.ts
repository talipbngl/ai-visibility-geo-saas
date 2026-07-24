import { assertPublicWebsiteUrl } from "@/lib/security/public-website-url";

const MAX_SITEMAP_BYTES = 1024 * 1024;
const MAX_SITEMAP_URLS = 300;
const MAX_CHILD_SITEMAPS = 3;
const MAX_REDIRECTS = 3;
const REQUEST_TIMEOUT_MS = 6_000;

export type SitemapDiscoveryResult = {
  found: boolean;
  sitemapUrl: string | null;
  pageCount: number;
  urls: string[];
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

function decodeXmlEntities(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

async function readTextWithLimit(response: Response) {
  const declaredLength = Number(
    response.headers.get("content-length") ?? 0
  );

  if (declaredLength > MAX_SITEMAP_BYTES) {
    throw new Error("Site haritası boyut sınırını aşıyor.");
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

    if (totalBytes > MAX_SITEMAP_BYTES) {
      await reader.cancel();

      throw new Error(
        "Site haritası boyut sınırını aşıyor."
      );
    }

    text += decoder.decode(value, {
      stream: true,
    });
  }

  return text + decoder.decode();
}

async function fetchSitemapText({
  url,
  homepageUrl,
}: {
  url: string;
  homepageUrl: string;
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
        "Site haritası farklı bir alan adına ait."
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
          Accept:
            "application/xml,text/xml,text/plain,*/*",
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
            "Site haritası yönlendirmesi tamamlanamadı."
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
            "Site haritası farklı bir alan adına yönlendirildi."
          );
        }

        currentUrl = redirectedUrl;
        continue;
      }

      if (!response.ok) {
        throw new Error(
          `Site haritası ${response.status} durum kodu döndürdü.`
        );
      }

      return {
        text: await readTextWithLimit(response),
        finalUrl: currentUrl,
      };
    }

    throw new Error(
      "Site haritası alınamadı."
    );
  } finally {
    clearTimeout(timeout);
  }
}

function extractLocations(xml: string) {
  const locations: string[] = [];

  for (const match of xml.matchAll(
    /<loc>\s*([\s\S]*?)\s*<\/loc>/gi
  )) {
    const location = match[1]?.trim();

    if (location) {
      locations.push(
        decodeXmlEntities(location)
      );
    }

    if (
      locations.length >=
      MAX_SITEMAP_URLS
    ) {
      break;
    }
  }

  return locations;
}

function getSitemapCandidates({
  homepageUrl,
  robotsText,
}: {
  homepageUrl: string;
  robotsText: string | null;
}) {
  const candidates = new Set<string>();

  if (robotsText) {
    for (const match of robotsText.matchAll(
      /^sitemap:\s*(.+)$/gim
    )) {
      const value = match[1]?.trim();

      if (!value) continue;

      try {
        candidates.add(
          new URL(value, homepageUrl).toString()
        );
      } catch {
        // Geçersiz site haritası adresleri atlanır.
      }
    }
  }

  candidates.add(
    new URL("/sitemap.xml", homepageUrl).toString()
  );

  return Array.from(candidates).slice(0, 5);
}

function normalizePageUrls(
  urls: string[],
  homepageUrl: string
) {
  const normalizedUrls = new Set<string>();

  for (const value of urls) {
    try {
      const url = new URL(value);

      if (
        !["http:", "https:"].includes(
          url.protocol
        )
      ) {
        continue;
      }

      if (
        !isSameWebsite(
          url.toString(),
          homepageUrl
        )
      ) {
        continue;
      }

      if (
        /\.(xml|jpg|jpeg|png|gif|webp|svg|pdf|zip|mp4|mp3)$/i.test(
          url.pathname
        )
      ) {
        continue;
      }

      url.hash = "";
      url.search = "";

      normalizedUrls.add(url.toString());

      if (
        normalizedUrls.size >=
        MAX_SITEMAP_URLS
      ) {
        break;
      }
    } catch {
      // Geçersiz sayfa adresleri atlanır.
    }
  }

  return Array.from(normalizedUrls);
}

export async function discoverSitemapPages({
  homepageUrl,
  robotsText,
}: {
  homepageUrl: string;
  robotsText: string | null;
}): Promise<SitemapDiscoveryResult> {
  const candidates = getSitemapCandidates({
    homepageUrl,
    robotsText,
  });

  for (const candidate of candidates) {
    try {
      const rootSitemap =
        await fetchSitemapText({
          url: candidate,
          homepageUrl,
        });

      const rootLocations =
        extractLocations(rootSitemap.text);

      if (rootLocations.length === 0) {
        continue;
      }

      const isSitemapIndex =
        /<sitemapindex\b/i.test(
          rootSitemap.text
        );

      if (!isSitemapIndex) {
        const urls = normalizePageUrls(
          rootLocations,
          homepageUrl
        );

        return {
          found: true,
          sitemapUrl: rootSitemap.finalUrl,
          pageCount: urls.length,
          urls,
        };
      }

      const childSitemaps =
        rootLocations.slice(
          0,
          MAX_CHILD_SITEMAPS
        );

      const childResults =
        await Promise.allSettled(
          childSitemaps.map((childUrl) =>
            fetchSitemapText({
              url: childUrl,
              homepageUrl,
            })
          )
        );

      const pageLocations: string[] = [];

      for (const result of childResults) {
        if (result.status !== "fulfilled") {
          continue;
        }

        pageLocations.push(
          ...extractLocations(
            result.value.text
          )
        );
      }

      const urls = normalizePageUrls(
        pageLocations,
        homepageUrl
      );

      return {
        found: true,
        sitemapUrl: rootSitemap.finalUrl,
        pageCount: urls.length,
        urls,
      };
    } catch {
      // Bir adres başarısızsa sonraki olası sitemap denenir.
    }
  }

  return {
    found: false,
    sitemapUrl: null,
    pageCount: 0,
    urls: [],
  };
}