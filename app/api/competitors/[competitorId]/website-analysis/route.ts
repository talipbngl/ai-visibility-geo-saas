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
    console.error("Rakip bilgisi alınamadı:", competitorError);

    return redirectTo(
      `/dashboard/brands?error=${encodeURIComponent(
        "Rakip bulunamadı veya bu rakibe erişilemiyor."
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
    console.error("Rakibe bağlı marka alınamadı:", brandError);

    return redirectTo(
      `/dashboard/brands?error=${encodeURIComponent(
        "Rakibin bağlı olduğu marka bulunamadı."
      )}`,
      request.url
    );
  }

  const resultsPath = `/dashboard/brands/${competitor.brand_id}/competitors/websites`;
  const websiteUrl = normalizeWebsiteUrl(competitor.website_url);

  if (!websiteUrl) {
    return redirectTo(
      `${resultsPath}?error=${encodeURIComponent(
        "Bu rakip için web sitesi adresi bulunamadı."
      )}`,
      request.url
    );
  }

  try {
    const parsedUrl = new URL(websiteUrl);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return redirectTo(
        `${resultsPath}?error=${encodeURIComponent(
          "Sadece HTTP veya HTTPS web sitesi adresleri analiz edilebilir."
        )}`,
        request.url
      );
    }
  } catch {
    return redirectTo(
      `${resultsPath}?error=${encodeURIComponent(
        "Web sitesi adresi geçerli değil."
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
      technical_signals_json: result.technicalSignals,
      category_scores_json: result.categoryScores,
      content_score: result.contentScore,
      error_message: result.errorMessage,
    });

  if (insertError) {
    console.error(
      "Rakip web sitesi analiz sonucu kaydedilemedi:",
      insertError
    );

    return redirectTo(
      `${resultsPath}?error=${encodeURIComponent(
        "Analiz tamamlandı ancak sonuçlar kaydedilemedi."
      )}`,
      request.url
    );
  }

  revalidatePath(
    `/dashboard/brands/${competitor.brand_id}/competitors`
  );
  revalidatePath(resultsPath);

  if (result.status === "failed") {
    return redirectTo(
      `${resultsPath}?error=${encodeURIComponent(
        "Rakibin web sitesi analiz edilemedi. Adresi kontrol edip tekrar deneyin."
      )}`,
      request.url
    );
  }

  return redirectTo(resultsPath, request.url);
}