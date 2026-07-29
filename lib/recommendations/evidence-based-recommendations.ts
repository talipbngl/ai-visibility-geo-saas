import { getIntentContentPlan } from "@/lib/recommendations/intent-content-actions";

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

type SignalCoverage = {
  checked: boolean;
  found: Map<string, string>;
  missing: Map<string, string>;
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

function normalizeText(value: string) {
  return value.normalize("NFKC").replace(/\s+/gu, " ").trim();
}

function normalizeKey(value: string) {
  return normalizeText(value).toLocaleLowerCase("tr-TR");
}

function toFiniteMetric(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : null;
}

function toPercentageMetric(value: unknown) {
  const metric = toFiniteMetric(value);

  return metric !== null && metric >= 0 && metric <= 100
    ? metric
    : null;
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
      (item): item is string => typeof item === "string"
    )
    .map((item) => normalizeKey(item))
    .filter(
      (item): item is ContentType =>
        contentTypes.has(item as ContentType)
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

function getSignalCoverage(value: unknown): SignalCoverage {
  if (!Array.isArray(value)) {
    return {
      checked: false,
      found: new Map(),
      missing: new Map(),
    };
  }

  const found = new Map<string, string>();
  const missing = new Map<string, string>();

  for (const rawSignal of value) {
    const signal = toRecord(rawSignal);
    const keyword = normalizeText(
      typeof signal.keyword === "string"
        ? signal.keyword
        : ""
    );

    if (!keyword) continue;

    const key = normalizeKey(keyword);
    const count = toFiniteMetric(signal.count);
    const isFound =
      signal.found === true || (count !== null && count > 0);

    if (isFound) {
      if (!found.has(key)) {
        found.set(key, keyword);
      }

      missing.delete(key);
      continue;
    }

    if (!found.has(key) && !missing.has(key)) {
      missing.set(key, keyword);
    }
  }

  return {
    checked: true,
    found,
    missing,
  };
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
    const normalizedValue = normalizeKey(value);

    if (!normalizedValue) return;

    countMap.set(
      normalizedValue,
      (countMap.get(normalizedValue) ?? 0) + 1
    );
  });

  return Array.from(countMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value]) => value);
}

function getCompetitorMentionStats(analyses: AnalysisInput[]) {
  const stats = new Map<
    string,
    {
      name: string;
      mentionCount: number;
      firstSeenOrder: number;
    }
  >();
  let firstSeenOrder = 0;

  analyses.forEach((analysis) => {
    if (
      analysis.brand_mentioned !== true &&
      analysis.brand_mentioned !== false
    ) {
      return;
    }

    const competitors = Array.isArray(analysis.competitors_json)
      ? analysis.competitors_json
      : [];
    const seenInAnalysis = new Set<string>();

    competitors.forEach((rawCompetitor) => {
      const competitor = toRecord(rawCompetitor);

      if (competitor.mentioned !== true) return;

      const name = normalizeText(
        typeof competitor.name === "string"
          ? competitor.name
          : ""
      );

      if (!name) return;

      const key = normalizeKey(name);

      if (seenInAnalysis.has(key)) return;

      seenInAnalysis.add(key);

      const existing = stats.get(key);

      if (existing) {
        existing.mentionCount += 1;
        return;
      }

      stats.set(key, {
        name,
        mentionCount: 1,
        firstSeenOrder,
      });
      firstSeenOrder += 1;
    });
  });

  return Array.from(stats.values()).sort((first, second) => {
    if (second.mentionCount !== first.mentionCount) {
      return second.mentionCount - first.mentionCount;
    }

    return first.firstSeenOrder - second.firstSeenOrder;
  });
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

  const visibilityScore = toPercentageMetric(
    score?.visibility_score
  );
  const positiveSentimentRate = toPercentageMetric(
    score?.positive_sentiment_rate
  );
  const averageRank = toFiniteMetric(score?.average_rank);

  const visibleAnalyses = analyses.filter(
    (analysis) => analysis.brand_mentioned === true
  );
  const invisibleAnalyses = analyses.filter(
    (analysis) => analysis.brand_mentioned === false
  );

  const invisibleIntents = getMostCommonValues(
    invisibleAnalyses
      .map((analysis) => getPromptIntent(analysis))
      .filter((intent): intent is string => Boolean(intent))
  );
    const primaryInvisibleIntent = invisibleIntents[0] ?? null;

  const invisibleIntentContentPlan = getIntentContentPlan(
    primaryInvisibleIntent
  );

  const competitorStats = getCompetitorMentionStats(analyses);
  const strongestCompetitor = competitorStats[0] ?? null;

  const brandWebsiteScore = toPercentageMetric(
    brandWebsiteSnapshot?.content_score
  );

  const brandServiceCoverage = getSignalCoverage(
    brandWebsiteSnapshot?.service_signals_json
  );

  const brandTrustCoverage = getSignalCoverage(
    brandWebsiteSnapshot?.trust_signals_json
  );

  const brandMissingServiceKeywords = Array.from(
    brandServiceCoverage.missing.values()
  );

  const brandMissingTrustKeywords = Array.from(
    brandTrustCoverage.missing.values()
  );

  const competitorServiceKeywords = new Map<string, string>();
  const competitorTrustKeywords = new Map<string, string>();

  for (const snapshot of competitorWebsiteSnapshots) {
    const serviceCoverage = getSignalCoverage(
      snapshot.service_signals_json
    );
    const trustCoverage = getSignalCoverage(
      snapshot.trust_signals_json
    );

    for (const [key, keyword] of serviceCoverage.found) {
      if (!competitorServiceKeywords.has(key)) {
        competitorServiceKeywords.set(key, keyword);
      }
    }

    for (const [key, keyword] of trustCoverage.found) {
      if (!competitorTrustKeywords.has(key)) {
        competitorTrustKeywords.set(key, keyword);
      }
    }
  }

  const competitorOnlyServiceKeywords = Array.from(
    competitorServiceKeywords.entries()
  )
    .filter(
      ([key]) =>
        brandServiceCoverage.checked &&
        !brandServiceCoverage.found.has(key)
    )
    .map(([, keyword]) => keyword);

  const competitorOnlyTrustKeywords = Array.from(
    competitorTrustKeywords.entries()
  )
    .filter(
      ([key]) =>
        brandTrustCoverage.checked &&
        !brandTrustCoverage.found.has(key)
    )
    .map(([, keyword]) => keyword);

  const validCompetitorWebsiteScores =
    competitorWebsiteSnapshots
      .map((snapshot) =>
        toPercentageMetric(snapshot.content_score)
      )
      .filter(
        (contentScore): contentScore is number =>
          contentScore !== null
      );

  const averageCompetitorWebsiteScore =
    validCompetitorWebsiteScores.length > 0
      ? Math.round(
          validCompetitorWebsiteScores.reduce(
            (sum, contentScore) => sum + contentScore,
            0
          ) / validCompetitorWebsiteScores.length
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

  if (
    brandWebsiteSnapshot &&
    brandWebsiteScore !== null &&
    brandWebsiteScore < 50
  ) {
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
    brandWebsiteSnapshot &&
    brandWebsiteScore !== null &&
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

  if (
    brandMissingServiceKeywords.length > 0 &&
    visibilityScore !== null &&
    visibilityScore < 50
  ) {
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

  if (
    brandMissingTrustKeywords.length > 0 &&
    positiveSentimentRate !== null &&
    positiveSentimentRate < 70
  ) {
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
      title:
        invisibleIntentContentPlan?.title ??
        "Markanın görünmediği sorulara özel içerik oluştur",
      description: invisibleIntentContentPlan
        ? `${brandName}, özellikle ${invisibleIntentContentPlan.label} sorularında yeterince görünmüyor. ${invisibleIntentContentPlan.action}`
        : `${brandName}, ${invisibleAnalyses.length} test sorusunda görünmedi. Görünmediği sorular incelenerek kullanıcı ihtiyacına doğrudan cevap veren sayfalar hazırlanmalı.`,
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

  if (
    averageRank !== null &&
    averageRank > 2
  ) {
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