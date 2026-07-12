import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getWebsiteKeywordPreset } from "@/lib/website-analysis/keyword-presets";
import { createClient } from "@/lib/supabase/server";

type WebsiteAnalysisRouteProps = {
  params: Promise<{
    brandId: string;
  }>;
};

type SignalResult = {
  keyword: string;
  count: number;
  found: boolean;
};



function redirectTo(path: string, requestUrl: string) {
  return NextResponse.redirect(new URL(path, requestUrl), {
    status: 303,
  });
}

function normalizeWebsiteUrl(value: string | null) {
  if (!value) return null;

  const trimmedValue = value.trim();

  if (!trimmedValue) return null;

  if (trimmedValue.startsWith("http://") || trimmedValue.startsWith("https://")) {
    return trimmedValue;
  }

  return `https://${trimmedValue}`;
}

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
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
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
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
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  return match ? stripHtml(match[1]).slice(0, 300) : null;
}

function extractMetaDescription(html: string) {
  const match = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i
  );

  if (match?.[1]) {
    return decodeHtmlEntities(match[1]).trim().slice(0, 500);
  }

  const reverseMatch = html.match(
    /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i
  );

  return reverseMatch?.[1]
    ? decodeHtmlEntities(reverseMatch[1]).trim().slice(0, 500)
    : null;
}

function extractTagTexts(html: string, tagName: "h1" | "h2") {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "gi");
  const results: string[] = [];

  for (const match of html.matchAll(regex)) {
    const text = stripHtml(match[1]).trim();

    if (text) {
      results.push(text.slice(0, 200));
    }

    if (results.length >= 12) break;
  }

  return results;
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

function calculateContentScore({
  title,
  metaDescription,
  h1Count,
  wordCount,
  serviceSignals,
  trustSignals,
}: {
  title: string | null;
  metaDescription: string | null;
  h1Count: number;
  wordCount: number;
  serviceSignals: SignalResult[];
  trustSignals: SignalResult[];
}) {
  let score = 0;

  if (title) score += 10;
  if (metaDescription) score += 10;
  if (h1Count > 0) score += 10;

  score += Math.min(Math.round(wordCount / 100), 20);

  const foundServiceCount = serviceSignals.filter((signal) => signal.found).length;
  const foundTrustCount = trustSignals.filter((signal) => signal.found).length;

  score += Math.min(foundServiceCount * 5, 25);
  score += Math.min(foundTrustCount * 3, 25);

  return Math.min(score, 100);
}

async function fetchWebsiteHtml(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AIVisibilityBot/1.0; +https://example.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") ?? "";
    const html = await response.text();

    return {
      response,
      contentType,
      html,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(
  request: Request,
  { params }: WebsiteAnalysisRouteProps
) {
  const { brandId } = await params;

  const supabase = await createClient();

  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("id, name, website_url,industry")
    .eq("id", brandId)
    .maybeSingle();

  if (brandError || !brand) {
    return redirectTo(
      `/dashboard/brands?error=${encodeURIComponent(
        brandError?.message ?? "Marka bulunamadı."
      )}`,
      request.url
    );
  }

  const websiteUrl = normalizeWebsiteUrl(brand.website_url);

  if (!websiteUrl) {
    return redirectTo(
      `/dashboard/brands/${brand.id}/website?error=${encodeURIComponent(
        "Bu marka için website URL bulunamadı. Önce marka bilgilerine website ekle."
      )}`,
      request.url
    );
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(websiteUrl);
  } catch {
    return redirectTo(
      `/dashboard/brands/${brand.id}/website?error=${encodeURIComponent(
        "Website URL geçerli değil."
      )}`,
      request.url
    );
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return redirectTo(
      `/dashboard/brands/${brand.id}/website?error=${encodeURIComponent(
        "Sadece http veya https website adresleri analiz edilebilir."
      )}`,
      request.url
    );
  }

  try {
    const { response, contentType, html } = await fetchWebsiteHtml(websiteUrl);

    if (!response.ok) {
      await supabase.from("brand_website_snapshots").insert({
        brand_id: brand.id,
        website_url: websiteUrl,
        status: "failed",
        http_status: response.status,
        error_message: `Website ${response.status} durum kodu döndürdü.`,
      });

      return redirectTo(
        `/dashboard/brands/${brand.id}/website?error=${encodeURIComponent(
          `Website analiz edilemedi. HTTP durum kodu: ${response.status}`
        )}`,
        request.url
      );
    }

    if (!contentType.includes("text/html")) {
      await supabase.from("brand_website_snapshots").insert({
        brand_id: brand.id,
        website_url: websiteUrl,
        status: "failed",
        http_status: response.status,
        error_message: `Website HTML içerik döndürmedi. Content-Type: ${contentType}`,
      });

      return redirectTo(
        `/dashboard/brands/${brand.id}/website?error=${encodeURIComponent(
          "Website HTML içerik döndürmedi."
        )}`,
        request.url
      );
    }

    const title = extractTitle(html);
    const metaDescription = extractMetaDescription(html);
    const h1 = extractTagTexts(html, "h1");
    const h2 = extractTagTexts(html, "h2");
    const extractedText = stripHtml(html).slice(0, 15_000);
    const searchableText = normalizeText(
      [title, metaDescription, h1.join(" "), h2.join(" "), extractedText]
        .filter(Boolean)
        .join(" ")
    );
const keywordPreset = getWebsiteKeywordPreset(brand.industry);
    const wordCount = getWordCount(extractedText);
    const serviceSignals = getSignals(
  searchableText,
  keywordPreset.serviceKeywords
);

const trustSignals = getSignals(
  searchableText,
  keywordPreset.trustKeywords
);

    const contentScore = calculateContentScore({
      title,
      metaDescription,
      h1Count: h1.length,
      wordCount,
      serviceSignals,
      trustSignals,
    });

    const { error: insertError } = await supabase
      .from("brand_website_snapshots")
      .insert({
        brand_id: brand.id,
        website_url: websiteUrl,
        status: "completed",
        http_status: response.status,
        title,
        meta_description: metaDescription,
        headings_json: {
          h1,
          h2,
        },
        extracted_text: extractedText,
        word_count: wordCount,
        service_signals_json: serviceSignals,
        trust_signals_json: trustSignals,
        content_score: contentScore,
      });

    if (insertError) {
      return redirectTo(
        `/dashboard/brands/${brand.id}/website?error=${encodeURIComponent(
          insertError.message
        )}`,
        request.url
      );
    }

    revalidatePath(`/dashboard/brands/${brand.id}/website`);
    revalidatePath(`/dashboard/brands/${brand.id}`);

    return redirectTo(`/dashboard/brands/${brand.id}/website`, request.url);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Website analiz edilirken bilinmeyen hata oluştu.";

    await supabase.from("brand_website_snapshots").insert({
      brand_id: brand.id,
      website_url: websiteUrl,
      status: "failed",
      error_message: message,
    });

    return redirectTo(
      `/dashboard/brands/${brand.id}/website?error=${encodeURIComponent(
        message
      )}`,
      request.url
    );
  }
}