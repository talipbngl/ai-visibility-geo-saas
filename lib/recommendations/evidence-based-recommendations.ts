type Signal = {
  keyword: string;
  count: number;
  found: boolean;
};

type ScoreInput = {
  visibility_score: number | null;
  share_of_voice: number | null;
  average_rank: number | null;
  positive_sentiment_rate: number | null;
  opportunity_score: number | null;
} | null;

type AnalysisInput = {
  brand_mentioned: boolean | null;
  brand_rank: number | null;
  brand_sentiment: string | null;
  competitors_json: unknown;
  summary: string | null;
  audit_runs?:
    | {
        prompt_text_snapshot?: string | null;
        prompt_intent_snapshot?: string | null;
      }
    | {
        prompt_text_snapshot?: string | null;
        prompt_intent_snapshot?: string | null;
      }[]
    | null;
};

type BrandWebsiteSnapshotInput = {
  content_score: number | null;
  service_signals_json: unknown;
  trust_signals_json: unknown;
  technical_signals_json: unknown;
} | null;

type CompetitorWebsiteSnapshotInput = {
  competitor_name: string;
  content_score: number | null;
  service_signals_json: unknown;
  trust_signals_json: unknown;
  technical_signals_json: unknown;
};

export type EvidenceRecommendation = {
  category: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  effort: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  status: "open";
};

type BuildEvidenceBasedRecommendationsInput = {
  brandName: string;
  score: ScoreInput;
  analyses: AnalysisInput[];
  brandWebsiteSnapshot: BrandWebsiteSnapshotInput;
  competitorWebsiteSnapshots: CompetitorWebsiteSnapshotInput[];
};

type CompetitorVisibility = {
  name: string;
  mentioned: boolean;
  rank: number | null;
};
type ContentType =
  | "service"
  | "about"
  | "contact"
  | "faq"
  | "guide"
  | "comparison"
  | "pricing";

type ContentCoverage = {
  checked: boolean;
  types: Set<ContentType>;
};

const contentTypes =
  new Set<ContentType>([
    "service",
    "about",
    "contact",
    "faq",
    "guide",
    "comparison",
    "pricing",
  ]);

const contentTypeLabels: Record<
  ContentType,
  string
> = {
  service: "Ürün veya hizmet",
  about: "Kurumsal",
  contact: "İletişim",
  faq: "Sık sorulan sorular",
  guide: "Rehber",
  comparison: "Karşılaştırma",
  pricing: "Fiyatlandırma",
};

const contentTypePriority: Record<
  ContentType,
  number
> = {
  faq: 7,
  guide: 6,
  comparison: 5,
  service: 4,
  pricing: 3,
  about: 2,
  contact: 1,
};
function toRecord(
  value: unknown
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value as Record<string, unknown>;
}

function getContentCoverage(
  value: unknown
): ContentCoverage {
  const technicalSignals =
    toRecord(value);

  const rawTypes =
    technicalSignals.contentTypesFound;

  if (!Array.isArray(rawTypes)) {
    return {
      checked: false,
      types: new Set<ContentType>(),
    };
  }

  const types = new Set(
    rawTypes.filter(
      (item): item is ContentType =>
        typeof item === "string" &&
        contentTypes.has(
          item as ContentType
        )
    )
  );

  if (
    technicalSignals.hasAboutLink === true
  ) {
    types.add("about");
  }

  if (
    technicalSignals.hasContactLink === true
  ) {
    types.add("contact");
  }

  return {
    checked: true,
    types,
  };
}
function toSignalArray(value: unknown): Signal[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const signal = item as Partial<Signal>;

      return {
        keyword: String(signal.keyword ?? ""),
        count: Number(signal.count ?? 0),
        found: Boolean(signal.found),
      };
    })
    .filter((item): item is Signal => Boolean(item?.keyword));
}

function getFoundKeywords(value: unknown) {
  return toSignalArray(value)
    .filter((signal) => signal.found)
    .map((signal) => signal.keyword);
}

function getMissingKeywords(value: unknown) {
  return toSignalArray(value)
    .filter((signal) => !signal.found)
    .map((signal) => signal.keyword);
}

function getNestedRun(analysis: AnalysisInput) {
  if (Array.isArray(analysis.audit_runs)) {
    return analysis.audit_runs[0] ?? null;
  }

  return analysis.audit_runs ?? null;
}

function getPromptIntent(analysis: AnalysisInput) {
  const run = getNestedRun(analysis);

  return run?.prompt_intent_snapshot ?? null;
}

function getMostCommonValues(values: string[], limit = 5) {
  const countMap = new Map<string, number>();

  values.forEach((value) => {
    if (!value) return;

    countMap.set(value, (countMap.get(value) ?? 0) + 1);
  });

  return Array.from(countMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value]) => value);
}

function getCompetitorMentionStats(analyses: AnalysisInput[]) {
  const stats = new Map<string, number>();

  analyses.forEach((analysis) => {
    const competitors = Array.isArray(analysis.competitors_json)
      ? (analysis.competitors_json as CompetitorVisibility[])
      : [];

    competitors.forEach((competitor) => {
      if (!competitor.mentioned) return;

      stats.set(competitor.name, (stats.get(competitor.name) ?? 0) + 1);
    });
  });

  return Array.from(stats.entries())
    .map(([name, mentionCount]) => ({
      name,
      mentionCount,
    }))
    .sort((a, b) => b.mentionCount - a.mentionCount);
}

function pushUniqueRecommendation(
  recommendations: EvidenceRecommendation[],
  recommendation: EvidenceRecommendation
) {
  const alreadyExists = recommendations.some(
    (item) => item.title === recommendation.title
  );

  if (!alreadyExists) {
    recommendations.push(recommendation);
  }
}

export function buildEvidenceBasedRecommendations({
  brandName,
  score,
  analyses,
  brandWebsiteSnapshot,
  competitorWebsiteSnapshots,
}: BuildEvidenceBasedRecommendationsInput) {
  const recommendations: EvidenceRecommendation[] = [];

  const visibilityScore = Number(score?.visibility_score ?? 0);
  const positiveSentimentRate = Number(score?.positive_sentiment_rate ?? 0);
  const averageRank = Number(score?.average_rank ?? 0);

  const visibleAnalyses = analyses.filter((analysis) => analysis.brand_mentioned);
  const invisibleAnalyses = analyses.filter(
    (analysis) => !analysis.brand_mentioned
  );

  const invisibleIntents = getMostCommonValues(
    invisibleAnalyses
      .map((analysis) => getPromptIntent(analysis))
      .filter((intent): intent is string => Boolean(intent))
  );

  const competitorStats = getCompetitorMentionStats(analyses);
  const strongestCompetitor = competitorStats[0] ?? null;

  const brandWebsiteScore = Number(brandWebsiteSnapshot?.content_score ?? 0);

  const brandFoundServiceKeywords = new Set(
    getFoundKeywords(brandWebsiteSnapshot?.service_signals_json)
  );

  const brandFoundTrustKeywords = new Set(
    getFoundKeywords(brandWebsiteSnapshot?.trust_signals_json)
  );

  const brandMissingServiceKeywords = getMissingKeywords(
    brandWebsiteSnapshot?.service_signals_json
  );

  const brandMissingTrustKeywords = getMissingKeywords(
    brandWebsiteSnapshot?.trust_signals_json
  );

  const competitorServiceKeywords = new Set(
    competitorWebsiteSnapshots.flatMap((snapshot) =>
      getFoundKeywords(snapshot.service_signals_json)
    )
  );

  const competitorTrustKeywords = new Set(
    competitorWebsiteSnapshots.flatMap((snapshot) =>
      getFoundKeywords(snapshot.trust_signals_json)
    )
  );

  const competitorOnlyServiceKeywords = Array.from(
    competitorServiceKeywords
  ).filter((keyword) => !brandFoundServiceKeywords.has(keyword));

  const competitorOnlyTrustKeywords = Array.from(competitorTrustKeywords).filter(
    (keyword) => !brandFoundTrustKeywords.has(keyword)
  );

  const averageCompetitorWebsiteScore =
    competitorWebsiteSnapshots.length > 0
      ? Math.round(
          competitorWebsiteSnapshots.reduce(
            (sum, snapshot) => sum + Number(snapshot.content_score ?? 0),
            0
          ) / competitorWebsiteSnapshots.length
        )
      : null;
      const brandContentCoverage =
  getContentCoverage(
    brandWebsiteSnapshot
      ?.technical_signals_json
  );

const competitorContentCoverages =
  competitorWebsiteSnapshots
    .map((snapshot) => ({
      name: snapshot.competitor_name,
      coverage: getContentCoverage(
        snapshot.technical_signals_json
      ),
    }))
    .filter(
      (competitor) =>
        competitor.coverage.checked
    );

const competitorContentGaps =
  Array.from(contentTypes)
    .map((contentType) => {
      if (
        !brandContentCoverage.checked ||
        brandContentCoverage.types.has(
          contentType
        )
      ) {
        return null;
      }

      const competitorsWithType =
        competitorContentCoverages.filter(
          (competitor) =>
            competitor.coverage.types.has(
              contentType
            )
        );

      if (
        competitorsWithType.length === 0
      ) {
        return null;
      }

      return {
        type: contentType,
        competitorCount:
          competitorsWithType.length,
      };
    })
    .filter(
      (
        gap
      ): gap is {
        type: ContentType;
        competitorCount: number;
      } => gap !== null
    )
    .sort((first, second) => {
      if (
        second.competitorCount !==
        first.competitorCount
      ) {
        return (
          second.competitorCount -
          first.competitorCount
        );
      }

      return (
        contentTypePriority[second.type] -
        contentTypePriority[first.type]
      );
    })
    .slice(0, 3);

  if (!brandWebsiteSnapshot) {
    pushUniqueRecommendation(recommendations, {
      category: "website",
      title: "Marka website analizini tamamla",
      description:
        "Bu raporda website sinyalleri bulunmuyor. Marka görünürlüğünün neden güçlü veya zayıf olduğunu daha iyi yorumlamak için önce website analizi yapılmalı.",
      priority: "high",
      effort: "low",
      impact: "high",
      status: "open",
    });
  }

  if (brandWebsiteSnapshot && brandWebsiteScore < 50) {
    pushUniqueRecommendation(recommendations, {
      category: "website",
      title: "Ana sayfa içerik sinyallerini güçlendir",
      description: `${brandName} website skoru ${Math.round(
        brandWebsiteScore
      )}/100 görünüyor. Title, meta açıklama, H1/H2 başlıkları, hizmet açıklamaları, SSS ve güven unsurları daha net hale getirilmeli.`,
      priority: "high",
      effort: "medium",
      impact: "high",
      status: "open",
    });
  }

  if (
    averageCompetitorWebsiteScore !== null &&
    brandWebsiteScore + 10 < averageCompetitorWebsiteScore
  ) {
    pushUniqueRecommendation(recommendations, {
      category: "competitor",
      title: "Rakip website sinyal farkını kapat",
      description: `${brandName} website skoru ${Math.round(
        brandWebsiteScore
      )}/100 iken analiz edilen rakip ortalaması ${averageCompetitorWebsiteScore}/100. Rakiplerin ana sayfa içerik, hizmet ve güven sinyalleri incelenerek eksik kalan alanlar güçlendirilmeli.`,
      priority: "high",
      effort: "medium",
      impact: "high",
      status: "open",
    });
  }
if (competitorContentGaps.length > 0) {
  const gapSummary =
    competitorContentGaps
      .map(
        (gap) =>
          `${contentTypeLabels[gap.type]} (${gap.competitorCount}/${competitorContentCoverages.length} rakipte)`
      )
      .join(", ");

  pushUniqueRecommendation(
    recommendations,
    {
      category: "competitor",
      title:
        "Rakiplerde bulunan içerik boşluklarını kapat",
      description: `Rakip web sitesi analizlerinde bulunan fakat ${brandName} sitesinde belirgin olarak görülmeyen içerik türleri: ${gapSummary}. Rakiplerin metinlerini kopyalamadan, markanın müşterilerine özgü daha açıklayıcı sayfalar hazırlanmalı.`,
      priority: "high",
      effort: "medium",
      impact: "high",
      status: "open",
    }
  );
}
  if (competitorOnlyServiceKeywords.length > 0) {
    pushUniqueRecommendation(recommendations, {
      category: "content",
      title: "Rakiplerde bulunan hizmet sinyallerini içerikte güçlendir",
      description: `Rakip website analizlerinde görünen ama markada zayıf kalan hizmet sinyalleri: ${competitorOnlyServiceKeywords
        .slice(0, 8)
        .join(
          ", "
        )}. Bu hizmetler için ayrı açıklama blokları, SSS alanları veya hizmet sayfaları hazırlanmalı.`,
      priority: "high",
      effort: "medium",
      impact: "high",
      status: "open",
    });
  }

  if (competitorOnlyTrustKeywords.length > 0) {
    pushUniqueRecommendation(recommendations, {
      category: "trust",
      title: "Güven sinyallerini rakip seviyesine yaklaştır",
      description: `Rakiplerde görünen ama markada zayıf kalan güven sinyalleri: ${competitorOnlyTrustKeywords
        .slice(0, 8)
        .join(
          ", "
        )}. Website üzerinde yorumlar, referanslar, iletişim bilgileri, SSS, hakkımızda ve güven unsurları daha görünür hale getirilmeli.`,
      priority: "medium",
      effort: "low",
      impact: "high",
      status: "open",
    });
  }

  if (brandMissingServiceKeywords.length > 0 && visibilityScore < 50) {
    pushUniqueRecommendation(recommendations, {
      category: "content",
      title: "Görünmediğin hizmet niyetleri için içerik üret",
      description: `AI görünürlük skoru düşük ve website analizinde bazı hizmet sinyalleri eksik görünüyor: ${brandMissingServiceKeywords
        .slice(0, 8)
        .join(
          ", "
        )}. Bu konular için kullanıcı sorularına doğrudan cevap veren kısa, net ve hizmet odaklı içerikler hazırlanmalı.`,
      priority: "high",
      effort: "medium",
      impact: "high",
      status: "open",
    });
  }

  if (brandMissingTrustKeywords.length > 0 && positiveSentimentRate < 70) {
    pushUniqueRecommendation(recommendations, {
      category: "trust",
      title: "Marka güven anlatımını güçlendir",
      description: `Olumlu ton oranı sınırlı ve website tarafında bazı güven sinyalleri eksik görünüyor: ${brandMissingTrustKeywords
        .slice(0, 8)
        .join(
          ", "
        )}. Kullanıcı yorumları, uzmanlık bilgileri, açık iletişim bilgileri ve sık sorulan sorular bölümü güçlendirilmeli.`,
      priority: "medium",
      effort: "low",
      impact: "medium",
      status: "open",
    });
  }

  if (invisibleAnalyses.length > 0) {
    pushUniqueRecommendation(recommendations, {
      category: "content",
      title: "Markanın görünmediği soru tiplerine özel sayfalar oluştur",
      description:
        invisibleIntents.length > 0
          ? `Marka özellikle şu soru niyetlerinde görünmüyor: ${invisibleIntents.join(
              ", "
            )}. Bu niyetlere karşılık gelen rehber, karşılaştırma, hizmet ve SSS içerikleri oluşturulmalı.`
          : `Marka ${invisibleAnalyses.length} test sorusunda görünmedi. Görünmediği sorular incelenerek bu sorulara cevap veren sayfa ve içerikler hazırlanmalı.`,
      priority: "high",
      effort: "medium",
      impact: "high",
      status: "open",
    });
  }

  if (strongestCompetitor && strongestCompetitor.mentionCount > visibleAnalyses.length) {
    pushUniqueRecommendation(recommendations, {
      category: "competitor",
      title: "En güçlü rakibe karşı karşılaştırma içeriği hazırla",
      description: `${strongestCompetitor.name}, AI cevaplarında ${strongestCompetitor.mentionCount} kez görünürken ${brandName} ${visibleAnalyses.length} kez göründü. Bu rakibe karşı avantajları anlatan karşılaştırma, alternatif ve kategori rehberi içerikleri hazırlanmalı.`,
      priority: "medium",
      effort: "medium",
      impact: "high",
      status: "open",
    });
  }

  if (averageRank > 2) {
    pushUniqueRecommendation(recommendations, {
      category: "content",
      title: "İlk öneri konumuna çıkmak için kategori otoritesini artır",
      description: `${brandName} cevaplarda geçtiğinde ortalama sıra ${averageRank}. Marka cevapta görünse bile çoğu zaman ilk seçenek olmayabilir. Kategori otoritesi, uzmanlık anlatımı, karşılaştırma içerikleri ve sosyal kanıtlar güçlendirilmeli.`,
      priority: "medium",
      effort: "medium",
      impact: "medium",
      status: "open",
    });
  }

  if (recommendations.length === 0) {
    pushUniqueRecommendation(recommendations, {
      category: "measurement",
      title: "Düzenli AI görünürlük takibi yap",
      description:
        "Mevcut ölçümde kritik bir eksik sinyal tespit edilmedi. Yine de AI cevapları zamanla değişebileceği için haftalık veya aylık ölçüm tekrarıyla görünürlük trendi takip edilmeli.",
      priority: "low",
      effort: "low",
      impact: "medium",
      status: "open",
    });
  }

  return recommendations.slice(0, 8);
}