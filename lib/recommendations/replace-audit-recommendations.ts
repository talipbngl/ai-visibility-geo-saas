import { buildEvidenceBasedRecommendations } from "@/lib/recommendations/evidence-based-recommendations";
import { createClient } from "@/lib/supabase/server";

type ReplaceAuditRecommendationsInput = {
  auditId: string;
  brandId: string;
  brandName: string;
};

type ReplaceAuditRecommendationsResult =
  | {
      success: true;
      recommendationCount: number;
    }
  | {
      success: false;
      error: string;
    };

export async function replaceAuditRecommendations({
  auditId,
  brandId,
  brandName,
}: ReplaceAuditRecommendationsInput): Promise<ReplaceAuditRecommendationsResult> {
  const supabase = await createClient();

  const { data: score, error: scoreError } = await supabase
    .from("audit_scores")
    .select(
      "visibility_score, share_of_voice, average_rank, positive_sentiment_rate, opportunity_score"
    )
    .eq("audit_id", auditId)
    .maybeSingle();

  if (scoreError) {
    return {
      success: false,
      error: `Ölçüm skorları alınamadı: ${scoreError.message}`,
    };
  }

  const { data: analyses, error: analysesError } = await supabase
    .from("analyses")
    .select(
      `
      id,
      audit_run_id,
      brand_mentioned,
      brand_rank,
      brand_sentiment,
      competitors_json,
      summary,
      audit_runs!inner (
        id,
        audit_id,
        prompt_text_snapshot,
        prompt_intent_snapshot
      )
    `
    )
    .eq("audit_runs.audit_id", auditId);

  if (analysesError) {
    return {
      success: false,
      error: `Ölçüm analizleri alınamadı: ${analysesError.message}`,
    };
  }

  const {
    data: brandWebsiteSnapshots,
    error: brandWebsiteSnapshotsError,
  } = await supabase
    .from("brand_website_snapshots")
    .select(
      "id, content_score, service_signals_json, trust_signals_json, technical_signals_json, created_at"
    )
    .eq("brand_id", brandId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1);

  if (brandWebsiteSnapshotsError) {
    return {
      success: false,
      error: `Marka web sitesi analizi alınamadı: ${brandWebsiteSnapshotsError.message}`,
    };
  }

  const brandWebsiteSnapshot =
    brandWebsiteSnapshots?.[0] ?? null;

  const {
    data: competitorWebsiteSnapshots,
    error: competitorWebsiteSnapshotsError,
  } = await supabase
    .from("competitor_website_snapshots")
    .select(
      `
      id,
      competitor_id,
      content_score,
      service_signals_json,
      trust_signals_json,
      technical_signals_json,
      created_at,
      competitors (
        id,
        name
      )
    `
    )
    .eq("brand_id", brandId)
    .eq("status", "completed")
    .order("created_at", { ascending: false });

  if (competitorWebsiteSnapshotsError) {
    return {
      success: false,
      error: `Rakip web sitesi analizleri alınamadı: ${competitorWebsiteSnapshotsError.message}`,
    };
  }

  type CompetitorWebsiteSnapshotRow = NonNullable<
    typeof competitorWebsiteSnapshots
  >[number];

  const latestCompetitorSnapshotMap = new Map<
    string,
    CompetitorWebsiteSnapshotRow
  >();

  (competitorWebsiteSnapshots ?? []).forEach((snapshot) => {
    if (
      !latestCompetitorSnapshotMap.has(snapshot.competitor_id)
    ) {
      latestCompetitorSnapshotMap.set(
        snapshot.competitor_id,
        snapshot
      );
    }
  });

  const latestCompetitorWebsiteSnapshots = Array.from(
    latestCompetitorSnapshotMap.values()
  ).map((snapshot) => {
    const competitor = Array.isArray(snapshot.competitors)
      ? snapshot.competitors[0]
      : snapshot.competitors;

    return {
      competitor_name: competitor?.name ?? "Rakip",
      content_score: snapshot.content_score,
      service_signals_json: snapshot.service_signals_json,
      trust_signals_json: snapshot.trust_signals_json,
      technical_signals_json:
        snapshot.technical_signals_json,
    };
  });

  const recommendations =
    buildEvidenceBasedRecommendations({
      brandName,
      score,
      analyses: analyses ?? [],
      brandWebsiteSnapshot,
      competitorWebsiteSnapshots:
        latestCompetitorWebsiteSnapshots,
    });

  const { error: deleteError } = await supabase
    .from("recommendations")
    .delete()
    .eq("audit_id", auditId);

  if (deleteError) {
    return {
      success: false,
      error: `Eski öneriler temizlenemedi: ${deleteError.message}`,
    };
  }

  const { error: insertError } = await supabase
    .from("recommendations")
    .insert(
      recommendations.map((recommendation) => ({
        audit_id: auditId,
        ...recommendation,
      }))
    );

  if (insertError) {
    return {
      success: false,
      error: `Yeni öneriler kaydedilemedi: ${insertError.message}`,
    };
  }

  return {
    success: true,
    recommendationCount: recommendations.length,
  };
}