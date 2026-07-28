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
    industrial_instrumentation: {
  categoryLabel:
    "endüstriyel test, ölçüm ve kalibrasyon cihazı",
  decisionCriteria:
    "ölçüm aralığı, doğruluk, kararlılık, homojenlik, çözünürlük, ölçüm belirsizliği, sensör ve prob uyumluluğu, ısıtma-soğutma süresi, izlenebilirlik, standart uygunluğu, kalibrasyon sertifikası, garanti, teknik servis, teslim süresi ve toplam sahip olma maliyeti",
  proofRequirements:
    "ürün modeline ait teknik veri sayfası, sıcaklık veya ölçüm aralığı, kararlılık ve homojenlik değerleri, belirsizlik bilgisi, desteklenen sensör ve problar, üretici veya distribütör rolü, kalibrasyon sertifikasının kapsamı, garanti süresi, teknik servis koşulları ve doğrulanabilir laboratuvar referansları",
  conversionStep:
    "ölçüm aralığı ve belirsizlik ihtiyacının belirlenmesi, uygun model ve aksesuarların seçilmesi, teknik uygunluk doğrulaması, yazılı teklif, teslimat, kullanıcı eğitimi, devreye alma ve periyodik kalibrasyon planı",
  mainPath: "test-ve-kalibrasyon-cihazlari",
  localPath: "teknik-servis",
},
  industrial_b2b: {
    categoryLabel: "endüstriyel çözüm",
    decisionCriteria:
      "ölçüm veya çalışma yöntemi, desteklenen makine ve tesis türleri, teknik uyumluluk, veri toplama sıklığı, entegrasyon, alarm ve raporlama yetenekleri, kurulum süresi ve toplam sahip olma maliyeti",
    proofRequirements:
      "uzman ekibin ilgili sertifikaları, kullanılan cihaz ve kalibrasyon bilgileri, örnek ölçüm veya analiz raporu, benzer tesis referansları, kapsamı açıklanmış vaka sonuçları ve satış sonrası destek koşulları",
    conversionStep:
      "makine envanteri ve ihtiyaç formu, saha keşfi, pilot ölçüm, teknik teklif, devreye alma ve kabul kriterleri",
    mainPath: "endustriyel-cozumler",
    localPath: "saha-hizmetleri",
  },
  energy_environment: {
    categoryLabel: "enerji veya çevre çözümü",
    decisionCriteria:
      "tesis kapasitesi, saha uygunluğu, kullanılan teknoloji, beklenen üretim veya tasarruf, bağlantı ve izin gereksinimleri, bakım süreci, geri ödeme süresi ve toplam proje maliyeti",
    proofRequirements:
      "yetki ve yeterlilik belgeleri, keşif verileri, üretim veya tasarruf hesabının varsayımları, ekipman garantileri, izleme raporları ve doğrulanabilir proje referansları",
    conversionStep:
      "ön fizibilite, saha keşfi, projelendirme, izin ve bağlantı adımları, teklif, kurulum ve performans kabulü",
    mainPath: "enerji-cevre-cozumleri",
    localPath: "proje-bolgeleri",
  },
  agriculture_food_production: {
    categoryLabel: "tarım veya üretim çözümü",
    decisionCriteria:
      "ürün veya üretim türü, kapasite, iklim ve saha koşulları, girdi gereksinimleri, verim, izlenebilirlik, kalite standardı, teslimat ve toplam maliyet",
    proofRequirements:
      "üretim yeri ve süreç bilgileri, analiz veya kalite belgeleri, parti ve menşe izlenebilirliği, saha denemeleri, verim sonuçları ve doğrulanabilir üretici referansları",
    conversionStep:
      "ihtiyaç ve kapasite tespiti, numune veya saha denemesi, sezon ve teslimat planı, teklif ve kalite kabul kriterleri",
    mainPath: "tarim-uretim-cozumleri",
    localPath: "uretim-bolgeleri",
  },
  logistics_transport: {
    categoryLabel: "lojistik hizmeti",
    decisionCriteria:
      "taşıma türü, çıkış ve varış noktaları, kapasite, teslim süresi, takip imkânı, aktarma ve depolama koşulları, sigorta, hasar sorumluluğu ve toplam maliyet",
    proofRequirements:
      "yetki belgeleri, araç veya taşıyıcı ağı, takip ve teslim kanıtı, hizmet seviyesi verileri, sigorta kapsamı, hasar prosedürü ve benzer hat referansları",
    conversionStep:
      "yük ve rota bilgilerinin alınması, kapasite kontrolü, fiyat teklifi, rezervasyon, takip ve teslim onayı",
    mainPath: "lojistik-cozumleri",
    localPath: "hizmet-hatlari",
  },
  automotive: {
    categoryLabel: "otomotiv ürünü veya hizmeti",
    decisionCriteria:
      "araç uyumluluğu, teknik özellikler, parça veya işçilik kapsamı, bakım aralığı, garanti, teslim süresi, servis ağı ve toplam kullanım maliyeti",
    proofRequirements:
      "şasi veya model bazlı uyumluluk verisi, parça ve işçilik garantisi, yetkili servis veya ustalık belgeleri, test sonuçları, servis kayıtları ve doğrulanabilir müşteri kanıtları",
    conversionStep:
      "araç bilgilerinin doğrulanması, uygunluk ve stok kontrolü, randevu veya teklif, işlem onayı ve servis sonrası kayıt",
    mainPath: "otomotiv-cozumleri",
    localPath: "servis-noktalari",
  },
  real_estate_construction: {
    categoryLabel: "gayrimenkul veya yapı çözümü",
    decisionCriteria:
      "konum, tapu ve ruhsat durumu, net ve brüt alan, teknik şartname, teslim tarihi, kullanım veya kira potansiyeli, ödeme planı ve toplam maliyet",
    proofRequirements:
      "açık proje ve şirket bilgileri, tapu veya ruhsat doğrulaması, teknik şartname, güncel görseller, teslim edilmiş proje referansları ve sözleşme koşulları",
    conversionStep:
      "uygunluk ve bütçe görüşmesi, belge paylaşımı, yer veya proje ziyareti, teklif, sözleşme ve teslim adımları",
    mainPath: "projeler",
    localPath: "bolgeler",
  },
  finance_insurance: {
    categoryLabel: "finansal ürün veya sigorta",
    decisionCriteria:
      "uygunluk koşulları, faiz veya getiri yapısı, prim ve ücretler, vade, teminatlar, istisnalar, risk düzeyi, cayma veya iptal koşulları ve toplam maliyet",
    proofRequirements:
      "yetkili kurum ve lisans bilgileri, güncel oran ve ücret tarihi, sözleşme ve poliçe koşulları, risk bildirimleri, hesaplama örnekleri ve resmi doküman bağlantıları",
    conversionStep:
      "uygunluk kontrolü, teklif veya hesaplama, zorunlu bilgilendirmeler, kimlik doğrulama, başvuru ve onay adımları",
    mainPath: "finansal-cozumler",
    localPath: "subeler",
  },
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
  media_publishing: {
    categoryLabel: "yayın veya içerik kaynağı",
    decisionCriteria:
      "konu kapsamı, yayın sıklığı, editoryal yöntem, yazar uzmanlığı, kaynak kullanımı, düzeltme politikası, erişim biçimi ve abonelik koşulları",
    proofRequirements:
      "yazar ve editör bilgileri, açık kaynak bağlantıları, yayın ve güncelleme tarihi, düzeltme politikası, sahiplik bilgisi ve doğrulanabilir yayın geçmişi",
    conversionStep:
      "ilgili içerik serisine erişim, bülten veya abonelik seçimi, kurumsal kullanım koşulları ve iletişim adımı",
    mainPath: "konular",
    localPath: "yerel-yayinlar",
  },
  nonprofit_public: {
    categoryLabel: "kamu veya sivil toplum hizmeti",
    decisionCriteria:
      "yararlanma veya üyelik koşulları, hizmet kapsamı, yetki alanı, gerekli belgeler, başvuru kanalı, işlem süresi, ücretler ve itiraz yolu",
    proofRequirements:
      "kuruluşun hukuki statüsü, yönetim ve iletişim bilgileri, resmi belgeler, faaliyet ve mali raporlar, güncel mevzuat veya karar bağlantıları ve ölçülebilir etki sonuçları",
    conversionStep:
      "uygunluk kontrolü, gerekli belgelerin hazırlanması, resmi başvuru veya üyelik, takip ve sonuç bildirim adımları",
    mainPath: "hizmetler-ve-programlar",
    localPath: "hizmet-birimleri",
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
  "arasindaki",
  "cozum",
  "cozumler",
  "endustriyel",
  "fark",
  "farki",
  "farklar",
  "farklari",
  "icin",
  "hangi",
  "hangileri",
  "hangileridir",
  "hangisini",
  "hizmet",
  "hizmeti",
  "ile",
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
  "ozellik",
  "ozellikler",
  "ozelliklere",
  "ozellikleri",
  "sec",
  "secerken",
  "secilmeli",
  "sistemi",
  "teknik",
  "tesiste",
  "tesisi",
  "tercih",
  "turkiye",
  "uygun",
  "urun",
  "ve",
  "veya",
]);

function slugify(value: string) {
  return normalizeStrategyText(value)
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function removeLeadingAlternativeSeed(
  value: string
) {
  return value
    .replace(
      /^.+?\s+dışında\s*,?\s*/iu,
      ""
    )
    .trim();
}
function getTopicSlug({
  promptText,
  brandContext,
}: {
  promptText: string;
  brandContext: BrandStrategyContext;
}) {
    const cleanedPromptText =
    removeLeadingAlternativeSeed(promptText);

  const location = findTurkishLocation(
    cleanedPromptText
  );

  const promptTokens = normalizeStrategyText(
    cleanedPromptText
  )
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

function getPromptTopicLabel(promptText: string) {
  const normalizedPrompt =
  removeLeadingAlternativeSeed(promptText)
    .replace(/\s+/g, " ")
    .replace(/[?!.]+$/g, "")
    .trim();
  const comparisonMatch = normalizedPrompt.match(
    /^(.+?)\s+arasındaki\s+farklar\b/i
  );

  if (comparisonMatch?.[1]?.trim()) {
    return comparisonMatch[1].trim();
  }

  const selectionMatch = normalizedPrompt.match(
    /^(.+?)\s+(?:seçerken|alırken|satın alırken)\b/i
  );
  const subjectCandidate =
    selectionMatch?.[1]?.trim() || normalizedPrompt;
  const subjectTokens = subjectCandidate
    .split(/\s+/)
    .filter((token) => {
      const normalizedToken = normalizeStrategyText(token);

      return (
        normalizedToken.length > 2 &&
        !topicStopWords.has(normalizedToken)
      );
    })
    .slice(0, 7);

  return subjectTokens.join(" ") || "bu karar";
}

function getPromptOfferLine({
  brandName,
  promptText,
}: {
  brandName: string;
  promptText: string;
}) {
  const topicLabel = getPromptTopicLabel(promptText);

  return `${topicLabel} konusunda ${brandName} tarafından sunulan seçeneklerin kapsamı, ayırt edici özellikleri ve birbirinden farkları`;
}

function getAudienceLine(context: BrandStrategyContext) {
  const targetAudience = context.targetAudience
    ?.trim()
    .replace(/[.!?;:,]+$/g, "")
    .trim();

  if (targetAudience) {
    return `${targetAudience} için hangi seçeneğin hangi durumda uygun olduğu`;
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
  const promptOfferLine = getPromptOfferLine({
    brandName,
    promptText,
  });
  const audienceLine = getAudienceLine(brandContext);

  switch (intent) {
    case "comparison":
      return {
        deliverable: `${profile.categoryLabel} karşılaştırma rehberi`,
        suggestedPath: strongestCompetitorName
          ? `/karsilastirma/${brandSlug}-${competitorSlug}`
          : `/karsilastirma/${topicSlug}`,
        requiredSections: [
          "Karşılaştırmanın kapsamı, veri tarihi ve kullanılan kaynaklar",
          `${brandName} ile ${
            strongestCompetitorName ?? "alternatiflerin"
          } aynı ölçütlerle karşılaştırıldığı tablo: ${profile.decisionCriteria}`,
          promptOfferLine,
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
          promptOfferLine,
          `${profile.proofRequirements}`,
          `${profile.conversionStep}; LocalBusiness veya uygun alt türde yapısal veri ve son güncelleme tarihi`,
        ],
      };

    case "buying_intent":
      return {
        deliverable: `${profile.categoryLabel} seçim rehberi`,
        suggestedPath: `/${profile.mainPath}/${topicSlug}`,
        requiredSections: [
          promptOfferLine,
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
          promptOfferLine,
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
          `${brandName} teklifinin sorunu hangi koşullarda çözebildiği, çözümün sınırları ve uygun olmadığı durumlar`,
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
          promptOfferLine,
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
          promptOfferLine,
          `${brandName} için uygun kullanıcı profili, güçlü olduğu ve uygun olmadığı durumlar`,
          `${profile.proofRequirements}; kaynaklar, güncelleme tarihi ve ${profile.conversionStep}`,
        ],
      };
  }
}