import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "closed",
  "rejected",
] as const;

type LeadStatus =
  (typeof LEAD_STATUSES)[number];

type RouteContext = {
  params: Promise<{
    leadId: string;
  }>;
};

function redirectTo(
  path: string,
  requestUrl: string
) {
  return NextResponse.redirect(
    new URL(path, requestUrl),
    {
      status: 303,
    }
  );
}

function isLeadStatus(
  value: string
): value is LeadStatus {
  return LEAD_STATUSES.includes(
    value as LeadStatus
  );
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  const { leadId } = await context.params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectTo(
      "/login",
      request.url
    );
  }

  if (!isPlatformAdmin(user.email)) {
    return redirectTo(
      "/dashboard",
      request.url
    );
  }

  const requestOrigin =
    new URL(request.url).origin;

  const origin =
    request.headers.get("origin");

  if (
    origin &&
    origin !== requestOrigin
  ) {
    return redirectTo(
      `/dashboard/leads?error=${encodeURIComponent(
        "Geçersiz istek kaynağı."
      )}`,
      request.url
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return redirectTo(
      `/dashboard/leads?error=${encodeURIComponent(
        "Form verisi okunamadı."
      )}`,
      request.url
    );
  }

  const status = String(
    formData.get("status") ?? ""
  ).trim();

  if (!isLeadStatus(status)) {
    return redirectTo(
      `/dashboard/leads?error=${encodeURIComponent(
        "Geçersiz lead durumu."
      )}`,
      request.url
    );
  }

  const supabaseAdmin =
    createAdminClient();

  const {
    data: updatedLead,
    error: updateError,
  } = await supabaseAdmin
    .from("lead_requests")
    .update({
      status,
    })
    .eq("id", leadId)
    .select("id")
    .maybeSingle();

  if (updateError || !updatedLead) {
    return redirectTo(
      `/dashboard/leads?error=${encodeURIComponent(
        updateError?.message ??
          "Rapor talebi bulunamadı."
      )}`,
      request.url
    );
  }

  revalidatePath("/dashboard/leads");

  return redirectTo(
    `/dashboard/leads?success=${encodeURIComponent(
      "Lead durumu güncellendi."
    )}`,
    request.url
  );
}