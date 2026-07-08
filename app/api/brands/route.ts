import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const createBrandSchema = z.object({
  name: z.string().min(2, "Marka adı en az 2 karakter olmalı."),
  websiteUrl: z.string().trim().optional().default(""),
  industry: z.string().trim().optional().default(""),
  country: z.string().trim().optional().default("TR"),
  language: z.string().trim().optional().default("tr"),
  description: z.string().trim().optional().default(""),
  targetAudience: z.string().trim().optional().default(""),
  primaryOffer: z.string().trim().optional().default(""),
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

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectTo("/login", request.url);
  }

  const formData = await request.formData();

  const parsed = createBrandSchema.safeParse({
    name: getString(formData, "name"),
    websiteUrl: getString(formData, "websiteUrl"),
    industry: getString(formData, "industry"),
    country: getString(formData, "country") || "TR",
    language: getString(formData, "language") || "tr",
    description: getString(formData, "description"),
    targetAudience: getString(formData, "targetAudience"),
    primaryOffer: getString(formData, "primaryOffer"),
    aliases: getString(formData, "aliases"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Form geçersiz.";

    return redirectTo(
      `/dashboard/brands/new?error=${encodeURIComponent(message)}`,
      request.url
    );
  }

  const { data: workspaceId, error: workspaceError } = await supabase.rpc(
    "ensure_current_user_workspace"
  );

  if (workspaceError || !workspaceId) {
    return redirectTo(
      `/dashboard/brands/new?error=${encodeURIComponent(
        workspaceError?.message ?? "Workspace hazırlanamadı."
      )}`,
      request.url
    );
  }

  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .insert({
      workspace_id: workspaceId,
      name: parsed.data.name,
      website_url: normalizeWebsiteUrl(parsed.data.websiteUrl),
      industry: parsed.data.industry || null,
      country: parsed.data.country || "TR",
      language: parsed.data.language || "tr",
      description: parsed.data.description || null,
      target_audience: parsed.data.targetAudience || null,
      primary_offer: parsed.data.primaryOffer || null,
    })
    .select("id")
    .single();

  if (brandError || !brand) {
    return redirectTo(
      `/dashboard/brands/new?error=${encodeURIComponent(
        brandError?.message ?? "Marka oluşturulamadı."
      )}`,
      request.url
    );
  }

  const aliases = parseAliases(parsed.data.aliases);

  if (aliases.length > 0) {
    const { error: aliasesError } = await supabase.from("brand_aliases").insert(
      aliases.map((alias) => ({
        brand_id: brand.id,
        alias,
      }))
    );

    if (aliasesError) {
      return redirectTo(
        `/dashboard/brands/${brand.id}?error=${encodeURIComponent(
          aliasesError.message
        )}`,
        request.url
      );
    }
  }

  return redirectTo(`/dashboard/brands/${brand.id}`, request.url);
}