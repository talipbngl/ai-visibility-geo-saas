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

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Bilinmeyen hata.";
}

export async function replaceAuditRecommendations({
  auditId,
  brandId,
  brandName,
}: ReplaceAuditRecommendationsInput): Promise<ReplaceAuditRecommendationsResult> {
  const normalizedAuditId = auditId.trim();
  const normalizedBrandId = brandId.trim();
  const normalizedBrandName = brandName
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim();

  if (!normalizedAuditId) {
    return {
      success: false,
      error: "Ölçüm kimliği gereklidir.",
    };
  }

  if (!normalizedBrandId) {
    return {
      success: false,
      error: "Marka kimliği gereklidir.",
    };
  }

  if (!normalizedBrandName) {
    return {
      success: false,
      error: "Marka adı gereklidir.",
    };
  }

  try {
    const supabase = await createClient();

    const { data: score, error: scoreError } = await supabase
      .from("audit_scores")
      .select(
        "visibility_score, share_of_voice, average_rank, positive_sentiment_rate, opportunity_score"
      )
      .eq("audit_id", normalizedAuditId)
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
      .eq("audit_runs.audit_id", normalizedAuditId);

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
      .eq("brand_id", normalizedBrandId)
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
      .eq("brand_id", normalizedBrandId)
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
      const competitorName =
        typeof competitor?.name === "string"
          ? competitor.name
              .normalize("NFKC")
              .replace(/\s+/gu, " ")
              .trim()
          : "";

      return {
        competitor_name: competitorName || "Rakip",
        content_score: snapshot.content_score,
        service_signals_json: snapshot.service_signals_json,
        trust_signals_json: snapshot.trust_signals_json,
        technical_signals_json:
          snapshot.technical_signals_json,
      };
    });

    const recommendations =
      buildEvidenceBasedRecommendations({
        brandName: normalizedBrandName,
        score,
        analyses: analyses ?? [],
        brandWebsiteSnapshot,
        competitorWebsiteSnapshots:
          latestCompetitorWebsiteSnapshots,
      });

    const {
      data: replacedRecommendationCount,
      error: replaceError,
    } = await supabase.rpc(
      "replace_audit_recommendations",
      {
        p_audit_id: normalizedAuditId,
        p_recommendations: recommendations,
      }
    );

    if (replaceError) {
      return {
        success: false,
        error: `Öneriler atomik olarak yenilenemedi: ${replaceError.message}`,
      };
    }

    return {
      success: true,
      recommendationCount:
        typeof replacedRecommendationCount === "number" &&
        Number.isInteger(replacedRecommendationCount) &&
        replacedRecommendationCount >= 0
          ? replacedRecommendationCount
          : recommendations.length,
    };
  } catch (error) {
    return {
      success: false,
      error: `Öneriler yenilenirken beklenmeyen bir hata oluştu: ${errorMessage(
        error
      )}`,
    };
  }
}