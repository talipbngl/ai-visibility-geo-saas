import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { buildEvidenceBasedRecommendations } from "@/lib/recommendations/evidence-based-recommendations";
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

  const { data: score } = await supabase
    .from("audit_scores")
    .select(
      "visibility_score, share_of_voice, average_rank, positive_sentiment_rate, opportunity_score"
    )
    .eq("audit_id", audit.id)
    .maybeSingle();

  const { data: analyses } = await supabase
    .from("analyses")
    .select(
      `
      id,
      brand_mentioned,
      brand_rank,
      brand_sentiment,
      competitors_json,
      summary,
      audit_runs (
        id,
        audit_id,
        prompt_text_snapshot,
        prompt_intent_snapshot
      )
    `
    )
    .eq("audit_runs.audit_id", audit.id);

  const { data: brandWebsiteSnapshots } = await supabase
    .from("brand_website_snapshots")
    .select(
      "id, content_score, service_signals_json, trust_signals_json, created_at"
    )
    .eq("brand_id", brand.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1);

  const brandWebsiteSnapshot = brandWebsiteSnapshots?.[0] ?? null;

  const { data: competitorWebsiteSnapshots } = await supabase
    .from("competitor_website_snapshots")
    .select(
      `
      id,
      competitor_id,
      content_score,
      service_signals_json,
      trust_signals_json,
      created_at,
      competitors (
        id,
        name
      )
    `
    )
    .eq("brand_id", brand.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false });

  const latestCompetitorWebsiteSnapshotMap = new Map<
    string,
    NonNullable<typeof competitorWebsiteSnapshots>[number]
  >();

  (competitorWebsiteSnapshots ?? []).forEach((snapshot) => {
    if (!latestCompetitorWebsiteSnapshotMap.has(snapshot.competitor_id)) {
      latestCompetitorWebsiteSnapshotMap.set(snapshot.competitor_id, snapshot);
    }
  });

  const latestCompetitorWebsiteSnapshots = Array.from(
    latestCompetitorWebsiteSnapshotMap.values()
  ).map((snapshot) => {
    const competitor = Array.isArray(snapshot.competitors)
      ? snapshot.competitors[0]
      : snapshot.competitors;

    return {
      competitor_name: competitor?.name ?? "Rakip",
      content_score: snapshot.content_score,
      service_signals_json: snapshot.service_signals_json,
      trust_signals_json: snapshot.trust_signals_json,
    };
  });

  const recommendations = buildEvidenceBasedRecommendations({
    brandName: brand.name,
    score,
    analyses: analyses ?? [],
    brandWebsiteSnapshot,
    competitorWebsiteSnapshots: latestCompetitorWebsiteSnapshots,
  });

  const { error: deleteError } = await supabase
    .from("recommendations")
    .delete()
    .eq("audit_id", audit.id);

  if (deleteError) {
    return redirectTo(
      `/dashboard/audits/${audit.id}/report?error=${encodeURIComponent(
        deleteError.message
      )}`,
      request.url
    );
  }

  const { error: insertError } = await supabase.from("recommendations").insert(
    recommendations.map((recommendation) => ({
      audit_id: audit.id,
      ...recommendation,
    }))
  );

  if (insertError) {
    return redirectTo(
      `/dashboard/audits/${audit.id}/report?error=${encodeURIComponent(
        insertError.message
      )}`,
      request.url
    );
  }

  revalidatePath(`/dashboard/audits/${audit.id}`);
  revalidatePath(`/dashboard/audits/${audit.id}/report`);

  return redirectTo(`/dashboard/audits/${audit.id}/report`, request.url);
}