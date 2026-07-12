import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type ContinueAuditRouteProps = {
  params: Promise<{
    auditId: string;
  }>;
};

function redirectTo(path: string, requestUrl: string, status = 303) {
  return NextResponse.redirect(new URL(path, requestUrl), {
    status,
  });
}

export async function POST(
  request: Request,
  { params }: ContinueAuditRouteProps
) {
  const { auditId } = await params;

  const supabase = await createClient();

  const { data: audit, error: auditError } = await supabase
    .from("audits")
    .select("id")
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

  const { data: score } = await supabase
    .from("audit_scores")
    .select("id")
    .eq("audit_id", audit.id)
    .maybeSingle();

  if (score) {
    return redirectTo(`/dashboard/audits/${audit.id}/report`, request.url);
  }

  const { data: runs, error: runsError } = await supabase
    .from("audit_runs")
    .select("id, status")
    .eq("audit_id", audit.id);

  if (runsError) {
    return redirectTo(
      `/dashboard/audits/${audit.id}?error=${encodeURIComponent(
        runsError.message
      )}`,
      request.url
    );
  }

  if (!runs || runs.length === 0) {
    return redirectTo(
      `/dashboard/audits/${audit.id}?error=${encodeURIComponent(
        "Bu ölçüm için çalıştırılacak soru kaydı bulunamadı."
      )}`,
      request.url
    );
  }

  const failedCount = runs.filter((run) => run.status === "failed").length;
  const pendingCount = runs.filter((run) => run.status === "pending").length;
  const runningCount = runs.filter((run) => run.status === "running").length;
  const completedCount = runs.filter((run) => run.status === "completed").length;

  if (failedCount > 0) {
    return redirectTo(`/api/audits/${audit.id}/retry-failed`, request.url, 307);
  }

  if (pendingCount > 0 || runningCount > 0) {
    return redirectTo(`/api/audits/${audit.id}/run`, request.url, 307);
  }

  if (completedCount === runs.length) {
    return redirectTo(`/api/audits/${audit.id}/analyze`, request.url, 307);
  }

  return redirectTo(`/dashboard/audits/${audit.id}`, request.url);
}