import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type TogglePromptRouteProps = {
  params: Promise<{
    promptId: string;
  }>;
};

export async function POST(_request: Request, { params }: TogglePromptRouteProps) {
  const { promptId } = await params;

  const supabase = await createClient();

  const { data: prompt, error: promptError } = await supabase
    .from("prompts")
    .select(
      `
      id,
      is_active,
      prompt_sets (
        id,
        brand_id
      )
    `
    )
    .eq("id", promptId)
    .maybeSingle();

  if (promptError || !prompt) {
    return NextResponse.redirect(
      new URL("/dashboard/brands?error=Prompt bulunamadı", _request.url)
    );
  }

  const promptSet = Array.isArray(prompt.prompt_sets)
    ? prompt.prompt_sets[0]
    : prompt.prompt_sets;

  if (!promptSet?.brand_id) {
    return NextResponse.redirect(
      new URL("/dashboard/brands?error=Prompt seti bulunamadı", _request.url)
    );
  }

  const nextIsActive = !prompt.is_active;

  const { error: updateError } = await supabase
    .from("prompts")
    .update({
      is_active: nextIsActive,
    })
    .eq("id", prompt.id);

  if (updateError) {
    return NextResponse.redirect(
      new URL(
        `/dashboard/brands/${promptSet.brand_id}/prompts?error=Prompt güncellenemedi`,
        _request.url
      )
    );
  }

  revalidatePath(`/dashboard/brands/${promptSet.brand_id}/prompts`);

  redirect(`/dashboard/brands/${promptSet.brand_id}/prompts`);
}