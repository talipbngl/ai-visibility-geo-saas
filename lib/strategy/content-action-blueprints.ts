import {
  type BrandStrategyContext,
  type BusinessArchetype,
  resolveBusinessArchetype,
} from "@/lib/strategy/business-archetypes";
import {
  findTurkishLocation,
  normalizeStrategyText,
  type PromptIntent,
} from "@/lib/strategy/prompt-intents";

export type ContentActionBlueprint = {
  deliverable: string;
  suggestedPath: string;
  requiredSections: string[];
};

type ContentActionBlueprintInput = {
  brandName: string;
  brandContext: BrandStrategyContext;
  promptText: string;
  intent: PromptIntent | null;
  strongestCompetitorName?: string | null;
  detectedServiceKeywords?: string[];
};

type ArchetypeProfile = {
  categoryLabel: string;
  decisionCriteria: string;
  proofRequirements: string;
  conversionStep: string;
  mainPath: string;
  localPath: string;
};

const archetypeProfiles: Record<
  BusinessArchetype,
  ArchetypeProfile
> = {
  local_service: {
    categoryLabel: "hizmet",
    decisionCriteria:
      "hizmet kapsamı, hizmet bölgesi, uygunluk, süre ve fiyatı etkileyen unsurlar",
    proofRequirements:
      "uzmanlık, ekip, ruhsat veya yetki, garanti ve doğrulanabilir müşteri kanıtları",
    conversionStep:
      "randevu ya da teklif alma adımı, yanıt süresi ve gerekli ön bilgiler",
    mainPath: "hizmetler",
    localPath: "hizmet-bolgeleri",
  },
  ecommerce: {
    categoryLabel: "ürün",
    decisionCriteria:
      "ürün özellikleri, varyantlar, stok, teslimat süresi ve toplam maliyet",
    proofRequirements:
      "gerçek ürün verisi, kullanıcı yorumları, iade koşulları ve güvenli ödeme bilgileri",
    conversionStep:
      "stok durumu, teslimat, iade ve doğrudan satın alma adımı",
    mainPath: "urun-rehberi",
    localPath: "magazalar",
  },
  saas: {
    categoryLabel: "yazılım çözümü",
    decisionCriteria:
      "özellikler, entegrasyonlar, kullanıcı sınırları, kurulum süresi ve toplam sahip olma maliyeti",
    proofRequirements:
      "ürün ekranları, güvenlik belgeleri, müşteri sonuçları, çalışma durumu ve güncel entegrasyon listesi",
    conversionStep:
      "demo, ücretsiz deneme veya satış görüşmesi için gereken adımlar",
    mainPath: "cozumler",
    localPath: "cozumler",
  },
  education: {
    categoryLabel: "eğitim programı",
    decisionCriteria:
      "müfredat, seviye, eğitmen, süre, ders biçimi, takvim ve ücret",
    proofRequirements:
      "eğitmen yetkinliği, program çıktıları, mezun sonuçları ve doğrulanabilir başarı verileri",
    conversionStep:
      "başvuru koşulları, kayıt takvimi, deneme dersi ve danışmanlık adımı",
    mainPath: "programlar",
    localPath: "egitim-merkezleri",
  },
  hospitality: {
    categoryLabel: "konaklama veya deneyim",
    decisionCriteria:
      "konum, kapasite, olanaklar, müsaitlik, fiyat, iptal ve erişilebilirlik koşulları",
    proofRequirements:
      "güncel fotoğraflar, doğrulanmış misafir yorumları, açık adres ve işletme bilgileri",
    conversionStep:
      "müsaitlik kontrolü, rezervasyon, ödeme ve iptal adımları",
    mainPath: "deneyimler",
    localPath: "destinasyonlar",
  },
  healthcare: {
    categoryLabel: "sağlık hizmeti",
    decisionCriteria:
      "uygunluk, uzmanlık alanı, değerlendirme süreci, tedavi aşamaları, riskler ve fiyatı etkileyen unsurlar",
    proofRequirements:
      "hekim bilgileri, ruhsat ve uzmanlık doğrulaması, klinik adresi ve bilimsel kaynaklar",
    conversionStep:
      "ön değerlendirme, randevu ve kişiye özel tıbbi görüş alma adımı",
    mainPath: "tedaviler",
    localPath: "klinikler",
  },
  professional_service: {
    categoryLabel: "profesyonel hizmet",
    decisionCriteria:
      "hizmet kapsamı, çalışma yöntemi, uzmanlık, teslimatlar, süre ve ücretlendirme modeli",
    proofRequirements:
      "ekip özgeçmişleri, yetki belgeleri, anonimleştirilmiş vaka örnekleri ve referanslar",
    conversionStep:
      "ön görüşme, ihtiyaç analizi, teklif ve işe başlama adımları",
    mainPath: "hizmetler",
    localPath: "ofisler",
  },
  consumer_brand: {
    categoryLabel: "ürün grubu",
    decisionCriteria:
      "ürün çeşitleri, içerik veya teknik özellikler, kullanım senaryosu, fiyat ve bulunabilirlik",
    proofRequirements:
      "ürün sayfaları, doğrulanabilir içerik veya teknik veriler, kalite belgeleri ve kullanıcı kanıtları",
    conversionStep:
      "satış noktası, stok, teslimat ve doğrudan satın alma adımı",
    mainPath: "urunler",
    localPath: "satis-noktalari",
  },
  marketplace: {
    categoryLabel: "pazaryeri kategorisi",
    decisionCriteria:
      "arz kapsamı, eşleştirme yöntemi, ücretler, işlem koşulları ve hizmet seviyesi",
    proofRequirements:
      "doğrulanmış satıcı veya hizmet verenler, güvenlik süreci, yorumlar ve uyuşmazlık politikası",
    conversionStep:
      "arama, karşılaştırma, teklif veya işlem başlatma adımları",
    mainPath: "kategoriler",
    localPath: "bolgeler",
  },
  generic_business: {
    categoryLabel: "ürün veya hizmet",
    decisionCriteria:
      "kapsam, seçenekler, uygunluk, süreç, fiyat ve kullanım koşulları",
    proofRequirements:
      "şirket bilgileri, somut ürün veya hizmet verileri, güncel kaynaklar ve müşteri kanıtları",
    conversionStep:
      "iletişim, teklif, kayıt veya satın alma için izlenecek açık adımlar",
    mainPath: "cozumler",
    localPath: "hizmet-bolgeleri",
  },
};

const topicStopWords = new Set([
  "acaba",
  "icin",
  "hangi",
  "hangileri",
  "hangileridir",
  "hangisini",
  "almak",
  "alinir",
  "alirken",
  "bakilmali",
  "cozulur",
  "gerekir",
  "marka",
  "markalar",
  "markalari",
  "nedir",
  "nelere",
  "nelerdir",
  "nasil",
  "onerir",
  "onerirsin",
  "onerirsiniz",
  "sec",
  "secerken",
  "secilmeli",
  "tercih",
  "turkiye",
  "uygun",
  "ve",
  "veya",
]);

function slugify(value: string) {
  return normalizeStrategyText(value)
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getTopicSlug({
  promptText,
  brandContext,
}: {
  promptText: string;
  brandContext: BrandStrategyContext;
}) {
  const location = findTurkishLocation(promptText);
  const promptTokens = normalizeStrategyText(promptText)
    .split(" ")
    .filter(
      (token) =>
        token.length > 2 &&
        !topicStopWords.has(token) &&
        token !== location
    )
    .slice(0, 7);

  if (promptTokens.length > 0) {
    return promptTokens.join("-");
  }

  const offerSlug = slugify(brandContext.primaryOffer ?? "");

  return offerSlug.slice(0, 60) || "karar-rehberi";
}

function getDetectedOfferLine({
  detectedServiceKeywords,
  primaryOffer,
}: {
  detectedServiceKeywords: string[];
  primaryOffer?: string | null;
}) {
  const detectedServices = Array.from(
    new Set(
      detectedServiceKeywords
        .map((keyword) => keyword.trim())
        .filter(Boolean)
    )
  ).slice(0, 5);

  if (detectedServices.length > 0) {
    return `Web sitesinde tespit edilen ${detectedServices.join(
      ", "
    )} tekliflerinin kapsamı ve birbirinden farkları`;
  }

  if (primaryOffer?.trim()) {
    return `"${primaryOffer.trim()}" teklifinin kapsamı, seçenekleri ve sınırları`;
  }

  return "Markanın bu soruyla ilişkili ürün veya hizmet seçenekleri ve aralarındaki farklar";
}

function getAudienceLine(context: BrandStrategyContext) {
  if (context.targetAudience?.trim()) {
    return `${context.targetAudience.trim()} için hangi seçeneğin hangi durumda uygun olduğu`;
  }

  return "Farklı ihtiyaçlara göre hangi seçeneğin kimler için uygun olduğu";
}

function getLocalPath(
  profile: ArchetypeProfile,
  promptText: string,
  topicSlug: string
) {
  const location = findTurkishLocation(promptText);

  return location
    ? `/${profile.localPath}/${slugify(location)}/${topicSlug}`
    : `/${profile.localPath}/{sehir-veya-ilce}/${topicSlug}`;
}

export function buildContentActionBlueprint({
  brandName,
  brandContext,
  promptText,
  intent,
  strongestCompetitorName,
  detectedServiceKeywords = [],
}: ContentActionBlueprintInput): ContentActionBlueprint {
  const archetype = resolveBusinessArchetype({
    ...brandContext,
    primaryOffer: [
      brandContext.primaryOffer,
      ...detectedServiceKeywords,
    ]
      .filter(Boolean)
      .join(" "),
  });
  const profile = archetypeProfiles[archetype];
  const brandSlug = slugify(brandName) || "marka";
  const competitorSlug = strongestCompetitorName
    ? slugify(strongestCompetitorName)
    : "alternatifler";
  const topicSlug = getTopicSlug({
    promptText,
    brandContext,
  });
  const detectedOfferLine = getDetectedOfferLine({
    detectedServiceKeywords,
    primaryOffer: brandContext.primaryOffer,
  });
  const audienceLine = getAudienceLine(brandContext);

  switch (intent) {
    case "comparison":
      return {
        deliverable: `${profile.categoryLabel} karşılaştırma rehberi`,
        suggestedPath: `/karsilastirma/${brandSlug}-${competitorSlug}`,
        requiredSections: [
          "Karşılaştırmanın kapsamı, veri tarihi ve kullanılan kaynaklar",
          `${brandName} ile ${
            strongestCompetitorName ?? "alternatiflerin"
          } aynı ölçütlerle karşılaştırıldığı tablo: ${profile.decisionCriteria}`,
          detectedOfferLine,
          `${brandName} için güçlü yönler, sınırlamalar ve uygun olmadığı durumlar`,
          `${profile.proofRequirements}; sonuç bölümünde ${profile.conversionStep}`,
        ],
      };

    case "local_recommendation":
      return {
        deliverable: `Yerel ${profile.categoryLabel} sayfası`,
        suggestedPath: getLocalPath(
          profile,
          promptText,
          topicSlug
        ),
        requiredSections: [
          "Her konum için açık adres, harita, hizmet alanı, güncel çalışma veya erişim bilgisi",
          `${profile.decisionCriteria} için konuma özel ve doğrulanabilir bilgiler`,
          detectedOfferLine,
          `${profile.proofRequirements}`,
          `${profile.conversionStep}; LocalBusiness veya uygun alt türde yapısal veri ve son güncelleme tarihi`,
        ],
      };

    case "buying_intent":
      return {
        deliverable: `${profile.categoryLabel} seçim rehberi`,
        suggestedPath: `/${profile.mainPath}/${topicSlug}`,
        requiredSections: [
          detectedOfferLine,
          `Seçimi etkileyen ölçütler: ${profile.decisionCriteria}`,
          audienceLine,
          "Güncel fiyat veya fiyatı belirleyen unsurlar; dahil olanlar, ek maliyetler ve geçerlilik tarihi",
          `${profile.proofRequirements}; kararın sonunda ${profile.conversionStep}`,
        ],
      };

    case "budget_friendly":
      return {
        deliverable: "Fiyat ve toplam değer rehberi",
        suggestedPath: `/fiyatlar/${topicSlug}`,
        requiredSections: [
          "Güncel başlangıç fiyatları, paketler ve fiyatın geçerlilik tarihi",
          "Fiyata dahil olanlar, ek ücretler ve toplam maliyeti değiştiren koşullar",
          detectedOfferLine,
          `Düşük fiyat dışında karşılaştırılacak değer ölçütleri: ${profile.decisionCriteria}`,
          `${audienceLine}; ${profile.conversionStep}`,
        ],
      };

    case "trust_reputation":
      return {
        deliverable: "Güven ve doğrulama sayfası",
        suggestedPath: "/hakkimizda/guven-ve-kalite",
        requiredSections: [
          "Şirketin açık unvanı, faaliyet alanı, adresi ve ulaşılabilir destek kanalları",
          profile.proofRequirements,
          "İlgili gizlilik, iade, hizmet, güvenlik veya tüketici politikalarının güncel bağlantıları",
          "Tarihli ve kaynağı gösterilen müşteri sonuçları; yanıltıcı veya doğrulanamayan iddialardan kaçınma",
          `${profile.conversionStep}; bilgilerin son kontrol tarihi`,
        ],
      };

    case "problem_solution":
      return {
        deliverable: "Sorun çözme rehberi",
        suggestedPath: `/rehber/${topicSlug}`,
        requiredSections: [
          "Sorunun ilk paragrafta verilen kısa ve doğrudan cevabı",
          "Olası nedenler, ön koşullar ve hangi durumda profesyonel destek gerektiği",
          "Kullanıcının uygulayabileceği adımlar ve seçeneklerin sınırları",
          `${brandName} teklifinin sorunu hangi koşullarda çözebildiği; ${detectedOfferLine.toLocaleLowerCase(
            "tr-TR"
          )}`,
          `${profile.proofRequirements}; ilgili ${profile.conversionStep}`,
        ],
      };

    case "premium_choice":
      return {
        deliverable: `Premium ${profile.categoryLabel} değerlendirme rehberi`,
        suggestedPath: `/rehber/${topicSlug}`,
        requiredSections: [
          "Premium iddiasını ölçen somut kriterler ve veri tarihi",
          `${profile.decisionCriteria}`,
          detectedOfferLine,
          "Daha yüksek fiyatın karşılığında alınan farklar ve gereksiz olacağı kullanım durumları",
          `${profile.proofRequirements}; ${profile.conversionStep}`,
        ],
      };

    case "alternative_search":
    default:
      return {
        deliverable: `${profile.categoryLabel} seçim ve alternatifler rehberi`,
        suggestedPath: `/rehber/${topicSlug}`,
        requiredSections: [
          `Kullanıcının karar vereceği ölçütler: ${profile.decisionCriteria}`,
          "Tüm seçeneklerin aynı veri alanlarıyla karşılaştırıldığı kısa tablo",
          detectedOfferLine,
          `${brandName} için uygun kullanıcı profili, güçlü olduğu ve uygun olmadığı durumlar`,
          `${profile.proofRequirements}; kaynaklar, güncelleme tarihi ve ${profile.conversionStep}`,
        ],
      };
  }
}