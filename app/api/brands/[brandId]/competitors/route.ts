import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const createCompetitorSchema = z.object({
  name: z.string().min(2, "Rakip adı en az 2 karakter olmalı."),
  websiteUrl: z.string().trim().optional().default(""),
  description: z.string().trim().optional().default(""),
  aliases: z.string().trim().optional().default(""),
});

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function normalizeWebsiteUrl(value: string) {
  if (!value) return null;

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `https://${value}`;
}

function parseAliases(value: string) {
  return value
    .split("\n")
    .map((alias) => alias.trim())
    .filter(Boolean);
}

function redirectTo(path: string, requestUrl: string) {
  return NextResponse.redirect(new URL(path, requestUrl), {
    status: 303,
  });
}

type CreateCompetitorRouteContext = {
  params: Promise<{
    brandId: string;
  }>;
};

export async function POST(
  request: Request,
  context: CreateCompetitorRouteContext
) {
  const { brandId } = await context.params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectTo("/login", request.url);
  }

  const formData = await request.formData();

  const parsed = createCompetitorSchema.safeParse({
    name: getString(formData, "name"),
    websiteUrl: getString(formData, "websiteUrl"),
    description: getString(formData, "description"),
    aliases: getString(formData, "aliases"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Form geçersiz.";

    return redirectTo(
      `/dashboard/brands/${brandId}/competitors?error=${encodeURIComponent(
        message
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

  const { data: competitor, error: competitorError } = await supabase
    .from("competitors")
    .insert({
      brand_id: brand.id,
      name: parsed.data.name,
      website_url: normalizeWebsiteUrl(parsed.data.websiteUrl),
      description: parsed.data.description || null,
    })
    .select("id")
    .single();

  if (competitorError || !competitor) {
    return redirectTo(
      `/dashboard/brands/${brandId}/competitors?error=${encodeURIComponent(
        competitorError?.message ?? "Rakip oluşturulamadı."
      )}`,
      request.url
    );
  }

  const aliases = parseAliases(parsed.data.aliases);

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
        `/dashboard/brands/${brandId}/competitors?error=${encodeURIComponent(
          aliasesError.message
        )}`,
        request.url
      );
    }
  }

  return redirectTo(`/dashboard/brands/${brandId}/competitors`, request.url);
}