import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { replaceAuditRecommendations } from "@/lib/recommendations/replace-audit-recommendations";
import { createClient } from "@/lib/supabase/server";

type RefreshRecommendationsRouteProps = {
  params: Promise<{
    auditId: string;
  }>;
};

function redirectTo(path: string, requestUrl: string) {
  return NextResponse.redirect(new URL(path, requestUrl), {
    status: 303,
  });
}

export async function POST(
  request: Request,
  { params }: RefreshRecommendationsRouteProps
) {
  const { auditId } = await params;

  const supabase = await createClient();

  const { data: audit, error: auditError } = await supabase
    .from("audits")
    .select("id, brand_id")
    .eq("id", auditId)
    .maybeSingle();

  if (auditError || !audit) {
    return redirectTo(
      `/dashboard/audits?error=${encodeURIComponent(
        auditError?.message ?? "Ölçüm bulunamadı."
      )}`,
      request.url
    );
  }

  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("id, name")
    .eq("id", audit.brand_id)
    .maybeSingle();

  if (brandError || !brand) {
    return redirectTo(
      `/dashboard/audits/${audit.id}?error=${encodeURIComponent(
        brandError?.message ?? "Marka bulunamadı."
      )}`,
      request.url
    );
  }

  const result = await replaceAuditRecommendations({
    auditId: audit.id,
    brandId: brand.id,
    brandName: brand.name,
  });

  if (!result.success) {
    return redirectTo(
      `/dashboard/audits/${audit.id}/report?error=${encodeURIComponent(
        result.error
      )}`,
      request.url
    );
  }

  revalidatePath(`/dashboard/audits/${audit.id}`);
  revalidatePath(`/dashboard/audits/${audit.id}/report`);
  revalidatePath(
    `/dashboard/audits/${audit.id}/client-report`
  );

  return redirectTo(
    `/dashboard/audits/${audit.id}/report`,
    request.url
  );
}