import { normalizeStrategyText } from "@/lib/strategy/prompt-intents";

export type BusinessArchetype =
  | "local_service"
  | "ecommerce"
  | "saas"
  | "education"
  | "hospitality"
  | "healthcare"
  | "professional_service"
  | "consumer_brand"
  | "marketplace"
  | "generic_business";

export type BrandStrategyContext = {
  industry?: string | null;
  description?: string | null;
  targetAudience?: string | null;
  primaryOffer?: string | null;
};

type ArchetypeRule = {
  archetype: Exclude<BusinessArchetype, "generic_business">;
  keywords: string[];
};

const archetypeRules: ArchetypeRule[] = [
  {
    archetype: "saas",
    keywords: [
      "saas",
      "yazilim",
      "software",
      "bulut",
      "crm",
      "erp",
      "api",
      "platform",
      "uygulama",
      "abonelik yazilimi",
      "b2b teknoloji",
    ],
  },
  {
    archetype: "marketplace",
    keywords: [
      "pazaryeri",
      "marketplace",
      "ilan platformu",
      "aracilik platformu",
      "satici ve alici",
      "hizmet veren",
      "eslestirme platformu",
    ],
  },
  {
    archetype: "healthcare",
    keywords: [
      "saglik",
      "klinik",
      "hastane",
      "tip merkezi",
      "dis",
      "dental",
      "doktor",
      "hekim",
      "psikolog",
      "psikoloji",
      "fizyoterapi",
      "diyetisyen",
      "estetik",
      "medikal",
      "tedavi",
    ],
  },
  {
    archetype: "education",
    keywords: [
      "egitim",
      "okul",
      "kurs",
      "akademi",
      "universite",
      "kolej",
      "ozel ders",
      "sertifika programi",
      "online ders",
      "ogrenme",
    ],
  },
  {
    archetype: "hospitality",
    keywords: [
      "otel",
      "konaklama",
      "turizm",
      "tatil",
      "pansiyon",
      "restoran",
      "restaurant",
      "kafe",
      "cafe",
      "coffee shop",
      "seyahat",
      "rezervasyon",
    ],
  },
  {
    archetype: "ecommerce",
    keywords: [
      "e ticaret",
      "eticaret",
      "ecommerce",
      "online magaza",
      "internet magazasi",
      "online satis",
      "perakende sitesi",
      "urun satisi",
      "kargo",
      "sepet",
    ],
  },
  {
    archetype: "professional_service",
    keywords: [
      "hukuk",
      "avukat",
      "muhasebe",
      "mali musavir",
      "danismanlik",
      "ajans",
      "mimarlik",
      "muhendislik",
      "denetim",
      "insan kaynaklari",
      "kurumsal hizmet",
    ],
  },
  {
    archetype: "local_service",
    keywords: [
      "yerel hizmet",
      "tamir",
      "teknik servis",
      "bakim",
      "temizlik",
      "tesisat",
      "nakliyat",
      "kuafor",
      "guzellik salonu",
      "oto servis",
      "emlak",
      "randevulu hizmet",
    ],
  },
  {
    archetype: "consumer_brand",
    keywords: [
      "tuketici markasi",
      "gida",
      "icecek",
      "kahve",
      "kozmetik",
      "moda",
      "giyim",
      "mobilya",
      "elektronik",
      "ev yasam",
      "hizli tuketim",
      "fmcg",
      "urun markasi",
      "perakende markasi",
    ],
  },
];

export const businessArchetypeLabels: Record<
  BusinessArchetype,
  string
> = {
  local_service: "Yerel hizmet",
  ecommerce: "E-ticaret",
  saas: "Yazılım / SaaS",
  education: "Eğitim",
  hospitality: "Konaklama ve yeme-içme",
  healthcare: "Sağlık",
  professional_service: "Profesyonel hizmet",
  consumer_brand: "Tüketici markası",
  marketplace: "Pazaryeri",
  generic_business: "Genel işletme",
};

function getRuleScore(
  rule: ArchetypeRule,
  context: BrandStrategyContext
) {
  const industry = normalizeStrategyText(context.industry ?? "");
  const supportingContext = normalizeStrategyText(
    [
      context.description,
      context.targetAudience,
      context.primaryOffer,
    ]
      .filter(Boolean)
      .join(" ")
  );

  return rule.keywords.reduce((score, keyword) => {
    const normalizedKeyword = normalizeStrategyText(keyword);

    if (industry.includes(normalizedKeyword)) {
      return score + 4;
    }

    if (supportingContext.includes(normalizedKeyword)) {
      return score + 1;
    }

    return score;
  }, 0);
}

export function resolveBusinessArchetype(
  context: BrandStrategyContext
): BusinessArchetype {
  const rankedRules = archetypeRules
    .map((rule, index) => ({
      archetype: rule.archetype,
      score: getRuleScore(rule, context),
      index,
    }))
    .filter((rule) => rule.score > 0)
    .sort(
      (first, second) =>
        second.score - first.score || first.index - second.index
    );

  return rankedRules[0]?.archetype ?? "generic_business";
}