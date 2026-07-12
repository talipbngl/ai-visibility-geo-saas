import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type PromptRouteProps = {
  params: Promise<{
    promptId: string;
  }>;
};

function redirectTo(path: string, requestUrl: string) {
  return NextResponse.redirect(new URL(path, requestUrl), {
    status: 303,
  });
}

export async function POST(request: Request, { params }: PromptRouteProps) {
  const { promptId } = await params;

  const supabase = await createClient();

  const formData = await request.formData();

  const promptSetId = String(formData.get("promptSetId") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();
  const intent = String(formData.get("intent") ?? "").trim();
  const priority = Number(formData.get("priority") ?? 3);
  const language = String(formData.get("language") ?? "").trim() || "tr";
  const country = String(formData.get("country") ?? "").trim() || "TR";
  const city = String(formData.get("city") ?? "").trim() || null;
  const isActive = formData.get("isActive") === "on";

  const { data: prompt, error: promptError } = await supabase
    .from("prompts")
    .select("id, brand_id")
    .eq("id", promptId)
    .maybeSingle();

  if (promptError || !prompt) {
    return redirectTo(
      `/dashboard/brands?error=${encodeURIComponent(
        promptError?.message ?? "Test sorusu bulunamadı."
      )}`,
      request.url
    );
  }

  if (!promptSetId) {
    return redirectTo(
      `/dashboard/prompts/${prompt.id}/edit?error=${encodeURIComponent(
        "Soru seti seçilmelidir."
      )}`,
      request.url
    );
  }

  if (!text) {
    return redirectTo(
      `/dashboard/prompts/${prompt.id}/edit?error=${encodeURIComponent(
        "Test sorusu metni zorunludur."
      )}`,
      request.url
    );
  }

  if (!intent) {
    return redirectTo(
      `/dashboard/prompts/${prompt.id}/edit?error=${encodeURIComponent(
        "Niyet seçilmelidir."
      )}`,
      request.url
    );
  }

  const safePriority = Number.isFinite(priority)
    ? Math.min(Math.max(priority, 1), 5)
    : 3;

  const { error: updateError } = await supabase
    .from("prompts")
    .update({
      prompt_set_id: promptSetId,
      text,
      intent,
      priority: safePriority,
      language,
      country,
      city,
      is_active: isActive,
    })
    .eq("id", prompt.id);

  if (updateError) {
    return redirectTo(
      `/dashboard/prompts/${prompt.id}/edit?error=${encodeURIComponent(
        updateError.message
      )}`,
      request.url
    );
  }

  return redirectTo(`/dashboard/brands/${prompt.brand_id}/prompts`, request.url);
}