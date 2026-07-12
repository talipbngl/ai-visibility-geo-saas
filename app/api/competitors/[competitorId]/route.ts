import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type CompetitorRouteProps = {
  params: Promise<{
    competitorId: string;
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

export async function POST(
  request: Request,
  { params }: CompetitorRouteProps
) {
  const { competitorId } = await params;

  const supabase = await createClient();

  const formData = await request.formData();

  const name = String(formData.get("name") ?? "").trim();
  const websiteUrl = normalizeWebsiteUrl(
    String(formData.get("websiteUrl") ?? "")
  );
  const description =
    String(formData.get("description") ?? "").trim() || null;
  const aliases = parseAliases(String(formData.get("aliases") ?? ""));

  if (!name) {
    return redirectTo(
      `/dashboard/brands?error=${encodeURIComponent("Rakip adı zorunludur.")}`,
      request.url
    );
  }

  const { data: competitor, error: competitorError } = await supabase
    .from("competitors")
    .select("id, brand_id")
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

  const { error: updateError } = await supabase
    .from("competitors")
    .update({
      name,
      website_url: websiteUrl,
      description,
    })
    .eq("id", competitor.id);

  if (updateError) {
    return redirectTo(
      `/dashboard/brands/${competitor.brand_id}/competitors?error=${encodeURIComponent(
        updateError.message
      )}`,
      request.url
    );
  }

  const { error: deleteAliasesError } = await supabase
    .from("competitor_aliases")
    .delete()
    .eq("competitor_id", competitor.id);

  if (deleteAliasesError) {
    return redirectTo(
      `/dashboard/brands/${competitor.brand_id}/competitors?error=${encodeURIComponent(
        deleteAliasesError.message
      )}`,
      request.url
    );
  }

  if (aliases.length > 0) {
    const { error: aliasesError } = await supabase
      .from("competitor_aliases")
      .insert(
        aliases.map((alias) => ({
          competitor_id: competitor.id,
          alias,
        }))
      );

    if (aliasesError) {
      return redirectTo(
        `/dashboard/brands/${competitor.brand_id}/competitors?error=${encodeURIComponent(
          aliasesError.message
        )}`,
        request.url
      );
    }
  }

  return redirectTo(
    `/dashboard/brands/${competitor.brand_id}/competitors`,
    request.url
  );
}