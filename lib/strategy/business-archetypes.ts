import { normalizeStrategyText } from "@/lib/strategy/prompt-intents";

export type BusinessArchetype =
  | "industrial_b2b"
  | "energy_environment"
  | "agriculture_food_production"
  | "logistics_transport"
  | "automotive"
  | "real_estate_construction"
  | "healthcare"
  | "finance_insurance"
  | "education"
  | "saas"
  | "ecommerce"
  | "marketplace"
  | "hospitality"
  | "professional_service"
  | "local_service"
  | "consumer_brand"
  | "media_publishing"
  | "nonprofit_public"
  | "generic_business";

export type BrandStrategyContext = {
  industry?: string | null;
  description?: string | null;
  targetAudience?: string | null;
  primaryOffer?: string | null;
};

type StrategyContextField =
  | "industry"
  | "primaryOffer"
  | "description"
  | "targetAudience";

type ArchetypeRule = {
  archetype: Exclude<BusinessArchetype, "generic_business">;
  priority: number;
  strongTerms: string[];
  relatedTerms: string[];
  excludedTerms?: string[];
};

export type ArchetypeMatchEvidence = {
  field: StrategyContextField;
  term: string;
  strength: "strong" | "related" | "excluded";
  points: number;
};

export type BusinessArchetypeResolution = {
  archetype: BusinessArchetype;
  confidence: "high" | "medium" | "low";
  score: number;
  scoreGap: number;
  runnerUp: BusinessArchetype | null;
  evidence: ArchetypeMatchEvidence[];
};

type TermPart = {
  value: string;
  prefix: boolean;
};

const fieldWeights: Record<
  StrategyContextField,
  { strong: number; related: number; excluded: number }
> = {
  industry: { strong: 12, related: 7, excluded: -14 },
  primaryOffer: { strong: 10, related: 5, excluded: -12 },
  description: { strong: 6, related: 3, excluded: -8 },
  targetAudience: { strong: 3, related: 1, excluded: -4 },
};

/*
 * Kurallar sektör adlarını tek tek ezberlemek yerine satın alma ve karar
 * yapısı benzer işletmeleri aynı arşetipte toplar. Yeni ve bilinmeyen bir
 * sektör hiçbir kurala güvenle uymuyorsa generic_business kullanılır.
 *
 * "*" ile biten terimler kelime kökü eşleşmesidir. Örneğin "muhendis*",
 * "mühendislik" ve "mühendisliği" sözcüklerini yakalar. "dis" gibi kısa
 * terimler ise yalnızca tam kelime olarak eşleşir; "muhendisligi" içinden
 * yanlışlıkla eşleşemez.
 */
const archetypeRules: ArchetypeRule[] = [
  {
    archetype: "saas",
    priority: 100,
    strongTerms: [
      "saas",
      "software as a service",
      "abonelik yazilimi",
      "bulut yazilimi",
      "b2b yazilim",
      "crm yazilimi",
      "erp yazilimi",
      "insurtech",
      "fintech yazilimi",
      "hr tech",
      "martech",
    ],
    relatedTerms: [
      "yazilim",
      "software",
      "platform",
      "uygulama",
      "api",
      "entegrasyon",
      "abonelik",
      "demo",
      "bulut",
    ],
  },
  {
    archetype: "marketplace",
    priority: 95,
    strongTerms: [
      "pazaryeri",
      "marketplace",
      "ilan platformu",
      "aracilik platformu",
      "eslestirme platformu",
      "iki tarafli platform",
      "satici ve alici",
      "hizmet veren platformu",
    ],
    relatedTerms: [
      "satici",
      "alici",
      "ilan",
      "komisyon",
      "rezervasyon platformu",
      "teklif platformu",
    ],
  },
  {
    archetype: "ecommerce",
    priority: 90,
    strongTerms: [
      "e ticaret",
      "eticaret",
      "ecommerce",
      "online magaza",
      "internet magazasi",
      "online satis",
      "dijital magaza",
      "perakende sitesi",
    ],
    relatedTerms: [
      "sepet",
      "kargo",
      "teslimat",
      "stok",
      "siparis",
      "online urun",
      "urun satisi",
    ],
  },
  {
    archetype: "industrial_b2b",
    priority: 88,
    strongTerms: [
      "endustri*",
      "kestirimci bakim",
      "vibrasyon analiz*",
      "durum izleme",
      "makine izleme",
      "endustriyel otomasyon",
      "fabrika otomasyonu",
      "uretim teknoloj*",
      "muhendislik cozum*",
      "teknik ekipman",
      "endustriyel ekipman",
      "proses kontrol",
      "kalite kontrol sistem*",
    ],
    relatedTerms: [
      "muhendis*",
      "makine",
      "fabrika",
      "uretim tesisi",
      "sensor",
      "sensorler",
      "bakim",
      "otomasyon",
      "olcum",
      "kalibrasyon",
      "teknik servis",
      "saha hizmeti",
      "b2b",
    ],
    excludedTerms: [
      "estetik",
      "klinik",
      "hasta",
      "tedavi",
      "restoran",
      "otel",
    ],
  },
  {
    archetype: "finance_insurance",
    priority: 86,
    strongTerms: [
      "banka",
      "bankacilik",
      "sigorta",
      "finansal hizmet",
      "yatirim sirketi",
      "portfoy yonetimi",
      "odeme kurulusu",
      "kredi kurumu",
      "emeklilik",
      "faktoring",
    ],
    relatedTerms: [
      "finans",
      "kredi",
      "yatirim",
      "fon",
      "poliçe",
      "police",
      "hasar",
      "prim",
      "mevduat",
      "ödeme",
      "odeme",
    ],
    excludedTerms: ["finans egitimi", "finans blogu"],
  },
  {
    archetype: "healthcare",
    priority: 84,
    strongTerms: [
      "saglik hizmet*",
      "klinik",
      "hastane",
      "tip merkezi",
      "dis klinigi",
      "dis hekim*",
      "agiz ve dis sagligi",
      "doktor",
      "hekim",
      "psikolog",
      "fizyoterapi",
      "diyetisyen",
      "tedavi",
      "hasta kabul",
    ],
    relatedTerms: [
      "saglik",
      "dis",
      "dental",
      "psikoloji",
      "terapi",
      "muayene",
      "randevu",
      "rehabilitasyon",
      "medikal estetik",
    ],
    excludedTerms: [
      "endustri*",
      "muhendis*",
      "makine",
      "fabrika",
      "otomasyon",
      "yazilim",
    ],
  },
  {
    archetype: "education",
    priority: 82,
    strongTerms: [
      "egitim kurumu",
      "okul",
      "universite",
      "kolej",
      "dershane",
      "kurs merkezi",
      "online egitim",
      "sertifika programi",
      "ozel ders",
    ],
    relatedTerms: [
      "egitim",
      "kurs",
      "akademi",
      "ogrenci",
      "ogretmen",
      "egitmen",
      "sinav",
      "lgs",
      "yks",
      "tyt",
      "ayt",
      "ogrenme",
    ],
  },
  {
    archetype: "real_estate_construction",
    priority: 80,
    strongTerms: [
      "gayrimenkul",
      "emlak",
      "insaat",
      "mimarlik ofisi",
      "yapi firmasi",
      "konut projesi",
      "ticari gayrimenkul",
      "proje gelistirme",
      "yapi malzemeleri",
    ],
    relatedTerms: [
      "konut",
      "daire",
      "arsa",
      "kiralik",
      "satilik",
      "mimarlik",
      "müteahhit",
      "muteahhit",
      "tadilat",
      "dekorasyon",
    ],
  },
  {
    archetype: "automotive",
    priority: 78,
    strongTerms: [
      "otomotiv",
      "oto servis",
      "arac satisi",
      "arac kiralama",
      "yedek parca",
      "lastik servisi",
      "filo yonetimi",
      "elektrikli arac",
    ],
    relatedTerms: [
      "arac",
      "otomobil",
      "servis",
      "bakim",
      "kaporta",
      "boya",
      "lastik",
      "filo",
    ],
  },
  {
    archetype: "logistics_transport",
    priority: 76,
    strongTerms: [
      "lojistik",
      "nakliye",
      "tasimacilik",
      "kargo sirketi",
      "depolama",
      "tedarik zinciri",
      "gumrukleme",
      "kurye hizmeti",
      "deniz tasimaciligi",
      "hava kargo",
    ],
    relatedTerms: [
      "sevkiyat",
      "depo",
      "teslimat",
      "rota",
      "filo",
      "gumruk",
      "kurye",
      "tasima",
    ],
    excludedTerms: ["lojistik yazilim", "rota yazilimi"],
  },
  {
    archetype: "energy_environment",
    priority: 74,
    strongTerms: [
      "enerji",
      "yenilenebilir enerji",
      "gunes enerjisi",
      "ruzgar enerjisi",
      "elektrik uretimi",
      "enerji verimliligi",
      "atik yonetimi",
      "cevre teknoloj*",
      "su aritma",
      "karbon yonetimi",
    ],
    relatedTerms: [
      "gunes paneli",
      "ges",
      "res",
      "elektrik",
      "surdulebilirlik",
      "atik",
      "geri donusum",
      "aritma",
      "emisyon",
    ],
  },
  {
    archetype: "agriculture_food_production",
    priority: 72,
    strongTerms: [
      "tarim",
      "ziraat",
      "hayvancilik",
      "gida uretimi",
      "icecek uretimi",
      "tarim teknoloj*",
      "sera",
      "tohumculuk",
      "sut urunleri",
      "gida isleme",
    ],
    relatedTerms: [
      "ciftci",
      "uretim",
      "hasat",
      "tohum",
      "yem",
      "gubre",
      "organik",
      "gida",
      "icecek",
    ],
  },
  {
    archetype: "hospitality",
    priority: 70,
    strongTerms: [
      "otel",
      "konaklama",
      "pansiyon",
      "tatil koyu",
      "seyahat acentesi",
      "restoran",
      "restaurant",
      "kafe",
      "cafe",
      "coffee shop",
      "catering",
    ],
    relatedTerms: [
      "turizm",
      "tatil",
      "rezervasyon",
      "oda",
      "menu",
      "kahvalti",
      "misafir",
      "etkinlik mekani",
    ],
    excludedTerms: ["kahve uretimi", "paketli kahve", "gida uretimi"],
  },
  {
    archetype: "professional_service",
    priority: 68,
    strongTerms: [
      "hukuk burosu",
      "avukatlik",
      "muhasebe",
      "mali musavir",
      "danismanlik",
      "reklam ajansi",
      "seo ajansi",
      "dijital ajans",
      "denetim firmasi",
      "insan kaynaklari danismanligi",
      "mimarlik hizmeti",
    ],
    relatedTerms: [
      "hukuk",
      "avukat",
      "danisman",
      "ajans",
      "mimarlik",
      "muhendis*",
      "denetim",
      "proje yonetimi",
      "kurumsal hizmet",
    ],
    excludedTerms: ["endustriyel muhendislik", "muhendislik urunu"],
  },
  {
    archetype: "local_service",
    priority: 66,
    strongTerms: [
      "yerel hizmet",
      "teknik servis",
      "evde hizmet",
      "acil servis hizmeti",
      "tamir servisi",
      "temizlik sirketi",
      "tesisatci",
      "kuafor",
      "guzellik salonu",
      "veteriner klinigi",
    ],
    relatedTerms: [
      "tamir",
      "bakim",
      "temizlik",
      "tesisat",
      "nakliyat",
      "randevulu hizmet",
      "hizmet bolgesi",
      "yerinde servis",
    ],
    excludedTerms: ["endustri*", "fabrika", "uretim tesisi"],
  },
  {
    archetype: "consumer_brand",
    priority: 64,
    strongTerms: [
      "tuketici markasi",
      "fmcg",
      "hizli tuketim",
      "paketli gida",
      "paketli icecek",
      "kozmetik markasi",
      "moda markasi",
      "giyim markasi",
      "mobilya markasi",
      "elektronik markasi",
      "urun markasi",
      "perakende markasi",
    ],
    relatedTerms: [
      "gida",
      "icecek",
      "kahve",
      "kozmetik",
      "moda",
      "giyim",
      "mobilya",
      "elektronik",
      "ev yasam",
      "perakende",
    ],
  },
  {
    archetype: "media_publishing",
    priority: 62,
    strongTerms: [
      "haber sitesi",
      "medya sirketi",
      "yayinevi",
      "dergi",
      "dijital yayin",
      "icerik platformu",
      "podcast agi",
      "televizyon kanali",
    ],
    relatedTerms: [
      "haber",
      "medya",
      "yayin",
      "editor",
      "makale",
      "gazete",
      "video icerik",
      "podcast",
    ],
  },
  {
    archetype: "nonprofit_public",
    priority: 60,
    strongTerms: [
      "dernek",
      "vakif",
      "sivil toplum",
      "kamu kurumu",
      "belediye",
      "oda ve borsa",
      "meslek odasi",
      "sendika",
    ],
    relatedTerms: [
      "gonullu",
      "bagis",
      "uyelik",
      "sosyal fayda",
      "kamu hizmeti",
      "mevzuat",
      "duyuru",
    ],
  },
];

export const businessArchetypeLabels: Record<
  BusinessArchetype,
  string
> = {
  industrial_b2b: "Endüstriyel B2B çözüm",
  energy_environment: "Enerji ve çevre",
  agriculture_food_production: "Tarım ve gıda üretimi",
  logistics_transport: "Lojistik ve taşımacılık",
  automotive: "Otomotiv",
  real_estate_construction: "Gayrimenkul ve yapı",
  healthcare: "Sağlık",
  finance_insurance: "Finans ve sigorta",
  education: "Eğitim",
  saas: "Yazılım / SaaS",
  ecommerce: "E-ticaret",
  marketplace: "Pazaryeri",
  hospitality: "Konaklama ve yeme-içme",
  professional_service: "Profesyonel hizmet",
  local_service: "Yerel hizmet",
  consumer_brand: "Tüketici markası",
  media_publishing: "Medya ve yayıncılık",
  nonprofit_public: "Kamu ve sivil toplum",
  generic_business: "Genel işletme",
};

function parseTerm(term: string): TermPart[] {
  return term
    .trim()
    .split(/\s+/)
    .map((part) => {
      const prefix = part.endsWith("*");
      const value = normalizeStrategyText(
        prefix ? part.slice(0, -1) : part
      );

      return {
        value,
        prefix: prefix && value.length >= 4,
      };
    })
    .filter((part) => part.value.length > 0);
}

export function matchesStrategyTerm(value: string, term: string) {
  const valueTokens = normalizeStrategyText(value)
    .split(" ")
    .filter(Boolean);
  const termParts = parseTerm(term);

  if (valueTokens.length === 0 || termParts.length === 0) {
    return false;
  }

  for (
    let startIndex = 0;
    startIndex <= valueTokens.length - termParts.length;
    startIndex += 1
  ) {
    const matches = termParts.every((part, partIndex) => {
      const token = valueTokens[startIndex + partIndex];

      return part.prefix
        ? token.startsWith(part.value)
        : token === part.value;
    });

    if (matches) return true;
  }

  return false;
}

function getContextValues(
  context: BrandStrategyContext
): Record<StrategyContextField, string> {
  return {
    industry: context.industry ?? "",
    primaryOffer: context.primaryOffer ?? "",
    description: context.description ?? "",
    targetAudience: context.targetAudience ?? "",
  };
}

function getRuleResolution(
  rule: ArchetypeRule,
  context: BrandStrategyContext
) {
  const contextValues = getContextValues(context);
  const evidence: ArchetypeMatchEvidence[] = [];

  (
    Object.entries(contextValues) as Array<
      [StrategyContextField, string]
    >
  ).forEach(([field, value]) => {
    if (!value.trim()) return;

    const strongMatches = rule.strongTerms.filter((term) =>
      matchesStrategyTerm(value, term)
    );
    const relatedMatches = rule.relatedTerms
      .filter((term) => matchesStrategyTerm(value, term))
      .filter(
        (term) =>
          !strongMatches.some(
            (strongTerm) =>
              normalizeStrategyText(strongTerm.replace("*", "")) ===
              normalizeStrategyText(term.replace("*", ""))
          )
      );
    const excludedMatches = (rule.excludedTerms ?? []).filter(
      (term) => matchesStrategyTerm(value, term)
    );

    strongMatches.slice(0, 3).forEach((term) => {
      evidence.push({
        field,
        term,
        strength: "strong",
        points: fieldWeights[field].strong,
      });
    });

    relatedMatches.slice(0, 3).forEach((term) => {
      evidence.push({
        field,
        term,
        strength: "related",
        points: fieldWeights[field].related,
      });
    });

    excludedMatches.slice(0, 2).forEach((term) => {
      evidence.push({
        field,
        term,
        strength: "excluded",
        points: fieldWeights[field].excluded,
      });
    });
  });

  return {
    archetype: rule.archetype,
    priority: rule.priority,
    score: Math.max(
      0,
      evidence.reduce((total, item) => total + item.points, 0)
    ),
    evidence,
  };
}

export function resolveBusinessArchetypeWithEvidence(
  context: BrandStrategyContext
): BusinessArchetypeResolution {
  const ranked = archetypeRules
    .map((rule) => getRuleResolution(rule, context))
    .filter((result) => result.score > 0)
    .sort(
      (first, second) =>
        second.score - first.score ||
        second.priority - first.priority
    );

  const best = ranked[0];
  const runnerUp = ranked[1];

  if (!best || best.score < 8) {
    return {
      archetype: "generic_business",
      confidence: "low",
      score: best?.score ?? 0,
      scoreGap: best ? best.score - (runnerUp?.score ?? 0) : 0,
      runnerUp: runnerUp?.archetype ?? null,
      evidence: best?.evidence ?? [],
    };
  }

  const scoreGap = best.score - (runnerUp?.score ?? 0);
  const ambiguous = best.score < 14 && scoreGap < 3;

  if (ambiguous) {
    return {
      archetype: "generic_business",
      confidence: "low",
      score: best.score,
      scoreGap,
      runnerUp: runnerUp?.archetype ?? null,
      evidence: best.evidence,
    };
  }

  return {
    archetype: best.archetype,
    confidence:
      best.score >= 24 && scoreGap >= 6 ? "high" : "medium",
    score: best.score,
    scoreGap,
    runnerUp: runnerUp?.archetype ?? null,
    evidence: best.evidence,
  };
}

export function resolveBusinessArchetype(
  context: BrandStrategyContext
): BusinessArchetype {
  return resolveBusinessArchetypeWithEvidence(context).archetype;
}