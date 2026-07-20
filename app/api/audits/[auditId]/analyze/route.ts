import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    auditId: string;
  }>;
};

type BrandAliasRecord = {
  alias: string;
};

type CompetitorAliasRecord = {
  alias: string;
};

type CompetitorRecord = {
  id: string;
  name: string;
  website_url: string | null;
  competitor_aliases?: CompetitorAliasRecord[] | null;
};

type CompletedRunRecord = {
  id: string;
  raw_answer: string | null;
  citations_json: unknown;
};
type MentionResult = {
  name: string;
  mentioned: boolean;
  first_index: number | null;
  rank: number | null;
  aliases: string[];
};

function redirectTo(path: string, requestUrl: string) {
  return NextResponse.redirect(new URL(path, requestUrl), {
    status: 303,
  });
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replaceAll("â", "a")
    .replaceAll("î", "i")
    .replaceAll("û", "u")
    .trim();
}

function uniqueStrings(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  );
}

function findFirstIndex(answer: string, terms: string[]) {
  const normalizedAnswer = normalizeText(answer);

  const indexes = terms
    .map((term) => normalizeText(term))
    .filter(Boolean)
    .map((term) => normalizedAnswer.indexOf(term))
    .filter((index) => index >= 0);

  if (indexes.length === 0) {
    return null;
  }

  return Math.min(...indexes);
}

function detectSentiment(answer: string, brandMentioned: boolean) {
  if (!brandMentioned) {
    return null;
  }

  const normalized = normalizeText(answer);

  const positiveWords = [
    "iyi",
    "kaliteli",
    "guvenilir",
    "onerilir",
    "onerilebilir",
    "basarili",
    "avantajli",
    "populer",
    "premium",
    "uygun",
    "faydali",
  ];

  const negativeWords = [
    "kotu",
    "pahali",
    "zayif",
    "guvenilir degil",
    "sorun",
    "eksik",
    "dusuk",
    "dezavantaj",
    "risk",
    "olumsuz",
  ];

  const positiveCount = positiveWords.filter((word) =>
    normalized.includes(word)
  ).length;

  const negativeCount = negativeWords.filter((word) =>
    normalized.includes(word)
  ).length;

  if (positiveCount > negativeCount) return "positive";
  if (negativeCount > positiveCount) return "negative";

  return "neutral";
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function analyzeAnswer(args: {
  answer: string;
  brandName: string;
  brandAliases: string[];
  competitors: CompetitorRecord[];
  citationSources: Array<{
    uri: string;
    title: string;
  }>;
}) {
  const brandTerms = uniqueStrings([args.brandName, ...args.brandAliases]);

  const brandFirstIndex = findFirstIndex(args.answer, brandTerms);
  const brandMentioned = brandFirstIndex !== null;

  const competitorMentionResults: MentionResult[] = args.competitors.map(
    (competitor) => {
      const aliases = uniqueStrings([
        competitor.name,
        ...(competitor.competitor_aliases ?? []).map((item) => item.alias),
      ]);

      const firstIndex = findFirstIndex(args.answer, aliases);

      return {
        name: competitor.name,
        aliases,
        mentioned: firstIndex !== null,
        first_index: firstIndex,
        rank: null,
      };
    }
  );

  const allMentionedItems = [
    {
      name: args.brandName,
      type: "brand",
      first_index: brandFirstIndex,
    },
    ...competitorMentionResults.map((competitor) => ({
      name: competitor.name,
      type: "competitor",
      first_index: competitor.first_index,
    })),
  ]
    .filter((item) => item.first_index !== null)
    .sort((a, b) => Number(a.first_index) - Number(b.first_index));

  const brandRank =
    allMentionedItems.findIndex((item) => item.type === "brand") >= 0
      ? allMentionedItems.findIndex((item) => item.type === "brand") + 1
      : null;

  const rankedCompetitors = competitorMentionResults.map((competitor) => {
    const rankIndex = allMentionedItems.findIndex(
      (item) => item.type === "competitor" && item.name === competitor.name
    );

    return {
      ...competitor,
      rank: rankIndex >= 0 ? rankIndex + 1 : null,
    };
  });

  const mentionedCompetitors = rankedCompetitors.filter(
    (competitor) => competitor.mentioned
  );

  const brandSentiment = detectSentiment(args.answer, brandMentioned);

  const riskNotes: string[] = [];
  const opportunityNotes: string[] = [];

  if (!brandMentioned && mentionedCompetitors.length > 0) {
    riskNotes.push(
      "Rakipler cevapta geçiyor ancak takip edilen marka görünmüyor."
    );
    opportunityNotes.push(
      "Bu prompt için içerik, karşılaştırma veya kategori sayfası güçlendirilmeli."
    );
  }

  if (brandMentioned && brandRank && brandRank > 1) {
    opportunityNotes.push(
      `Marka cevapta geçiyor ancak ${brandRank}. sırada. Daha güçlü otorite ve içerik sinyali gerekebilir.`
    );
  }

  if (brandMentioned && brandSentiment === "negative") {
    riskNotes.push("Marka cevapta olumsuz bağlamda geçiyor.");
  }

  if (brandMentioned && mentionedCompetitors.length > 0) {
    opportunityNotes.push(
      "Marka rakiplerle aynı cevapta geçiyor. Karşılaştırma içerikleriyle sıralama iyileştirilebilir."
    );
  }

  if (!brandMentioned && mentionedCompetitors.length === 0) {
    opportunityNotes.push(
      "Bu promptta hiçbir takip edilen marka/rakip görünmüyor. Prompt daha niş olabilir veya kategori sinyalleri zayıf olabilir."
    );
  }

  const summary = brandMentioned
    ? brandRank
      ? `${args.brandName} cevapta geçti ve yaklaşık ${brandRank}. sırada görünüyor.`
      : `${args.brandName} cevapta geçti.`
    : mentionedCompetitors.length > 0
      ? `${args.brandName} cevapta geçmedi; ancak ${mentionedCompetitors
          .map((item) => item.name)
          .join(", ")} gibi rakipler geçti.`
      : `${args.brandName} ve takip edilen rakipler cevapta görünmedi.`;

  return {
    brand_mentioned: brandMentioned,
    brand_rank: brandRank,
    brand_sentiment: brandSentiment,
    competitors_json: rankedCompetitors,
    sources_json: args.citationSources,
    summary,
    risk_notes_json: riskNotes,
    opportunity_notes_json: opportunityNotes,
    confidence_score: brandMentioned || mentionedCompetitors.length > 0 ? 0.75 : 0.55,
  };
}

function buildRecommendations(args: {
  auditId: string;
  brandName: string;
  visibilityScore: number;
  shareOfVoice: number;
  averageRank: number | null;
  positiveSentimentRate: number;
  opportunityScore: number;
  topCompetitorNames: string[];
}) {
  const recommendations = [];

  if (args.visibilityScore < 50) {
    recommendations.push({
      audit_id: args.auditId,
      category: "content",
      title: "Kategori ve satın alma niyetli içerikleri güçlendir",
      description: `${args.brandName}, test edilen promptların çoğunda görünmüyor. “En iyi”, “öneri”, “karşılaştırma”, “yeni başlayanlar için” gibi satın alma niyetli konularda landing page ve rehber içerikleri oluşturulmalı.`,
      priority: "high",
      effort: "medium",
      impact: "high",
      status: "open",
    });
  }

  if (args.shareOfVoice < 40 && args.topCompetitorNames.length > 0) {
    recommendations.push({
      audit_id: args.auditId,
      category: "competitor",
      title: "Rakip karşılaştırma sayfaları oluştur",
      description: `${args.topCompetitorNames.join(
        ", "
      )} gibi rakipler cevaplarda daha görünür. ${args.brandName} ile bu rakipleri karşılaştıran objektif içerikler hazırlanmalı.`,
      priority: "high",
      effort: "medium",
      impact: "high",
      status: "open",
    });
  }

  if (args.averageRank && args.averageRank > 2) {
    recommendations.push({
      audit_id: args.auditId,
      category: "authority",
      title: "Marka otoritesini ve güven sinyallerini artır",
      description: `${args.brandName} cevaplarda geçiyor ama genellikle ilk sırada değil. Ürün yorumları, uzman içerikleri, FAQ, hakkında sayfası ve üçüncü taraf incelemeler güçlendirilmeli.`,
      priority: "medium",
      effort: "medium",
      impact: "high",
      status: "open",
    });
  }

  if (args.positiveSentimentRate < 60) {
    recommendations.push({
      audit_id: args.auditId,
      category: "brand",
      title: "Marka anlatımını daha net ve güven verici hale getir",
      description: `AI cevaplarında marka tonu yeterince olumlu değil. Web sitesinde marka vaadi, kalite kanıtları, müşteri yorumları ve ürün farkları daha açık anlatılmalı.`,
      priority: "medium",
      effort: "low",
      impact: "medium",
      status: "open",
    });
  }

  if (args.opportunityScore > 30) {
    recommendations.push({
      audit_id: args.auditId,
      category: "geo",
      title: "Görünmeyen fakat rakiplerin çıktığı promptlara odaklan",
      description: `Rakiplerin görünüp ${args.brandName} markasının görünmediği promptlar fırsat alanı. Bu promptların ortak konularına göre yeni içerik kümeleri oluşturulmalı.`,
      priority: "high",
      effort: "medium",
      impact: "high",
      status: "open",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      audit_id: args.auditId,
      category: "monitoring",
      title: "Haftalık AI görünürlük takibi başlat",
      description: `${args.brandName} için temel görünürlük sinyalleri iyi görünüyor. Skorun korunması için haftalık audit ve rakip takip rutini oluşturulmalı.`,
      priority: "medium",
      effort: "low",
      impact: "medium",
      status: "open",
    });
  }

  return recommendations.slice(0, 5);
}

export async function POST(request: Request, context: RouteContext) {
  const { auditId } = await context.params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectTo("/login", request.url);
  }

  const { data: audit, error: auditError } = await supabase
    .from("audits")
    .select("id, brand_id, total_prompts")
    .eq("id", auditId)
    .maybeSingle();

  if (auditError || !audit) {
    return redirectTo(
      `/dashboard/audits?error=${encodeURIComponent(
        auditError?.message ?? "Audit bulunamadı."
      )}`,
      request.url
    );
  }

  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("id, name, website_url")
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

  const { data: brandAliasesData } = await supabase
    .from("brand_aliases")
    .select("alias")
    .eq("brand_id", brand.id);

  const brandAliases = ((brandAliasesData ?? []) as BrandAliasRecord[]).map(
    (item) => item.alias
  );

  const { data: competitorsData } = await supabase
    .from("competitors")
    .select(
      `
      id,
      name,
      website_url,
      competitor_aliases (
        alias
      )
    `
    )
    .eq("brand_id", brand.id);

  const competitors = (competitorsData ?? []) as CompetitorRecord[];

  const { data: runsData, error: runsError } = await supabase
    .from("audit_runs")
    .select("id, raw_answer, citations_json")
        .eq("audit_id", audit.id)
    .eq("status", "completed");

  if (runsError) {
    return redirectTo(
      `/dashboard/audits/${audit.id}?error=${encodeURIComponent(
        runsError.message
      )}`,
      request.url
    );
  }

  const completedRuns = ((runsData ?? []) as CompletedRunRecord[]).filter(
    (run) => run.raw_answer && run.raw_answer.trim().length > 0
  );

  if (completedRuns.length === 0) {
    return redirectTo(
      `/dashboard/audits/${audit.id}?error=${encodeURIComponent(
        "Analiz için en az 1 tamamlanmış Gemini cevabı gerekiyor."
      )}`,
      request.url
    );
  }

const analyses = completedRuns.map((run) => {
  const citationSources = getCitationSources(run.citations_json);

  const result = analyzeAnswer({
    answer: run.raw_answer ?? "",
    brandName: brand.name,
    brandAliases,
    competitors,
    citationSources,
  });

  return {
    audit_run_id: run.id,
    ...result,
  };
});

  const { error: analysesError } = await supabase
    .from("analyses")
    .upsert(analyses, {
      onConflict: "audit_run_id",
    });

  if (analysesError) {
    return redirectTo(
      `/dashboard/audits/${audit.id}?error=${encodeURIComponent(
        analysesError.message
      )}`,
      request.url
    );
  }

  const totalAnalyzed = analyses.length;
  const brandMentionCount = analyses.filter(
    (analysis) => analysis.brand_mentioned
  ).length;

  const brandRanks = analyses
    .map((analysis) => analysis.brand_rank)
    .filter((rank): rank is number => typeof rank === "number");

  const positiveMentions = analyses.filter(
    (analysis) => analysis.brand_sentiment === "positive"
  ).length;

  const competitorMentionCount = analyses.reduce((total, analysis) => {
    const competitorsJson = analysis.competitors_json as MentionResult[];

    return (
      total +
      competitorsJson.filter((competitor) => competitor.mentioned).length
    );
  }, 0);

  const competitorOnlyOpportunityCount = analyses.filter((analysis) => {
    const competitorsJson = analysis.competitors_json as MentionResult[];

    return (
      !analysis.brand_mentioned &&
      competitorsJson.some((competitor) => competitor.mentioned)
    );
  }).length;

  const competitorMentionTotals = new Map<string, number>();

  analyses.forEach((analysis) => {
    const competitorsJson = analysis.competitors_json as MentionResult[];

    competitorsJson.forEach((competitor) => {
      if (!competitor.mentioned) return;

      competitorMentionTotals.set(
        competitor.name,
        (competitorMentionTotals.get(competitor.name) ?? 0) + 1
      );
    });
  });

  const topCompetitorNames = Array.from(competitorMentionTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)
    .slice(0, 3);

  const visibilityScore = round((brandMentionCount / totalAnalyzed) * 100);

  const shareOfVoice =
    brandMentionCount + competitorMentionCount > 0
      ? round(
          (brandMentionCount /
            (brandMentionCount + competitorMentionCount)) *
            100
        )
      : 0;

  const averageRank =
    brandRanks.length > 0
      ? round(
          brandRanks.reduce((total, rank) => total + rank, 0) /
            brandRanks.length
        )
      : null;

  const positiveSentimentRate =
    brandMentionCount > 0
      ? round((positiveMentions / brandMentionCount) * 100)
      : 0;

  const competitorGapScore = round(
    100 - (competitorOnlyOpportunityCount / totalAnalyzed) * 100
  );

  const opportunityScore = round(
    (competitorOnlyOpportunityCount / totalAnalyzed) * 100
  );
  const brandHostname = getHostname(brand.website_url);

const sourcedRunCount = completedRuns.filter(
  (run) => getCitationSources(run.citations_json).length > 0
).length;

const brandSourceRunCount = completedRuns.filter((run) =>
  getCitationSources(run.citations_json).some((source) =>
    sourceMatchesHostname(source.uri, brandHostname)
  )
).length;

const citationScore = round(
  ((sourcedRunCount / totalAnalyzed) * 70) +
    ((brandSourceRunCount / totalAnalyzed) * 30)
);
function getCitationSources(value: unknown) {
  if (!value || typeof value !== "object") return [];

  const data = value as {
    sources?: Array<{
      uri?: string;
      title?: string;
    }>;
  };

  if (!Array.isArray(data.sources)) return [];

  return data.sources
    .map((source) => ({
      uri: String(source.uri ?? ""),
      title: String(source.title ?? ""),
    }))
    .filter((source) => source.uri);
}

function getHostname(value: string | null) {
  if (!value) return null;

  try {
    const url = new URL(
      value.startsWith("http://") || value.startsWith("https://")
        ? value
        : `https://${value}`
    );

    return url.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function sourceMatchesHostname(sourceUri: string, hostname: string | null) {
  if (!hostname) return false;

  try {
    const sourceHostname = new URL(sourceUri).hostname.replace(/^www\./, "");

    return sourceHostname === hostname || sourceHostname.endsWith(`.${hostname}`);
  } catch {
    return false;
  }
}
  const { error: scoreError } = await supabase.from("audit_scores").upsert(
    {
      audit_id: audit.id,
      visibility_score: visibilityScore,
      share_of_voice: shareOfVoice,
      average_rank: averageRank,
      positive_sentiment_rate: positiveSentimentRate,
      citation_score: citationScore,
      competitor_gap_score: competitorGapScore,
      opportunity_score: opportunityScore,
    },
    {
      onConflict: "audit_id",
    }
  );

  if (scoreError) {
    return redirectTo(
      `/dashboard/audits/${audit.id}?error=${encodeURIComponent(
        scoreError.message
      )}`,
      request.url
    );
  }

  await supabase.from("recommendations").delete().eq("audit_id", audit.id);

  const recommendations = buildRecommendations({
    auditId: audit.id,
    brandName: brand.name,
    visibilityScore,
    shareOfVoice,
    averageRank,
    positiveSentimentRate,
    opportunityScore,
    topCompetitorNames,
  });

  const { error: recommendationsError } = await supabase
    .from("recommendations")
    .insert(recommendations);

  if (recommendationsError) {
    return redirectTo(
      `/dashboard/audits/${audit.id}?error=${encodeURIComponent(
        recommendationsError.message
      )}`,
      request.url
    );
  }

  const { count: remainingRuns } = await supabase
    .from("audit_runs")
    .select("id", { count: "exact", head: true })
    .eq("audit_id", audit.id)
    .in("status", ["pending", "running"]);

  await supabase
    .from("audits")
    .update({
      status: remainingRuns && remainingRuns > 0 ? "running" : "completed",
      completed_prompts: totalAnalyzed,
      completed_at:
        remainingRuns && remainingRuns > 0 ? null : new Date().toISOString(),
      error_message:
        remainingRuns && remainingRuns > 0
          ? `${remainingRuns} prompt henüz çalıştırılmadı. Skor tamamlanan cevaplara göre hesaplandı.`
          : null,
    })
    .eq("id", audit.id);

  return redirectTo(`/dashboard/audits/${audit.id}`, request.url);
}