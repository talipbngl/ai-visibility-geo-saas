import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const createPromptSetSchema = z.object({
  name: z.string().min(2, "Prompt set adı en az 2 karakter olmalı."),
  description: z.string().trim().optional().default(""),
});

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function redirectTo(path: string, requestUrl: string) {
  return NextResponse.redirect(new URL(path, requestUrl), {
    status: 303,
  });
}

type RouteContext = {
  params: Promise<{
    brandId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { brandId } = await context.params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectTo("/login", request.url);
  }

  const formData = await request.formData();

  const parsed = createPromptSetSchema.safeParse({
    name: getString(formData, "name"),
    description: getString(formData, "description"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Form geçersiz.";

    return redirectTo(
      `/dashboard/brands/${brandId}/prompts?error=${encodeURIComponent(
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

  const { error } = await supabase.from("prompt_sets").insert({
    brand_id: brand.id,
    name: parsed.data.name,
    description: parsed.data.description || null,
  });

  if (error) {
    return redirectTo(
      `/dashboard/brands/${brandId}/prompts?error=${encodeURIComponent(
        error.message
      )}`,
      request.url
    );
  }

  return redirectTo(`/dashboard/brands/${brandId}/prompts`, request.url);
}