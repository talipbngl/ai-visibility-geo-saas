import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type RestorePromptRouteProps = {
  params: Promise<{
    promptId: string;
  }>;
};

function redirectTo(path: string, requestUrl: string) {
  return NextResponse.redirect(new URL(path, requestUrl), {
    status: 303,
  });
}

export async function POST(
  request: Request,
  { params }: RestorePromptRouteProps
) {
  const { promptId } = await params;

  const supabase = await createClient();

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

  const { error: updateError } = await supabase
    .from("prompts")
    .update({
      is_archived: false,
      archived_at: null,
      is_active: true,
    })
    .eq("id", prompt.id);

  if (updateError) {
    return redirectTo(
      `/dashboard/brands/${prompt.brand_id}/prompts/archived?error=${encodeURIComponent(
        updateError.message
      )}`,
      request.url
    );
  }

  revalidatePath(`/dashboard/brands/${prompt.brand_id}/prompts`);
  revalidatePath(`/dashboard/brands/${prompt.brand_id}/prompts/archived`);

  return redirectTo(
    `/dashboard/brands/${prompt.brand_id}/prompts/archived`,
    request.url
  );
}