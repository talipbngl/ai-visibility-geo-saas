import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type BrandRouteProps = {
  params: Promise<{
    brandId: string;
  }>;
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

function parseAliases(value: string | null) {
  if (!value) return [];

  return Array.from(
    new Set(
      value
        .split("\n")
        .map((alias) => alias.trim())
        .filter(Boolean)
    )
  );
}

export async function POST(request: Request, { params }: BrandRouteProps) {
  const { brandId } = await params;

  const supabase = await createClient();

  const formData = await request.formData();

  const name = String(formData.get("name") ?? "").trim();
  const websiteUrl = normalizeWebsiteUrl(
    String(formData.get("websiteUrl") ?? "")
  );
  const industry = String(formData.get("industry") ?? "").trim() || null;
  const country = String(formData.get("country") ?? "").trim() || "TR";
  const language = String(formData.get("language") ?? "").trim() || "tr";
  const description = String(formData.get("description") ?? "").trim() || null;
  const targetAudience =
    String(formData.get("targetAudience") ?? "").trim() || null;
  const primaryOffer =
    String(formData.get("primaryOffer") ?? "").trim() || null;
  const aliases = parseAliases(String(formData.get("aliases") ?? ""));

  if (!name) {
    return redirectTo(
      `/dashboard/brands/${brandId}/edit?error=${encodeURIComponent(
        "Marka adı zorunludur."
      )}`,
      request.url
    );
  }

  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("id")
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

  const { error: updateError } = await supabase
    .from("brands")
    .update({
      name,
      website_url: websiteUrl,
      industry,
      country,
      language,
      description,
      target_audience: targetAudience,
      primary_offer: primaryOffer,
    })
    .eq("id", brand.id);

  if (updateError) {
    return redirectTo(
      `/dashboard/brands/${brand.id}/edit?error=${encodeURIComponent(
        updateError.message
      )}`,
      request.url
    );
  }

  const { error: deleteAliasesError } = await supabase
    .from("brand_aliases")
    .delete()
    .eq("brand_id", brand.id);

  if (deleteAliasesError) {
    return redirectTo(
      `/dashboard/brands/${brand.id}/edit?error=${encodeURIComponent(
        deleteAliasesError.message
      )}`,
      request.url
    );
  }

  if (aliases.length > 0) {
    const { error: aliasesError } = await supabase.from("brand_aliases").insert(
      aliases.map((alias) => ({
        brand_id: brand.id,
        alias,
      }))
    );

    if (aliasesError) {
      return redirectTo(
        `/dashboard/brands/${brand.id}/edit?error=${encodeURIComponent(
          aliasesError.message
        )}`,
        request.url
      );
    }
  }

  return redirectTo(`/dashboard/brands/${brand.id}`, request.url);
}