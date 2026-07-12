import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  analyzeWebsite,
  normalizeWebsiteUrl,
} from "@/lib/website-analysis/analyze-website";
import { createClient } from "@/lib/supabase/server";

type CompetitorWebsiteAnalysisRouteProps = {
  params: Promise<{
    competitorId: string;
  }>;
};

function redirectTo(path: string, requestUrl: string) {
  return NextResponse.redirect(new URL(path, requestUrl), {
    status: 303,
  });
}

export async function POST(
  request: Request,
  { params }: CompetitorWebsiteAnalysisRouteProps
) {
  const { competitorId } = await params;

  const supabase = await createClient();

  const { data: competitor, error: competitorError } = await supabase
    .from("competitors")
    .select("id, brand_id, name, website_url")
    .eq("id", competitorId)
    .maybeSingle();

  if (competitorError || !competitor) {
    return redirectTo(
      `/dashboard/brands?error=${encodeURIComponent(
        competitorError?.message ?? "Rakip bulunamadı."
      )}`,
      request.url
    );
  }

  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("id, industry")
    .eq("id", competitor.brand_id)
    .maybeSingle();

  if (brandError || !brand) {
    return redirectTo(
      `/dashboard/brands?error=${encodeURIComponent(
        brandError?.message ?? "Marka bulunamadı."
      )}`,
      request.url
    );
  }

  const websiteUrl = normalizeWebsiteUrl(competitor.website_url);

  if (!websiteUrl) {
    return redirectTo(
      `/dashboard/brands/${competitor.brand_id}/competitors/websites?error=${encodeURIComponent(
        "Bu rakip için website URL bulunamadı."
      )}`,
      request.url
    );
  }

  try {
    const parsedUrl = new URL(websiteUrl);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return redirectTo(
        `/dashboard/brands/${competitor.brand_id}/competitors/websites?error=${encodeURIComponent(
          "Sadece http veya https website adresleri analiz edilebilir."
        )}`,
        request.url
      );
    }
  } catch {
    return redirectTo(
      `/dashboard/brands/${competitor.brand_id}/competitors/websites?error=${encodeURIComponent(
        "Website URL geçerli değil."
      )}`,
      request.url
    );
  }

  const result = await analyzeWebsite({
    url: websiteUrl,
    industry: brand.industry,
  });

  const { error: insertError } = await supabase
    .from("competitor_website_snapshots")
    .insert({
      competitor_id: competitor.id,
      brand_id: competitor.brand_id,
      website_url: websiteUrl,
      status: result.status,
      http_status: result.httpStatus,
      title: result.title,
      meta_description: result.metaDescription,
      headings_json: result.headings,
      extracted_text: result.extractedText,
      word_count: result.wordCount,
      service_signals_json: result.serviceSignals,
      trust_signals_json: result.trustSignals,
      content_score: result.contentScore,
      error_message: result.errorMessage,
    });

  if (insertError) {
    return redirectTo(
      `/dashboard/brands/${competitor.brand_id}/competitors/websites?error=${encodeURIComponent(
        insertError.message
      )}`,
      request.url
    );
  }

  revalidatePath(`/dashboard/brands/${competitor.brand_id}/competitors`);
  revalidatePath(`/dashboard/brands/${competitor.brand_id}/competitors/websites`);

  if (result.status === "failed") {
    return redirectTo(
      `/dashboard/brands/${competitor.brand_id}/competitors/websites?error=${encodeURIComponent(
        result.errorMessage ?? "Rakip website analiz edilemedi."
      )}`,
      request.url
    );
  }

  return redirectTo(
    `/dashboard/brands/${competitor.brand_id}/competitors/websites`,
    request.url
  );
}