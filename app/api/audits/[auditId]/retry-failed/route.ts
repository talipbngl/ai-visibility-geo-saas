import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type RetryFailedRouteProps = {
  params: Promise<{
    auditId: string;
  }>;
};

function redirectTo(path: string, requestUrl: string) {
  return NextResponse.redirect(new URL(path, requestUrl), {
    status: 303,
  });
}

export async function POST(request: Request, { params }: RetryFailedRouteProps) {
  const { auditId } = await params;

  const supabase = await createClient();

  const { data: audit, error: auditError } = await supabase
    .from("audits")
    .select("id, status")
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

  const { data: failedRuns, error: failedRunsError } = await supabase
    .from("audit_runs")
    .select("id")
    .eq("audit_id", audit.id)
    .eq("status", "failed");

  if (failedRunsError) {
    return redirectTo(
      `/dashboard/audits/${audit.id}?error=${encodeURIComponent(
        failedRunsError.message
      )}`,
      request.url
    );
  }

  if (!failedRuns || failedRuns.length === 0) {
    return redirectTo(
      `/dashboard/audits/${audit.id}?error=${encodeURIComponent(
        "Tekrar denenecek başarısız soru bulunamadı."
      )}`,
      request.url
    );
  }

  const failedRunIds = failedRuns.map((run) => run.id);

  const { error: updateRunsError } = await supabase
    .from("audit_runs")
    .update({
      status: "pending",
      error_message: null,
      started_at: null,
      completed_at: null,
    })
    .in("id", failedRunIds);

  if (updateRunsError) {
    return redirectTo(
      `/dashboard/audits/${audit.id}?error=${encodeURIComponent(
        updateRunsError.message
      )}`,
      request.url
    );
  }

  const { error: updateAuditError } = await supabase
    .from("audits")
    .update({
      status: "pending",
      error_message: null,
    })
    .eq("id", audit.id);

  if (updateAuditError) {
    return redirectTo(
      `/dashboard/audits/${audit.id}?error=${encodeURIComponent(
        updateAuditError.message
      )}`,
      request.url
    );
  }

  revalidatePath(`/dashboard/audits/${audit.id}`);
  revalidatePath(`/dashboard/audits/${audit.id}/report`);

  return redirectTo(`/dashboard/audits/${audit.id}`, request.url);
}