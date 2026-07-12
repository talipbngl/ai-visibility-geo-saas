import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

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

  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("id, workspace_id, name")
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

  const { data: prompts, error: promptsError } = await supabase
    .from("prompts")
    .select("id, text, intent, priority, language, country, city")
    .eq("brand_id", brand.id)
    .eq("is_active", true)
    .eq("is_archived", false)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(10);

  if (promptsError) {
    return redirectTo(
      `/dashboard/brands/${brand.id}/prompts?error=${encodeURIComponent(
        promptsError.message
      )}`,
      request.url
    );
  }

  if (!prompts || prompts.length === 0) {
    return redirectTo(
      `/dashboard/brands/${brand.id}/prompts?error=${encodeURIComponent(
        "Ölçüm başlatmak için en az 1 aktif test sorusu gerekiyor."
      )}`,
      request.url
    );
  }

  const { data: audit, error: auditError } = await supabase
    .from("audits")
    .insert({
      workspace_id: brand.workspace_id,
      brand_id: brand.id,
      status: "pending",
      total_prompts: prompts.length,
      completed_prompts: 0,
    })
    .select("id")
    .single();

  if (auditError || !audit) {
    return redirectTo(
      `/dashboard/brands/${brand.id}/prompts?error=${encodeURIComponent(
        auditError?.message ?? "Ölçüm oluşturulamadı."
      )}`,
      request.url
    );
  }

  const { error: runsError } = await supabase.from("audit_runs").insert(
    prompts.map((prompt) => ({
      audit_id: audit.id,
      prompt_id: prompt.id,

      prompt_text_snapshot: prompt.text,
      prompt_intent_snapshot: prompt.intent,
      prompt_priority_snapshot: prompt.priority,
      prompt_language_snapshot: prompt.language,
      prompt_country_snapshot: prompt.country,
      prompt_city_snapshot: prompt.city,

      engine: "gemini",
      model: process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite",
      status: "pending",
    }))
  );

  if (runsError) {
    await supabase
      .from("audits")
      .update({
        status: "failed",
        error_message: runsError.message,
      })
      .eq("id", audit.id);

    return redirectTo(
      `/dashboard/audits/${audit.id}?error=${encodeURIComponent(
        runsError.message
      )}`,
      request.url
    );
  }

  return redirectTo(`/dashboard/audits/${audit.id}`, request.url);
}