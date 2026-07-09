import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const createPromptSchema = z.object({
  promptSetId: z.string().uuid("Geçerli bir prompt set seçilmeli."),
  text: z.string().min(5, "Prompt en az 5 karakter olmalı."),
  intent: z.string().min(2, "Intent zorunlu."),
  priority: z.coerce.number().int().min(1).max(5).default(3),
  language: z.string().trim().optional().default("tr"),
  country: z.string().trim().optional().default("TR"),
  city: z.string().trim().optional().default(""),
  isActive: z.string().optional(),
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

  const parsed = createPromptSchema.safeParse({
    promptSetId: getString(formData, "promptSetId"),
    text: getString(formData, "text"),
    intent: getString(formData, "intent"),
    priority: getString(formData, "priority") || "3",
    language: getString(formData, "language") || "tr",
    country: getString(formData, "country") || "TR",
    city: getString(formData, "city"),
    isActive: getString(formData, "isActive"),
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

  const { data: promptSet, error: promptSetError } = await supabase
    .from("prompt_sets")
    .select("id, brand_id")
    .eq("id", parsed.data.promptSetId)
    .eq("brand_id", brandId)
    .maybeSingle();

  if (promptSetError || !promptSet) {
    return redirectTo(
      `/dashboard/brands/${brandId}/prompts?error=${encodeURIComponent(
        promptSetError?.message ?? "Prompt set bulunamadı."
      )}`,
      request.url
    );
  }

  const { error } = await supabase.from("prompts").insert({
    prompt_set_id: promptSet.id,
    brand_id: brandId,
    text: parsed.data.text,
    intent: parsed.data.intent,
    priority: parsed.data.priority,
    language: parsed.data.language || "tr",
    country: parsed.data.country || "TR",
    city: parsed.data.city || null,
    is_active: parsed.data.isActive === "on",
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