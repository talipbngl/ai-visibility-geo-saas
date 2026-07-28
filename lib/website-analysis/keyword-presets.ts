import { resolveBusinessArchetype } from "@/lib/strategy/business-archetypes";

type KeywordPreset = {
  serviceKeywords: string[];
  trustKeywords: string[];
};

const genericServiceKeywords = [
  "hizmet",
  "ürün",
  "çözüm",
  "paket",
  "fiyat",
  "kampanya",
  "randevu",
  "online",
  "destek",
  "başvuru",
  "iletişim",
];

const genericTrustKeywords = [
  "hakkımızda",
  "yorum",
  "referans",
  "müşteri",
  "deneyim",
  "sertifika",
  "iletişim",
  "adres",
  "telefon",
  "kvkk",
  "gizlilik",
  "sıkça sorulan",
  "sss",
];

const dentalPreset: KeywordPreset = {
  serviceKeywords: [
    "implant",
    "ortodonti",
    "çocuk diş",
    "pedodonti",
    "diş beyazlatma",
    "kanal tedavisi",
    "zirkonyum",
    "gülüş tasarımı",
    "estetik diş",
    "diş taşı",
    "periodontoloji",
    "protez",
    "dolgu",
    "şeffaf plak",
    "acil diş",
  ],
  trustKeywords: [
    "doktor",
    "hekim",
    "uzman",
    "hasta yorumu",
    "yorum",
    "randevu",
    "iletişim",
    "adres",
    "telefon",
    "hakkımızda",
    "sıkça sorulan",
    "sss",
    "kvkk",
  ],
};

const coffeePreset: KeywordPreset = {
  serviceKeywords: [
    "kahve",
    "espresso",
    "latte",
    "americano",
    "cappuccino",
    "filtre kahve",
    "frappuccino",
    "cold brew",
    "menü",
    "yiyecek",
    "tatlı",
    "sandviç",
    "paket servis",
    "şube",
    "mağaza",
    "sipariş",
  ],
  trustKeywords: [
    "hakkımızda",
    "iletişim",
    "şube",
    "mağaza",
    "adres",
    "kariyer",
    "sosyal sorumluluk",
    "müşteri hizmetleri",
    "kvkk",
    "gizlilik",
    "ödül",
    "üyelik",
    "sadakat",
  ],
};

const educationPreset: KeywordPreset = {
  serviceKeywords: [
    "lgs",
    "yks",
    "tyt",
    "ayt",
    "özel ders",
    "kurs",
    "eğitim",
    "matematik",
    "fen",
    "türkçe",
    "sınav",
    "deneme",
    "rehberlik",
    "online eğitim",
    "öğrenci",
    "başarı",
  ],
  trustKeywords: [
    "öğretmen",
    "eğitmen",
    "başarı",
    "sonuç",
    "yorum",
    "veli",
    "öğrenci",
    "referans",
    "iletişim",
    "adres",
    "telefon",
    "hakkımızda",
    "sss",
  ],
};

const ecommercePreset: KeywordPreset = {
  serviceKeywords: [
    "ürün",
    "sepet",
    "kargo",
    "iade",
    "değişim",
    "kampanya",
    "indirim",
    "sipariş",
    "ödeme",
    "teslimat",
    "stok",
    "favori",
    "kategori",
    "marka",
  ],
  trustKeywords: [
    "güvenli ödeme",
    "iade",
    "değişim",
    "müşteri hizmetleri",
    "yorum",
    "iletişim",
    "kvkk",
    "gizlilik",
    "mesafeli satış",
    "üyelik",
    "yardım",
  ],
};

const aestheticPreset: KeywordPreset = {
  serviceKeywords: [
    "botoks",
    "dolgu",
    "cilt bakımı",
    "lazer",
    "epilasyon",
    "mezoterapi",
    "saç ekimi",
    "estetik",
    "medikal estetik",
    "zayıflama",
    "leke tedavisi",
    "gençlik aşısı",
  ],
  trustKeywords: [
    "doktor",
    "uzman",
    "klinik",
    "hasta yorumu",
    "öncesi sonrası",
    "randevu",
    "iletişim",
    "adres",
    "telefon",
    "sertifika",
    "hakkımızda",
  ],
};

const saasPreset: KeywordPreset = {
  serviceKeywords: [
    "özellikler",
    "entegrasyon",
    "fiyatlandırma",
    "ücretsiz deneme",
    "demo",
    "api",
    "mobil uygulama",
    "raporlama",
    "otomasyon",
    "destek",
    "kurulum",
    "abonelik",
  ],
  trustKeywords: [
    "güvenlik",
    "kvkk",
    "gdpr",
    "durum sayfası",
    "hizmet seviyesi",
    "sla",
    "müşteri hikayesi",
    "entegrasyon",
    "dokümantasyon",
    "destek",
  ],
};

const hospitalityPreset: KeywordPreset = {
  serviceKeywords: [
    "rezervasyon",
    "müsaitlik",
    "oda",
    "menü",
    "konum",
    "olanaklar",
    "kahvaltı",
    "etkinlik",
    "check-in",
    "iptal",
    "fiyat",
    "paket",
  ],
  trustKeywords: [
    "misafir yorumu",
    "adres",
    "harita",
    "iletişim",
    "iptal koşulları",
    "erişilebilirlik",
    "hijyen",
    "ruhsat",
    "gizlilik",
  ],
};

const professionalServicePreset: KeywordPreset = {
  serviceKeywords: [
    "hizmet alanı",
    "danışmanlık",
    "uzmanlık",
    "süreç",
    "teklif",
    "ücret",
    "randevu",
    "ön görüşme",
    "proje",
    "teslimat",
  ],
  trustKeywords: [
    "ekip",
    "uzman",
    "yetki belgesi",
    "referans",
    "vaka çalışması",
    "müşteri yorumu",
    "gizlilik",
    "sözleşme",
    "iletişim",
  ],
};

const localServicePreset: KeywordPreset = {
  serviceKeywords: [
    "hizmet bölgesi",
    "randevu",
    "çalışma saati",
    "fiyat",
    "teklif",
    "acil hizmet",
    "bakım",
    "kurulum",
    "servis",
    "garanti",
  ],
  trustKeywords: [
    "adres",
    "harita",
    "telefon",
    "ekip",
    "yetkili servis",
    "ruhsat",
    "garanti",
    "müşteri yorumu",
    "referans",
  ],
};

const healthcarePreset: KeywordPreset = {
  serviceKeywords: [
    "uzmanlık alanı",
    "muayene",
    "ön değerlendirme",
    "tedavi",
    "randevu",
    "doktor",
    "klinik",
    "hasta kabul",
    "ücret",
    "sigorta",
  ],
  trustKeywords: [
    "hekim",
    "uzman",
    "diploma",
    "ruhsat",
    "bilimsel kaynak",
    "hasta hakları",
    "aydınlatılmış onam",
    "kvkk",
    "adres",
    "iletişim",
  ],
};

const consumerBrandPreset: KeywordPreset = {
  serviceKeywords: [
    "ürünler",
    "çeşitler",
    "içindekiler",
    "teknik özellikler",
    "kullanım",
    "fiyat",
    "stok",
    "satış noktası",
    "mağaza",
    "sipariş",
  ],
  trustKeywords: [
    "kalite",
    "sertifika",
    "üretim",
    "menşei",
    "garanti",
    "iade",
    "müşteri hizmetleri",
    "yorum",
    "iletişim",
  ],
};

const marketplacePreset: KeywordPreset = {
  serviceKeywords: [
    "kategori",
    "arama",
    "filtre",
    "satıcı",
    "hizmet veren",
    "teklif",
    "komisyon",
    "ücret",
    "ödeme",
    "teslimat",
  ],
  trustKeywords: [
    "doğrulanmış profil",
    "güvenli ödeme",
    "yorum",
    "puan",
    "alıcı koruması",
    "satıcı politikası",
    "uyuşmazlık",
    "destek",
  ],
};

function normalizeIndustry(value: string | null | undefined) {
  return (value ?? "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function mergePresets(...presets: KeywordPreset[]): KeywordPreset {
  return {
    serviceKeywords: Array.from(
      new Set(
        presets.flatMap((preset) => preset.serviceKeywords)
      )
    ),
    trustKeywords: Array.from(
      new Set(
        presets.flatMap((preset) => preset.trustKeywords)
      )
    ),
  };
}

export function getWebsiteKeywordPreset(industry: string | null | undefined) {
  const normalizedIndustry = normalizeIndustry(industry);
  const genericPreset = {
    serviceKeywords: genericServiceKeywords,
    trustKeywords: genericTrustKeywords,
  };

  if (
    normalizedIndustry.includes("dis") ||
    normalizedIndustry.includes("dental") ||
    normalizedIndustry.includes("klinik")
  ) {
    return mergePresets(genericPreset, dentalPreset);
  }

  if (
    normalizedIndustry.includes("kahve") ||
    normalizedIndustry.includes("cafe") ||
    normalizedIndustry.includes("kafe") ||
    normalizedIndustry.includes("coffee")
  ) {
    return mergePresets(genericPreset, coffeePreset);
  }

  if (
    normalizedIndustry.includes("egitim") ||
    normalizedIndustry.includes("kurs") ||
    normalizedIndustry.includes("okul") ||
    normalizedIndustry.includes("lgs") ||
    normalizedIndustry.includes("yks")
  ) {
    return mergePresets(genericPreset, educationPreset);
  }

  if (
    normalizedIndustry.includes("e-ticaret") ||
    normalizedIndustry.includes("eticaret") ||
    normalizedIndustry.includes("ecommerce") ||
    normalizedIndustry.includes("magaza")
  ) {
    return mergePresets(genericPreset, ecommercePreset);
  }

  if (
    normalizedIndustry.includes("estetik") ||
    normalizedIndustry.includes("guzellik") ||
    normalizedIndustry.includes("medikal")
  ) {
    return mergePresets(genericPreset, aestheticPreset);
  }

  const archetype = resolveBusinessArchetype({
    industry,
  });

  const archetypePresets: Partial<
    Record<typeof archetype, KeywordPreset>
  > = {
    saas: saasPreset,
    hospitality: hospitalityPreset,
    professional_service: professionalServicePreset,
    local_service: localServicePreset,
    marketplace: marketplacePreset,
    ecommerce: ecommercePreset,
    education: educationPreset,
    healthcare: healthcarePreset,
    consumer_brand: consumerBrandPreset,
  };
  const archetypePreset = archetypePresets[archetype];

  return archetypePreset
    ? mergePresets(genericPreset, archetypePreset)
    : genericPreset;
}