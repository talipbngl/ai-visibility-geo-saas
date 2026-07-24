import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  analyzeWebsite,
  normalizeWebsiteUrl,
} from "@/lib/website-analysis/analyze-website";
import { createClient } from "@/lib/supabase/server";

type WebsiteAnalysisRouteProps = {
  params: Promise<{
    brandId: string;
  }>;
};

function redirectTo(path: string, requestUrl: string) {
  return NextResponse.redirect(new URL(path, requestUrl), {
    status: 303,
  });
}

export async function POST(
  request: Request,
  { params }: WebsiteAnalysisRouteProps
) {
  const { brandId } = await params;

  const supabase = await createClient();

  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("id, name, website_url, industry")
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

  try {
    const parsedUrl = new URL(websiteUrl);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return redirectTo(
        `/dashboard/brands/${brand.id}/website?error=${encodeURIComponent(
          "Sadece http veya https website adresleri analiz edilebilir."
        )}`,
        request.url
      );
    }
  } catch {
    return redirectTo(
      `/dashboard/brands/${brand.id}/website?error=${encodeURIComponent(
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
    .from("brand_website_snapshots")
    .insert({
      brand_id: brand.id,
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
        console.error("Web sitesi analiz sonucu kaydedilemedi:", insertError);

        return redirectTo(
          `/dashboard/brands/${brand.id}/website?error=${encodeURIComponent(
            "Analiz tamamlandı ancak sonuçlar kaydedilemedi."
          )}`,
          request.url
        );
      }

  revalidatePath(`/dashboard/brands/${brand.id}/website`);
  revalidatePath(`/dashboard/brands/${brand.id}`);

  if (result.status === "failed") {
    return redirectTo(
      `/dashboard/brands/${brand.id}/website?error=${encodeURIComponent(
        result.errorMessage ?? "Website analiz edilemedi."
      )}`,
      request.url
    );
  }

  return redirectTo(`/dashboard/brands/${brand.id}/website`, request.url);
}