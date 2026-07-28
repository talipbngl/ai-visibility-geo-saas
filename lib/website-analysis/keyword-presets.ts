import {
  matchesStrategyTerm,
  resolveBusinessArchetype,
  type BusinessArchetype,
} from "@/lib/strategy/business-archetypes";

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
const industrialInstrumentationPreset: KeywordPreset = {
  serviceKeywords: [
    "kuru blok kalibratör",
    "sıcaklık kalibrasyon banyosu",
    "siyah cisim",
    "infrared kalibrasyon",
    "çok fonksiyonlu kalibratör",
    "elektriksel test cihazı",
    "basınç kalibratörü",
    "referans termometre",
    "termokupl",
    "rtd",
    "prt",
    "sprt",
    "kalibrasyon fırını",
    "test kabini",
    "sıcaklık aralığı",
    "kararlılık",
    "homojenlik",
    "ölçüm belirsizliği",
    "teknik özellik",
    "aksesuar",
    "teknik servis",
  ],
  trustKeywords: [
    "üretici",
    "yerli üretim",
    "distribütör",
    "yetkili distribütör",
    "kalibrasyon sertifikası",
    "izlenebilirlik",
    "ölçüm belirsizliği",
    "iso/iec 17025",
    "türkak",
    "akreditasyon",
    "teknik veri sayfası",
    "katalog",
    "garanti",
    "teknik servis",
    "satış sonrası destek",
    "kullanıcı eğitimi",
    "referans",
    "laboratuvar",
    "servis merkezi",
  ],
};
const industrialB2bPreset: KeywordPreset = {
  serviceKeywords: [
    "kestirimci bakım",
    "vibrasyon analizi",
    "durum izleme",
    "online izleme",
    "titreşim sensörü",
    "lazerli kaplin ayarı",
    "yerinde balans",
    "ultrasonik kontrol",
    "termal kamera",
    "kalibrasyon",
    "devreye alma",
    "teknik eğitim",
    "saha hizmeti",
    "ölçüm raporu",
    "bakım planı",
  ],
  trustKeywords: [
    "iso 18436",
    "sertifikalı uzman",
    "kalibrasyon sertifikası",
    "yetkili distribütör",
    "teknik ekip",
    "referans proje",
    "vaka çalışması",
    "örnek rapor",
    "cihaz parkı",
    "servis merkezi",
    "garanti",
    "teknik destek",
  ],
};

const energyEnvironmentPreset: KeywordPreset = {
  serviceKeywords: [
    "ön fizibilite",
    "saha keşfi",
    "projelendirme",
    "kurulum",
    "devreye alma",
    "enerji izleme",
    "bakım",
    "üretim tahmini",
    "tasarruf hesabı",
    "karbon hesabı",
    "atık yönetimi",
    "arıtma",
  ],
  trustKeywords: [
    "yetki belgesi",
    "lisans",
    "mühendislik ekibi",
    "ekipman garantisi",
    "performans garantisi",
    "üretim raporu",
    "tasarruf raporu",
    "proje referansı",
    "çevre izni",
    "iş güvenliği",
  ],
};

const agricultureFoodPreset: KeywordPreset = {
  serviceKeywords: [
    "ürün grubu",
    "üretim kapasitesi",
    "hasat",
    "tedarik",
    "numune",
    "analiz",
    "depolama",
    "soğuk zincir",
    "paketleme",
    "izlenebilirlik",
    "toptan satış",
    "ihracat",
  ],
  trustKeywords: [
    "üretim tesisi",
    "menşei",
    "parti numarası",
    "analiz sertifikası",
    "kalite belgesi",
    "gıda güvenliği",
    "organik sertifika",
    "halal",
    "iso 22000",
    "üretici belgesi",
    "referans",
  ],
};

const logisticsTransportPreset: KeywordPreset = {
  serviceKeywords: [
    "taşıma türü",
    "hizmet hattı",
    "çıkış noktası",
    "varış noktası",
    "teslim süresi",
    "yük takibi",
    "depolama",
    "gümrükleme",
    "sigorta",
    "parsiyel",
    "komple yük",
    "teklif",
  ],
  trustKeywords: [
    "yetki belgesi",
    "araç filosu",
    "taşıyıcı ağı",
    "teslimat kanıtı",
    "hizmet seviyesi",
    "hasar prosedürü",
    "sigorta kapsamı",
    "iso 9001",
    "referans",
    "canlı takip",
  ],
};

const automotivePreset: KeywordPreset = {
  serviceKeywords: [
    "araç uyumluluğu",
    "model",
    "şasi",
    "yedek parça",
    "bakım",
    "onarım",
    "servis randevusu",
    "stok",
    "işçilik",
    "garanti",
    "fiyat teklifi",
    "teslim süresi",
  ],
  trustKeywords: [
    "yetkili servis",
    "usta belgesi",
    "orijinal parça",
    "parça garantisi",
    "işçilik garantisi",
    "servis kaydı",
    "test sonucu",
    "müşteri yorumu",
    "açık adres",
    "telefon",
  ],
};

const realEstateConstructionPreset: KeywordPreset = {
  serviceKeywords: [
    "proje",
    "konum",
    "net alan",
    "brüt alan",
    "kat planı",
    "teknik şartname",
    "teslim tarihi",
    "ödeme planı",
    "fiyat",
    "satılık",
    "kiralık",
    "randevu",
  ],
  trustKeywords: [
    "tapu",
    "ruhsat",
    "iskan",
    "yapı denetim",
    "şirket unvanı",
    "teslim edilmiş proje",
    "proje referansı",
    "sözleşme",
    "açık adres",
    "iletişim",
  ],
};

const financeInsurancePreset: KeywordPreset = {
  serviceKeywords: [
    "uygunluk koşulları",
    "faiz oranı",
    "getiri",
    "prim",
    "vade",
    "teminat",
    "istisna",
    "ücret",
    "komisyon",
    "hesaplama",
    "başvuru",
    "iptal",
  ],
  trustKeywords: [
    "lisans",
    "yetkili kurum",
    "bddk",
    "spk",
    "seddk",
    "risk bildirimi",
    "sözleşme",
    "poliçe",
    "güncelleme tarihi",
    "gizlilik",
    "kvkk",
    "iletişim",
  ],
};

const mediaPublishingPreset: KeywordPreset = {
  serviceKeywords: [
    "konular",
    "haber",
    "makale",
    "dosya",
    "bülten",
    "abonelik",
    "podcast",
    "video",
    "arşiv",
    "yazar",
  ],
  trustKeywords: [
    "künye",
    "editör",
    "yazar profili",
    "kaynakça",
    "yayın tarihi",
    "güncelleme tarihi",
    "düzeltme politikası",
    "sahiplik",
    "iletişim",
    "gizlilik",
  ],
};

const nonprofitPublicPreset: KeywordPreset = {
  serviceKeywords: [
    "hizmet",
    "program",
    "başvuru",
    "üyelik",
    "gerekli belgeler",
    "işlem süresi",
    "duyuru",
    "etkinlik",
    "mevzuat",
    "bağış",
  ],
  trustKeywords: [
    "hukuki statü",
    "yönetim",
    "faaliyet raporu",
    "mali rapor",
    "resmi belge",
    "karar",
    "mevzuat",
    "açık adres",
    "iletişim",
    "kvkk",
  ],
};

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
  const genericPreset = {
    serviceKeywords: genericServiceKeywords,
    trustKeywords: genericTrustKeywords,
  };
  const matchesAny = (terms: string[]) =>
    terms.some((term) =>
      matchesStrategyTerm(industry ?? "", term)
    );

  if (
    matchesAny([
      "dis",
      "dis hekim*",
      "dis klinigi",
      "agiz ve dis sagligi",
      "dental",
    ])
  ) {
    return mergePresets(genericPreset, dentalPreset);
  }

  if (
    matchesAny(["kahve", "cafe", "kafe", "coffee"])
  ) {
    return mergePresets(genericPreset, coffeePreset);
  }

  if (
    matchesAny([
      "egitim",
      "kurs",
      "okul",
      "lgs",
      "yks",
      "tyt",
      "ayt",
    ])
  ) {
    return mergePresets(genericPreset, educationPreset);
  }

  if (
    matchesAny([
      "e ticaret",
      "eticaret",
      "ecommerce",
      "online magaza",
    ])
  ) {
    return mergePresets(genericPreset, ecommercePreset);
  }

  if (
    matchesAny([
      "medikal estetik",
      "estetik klinigi",
      "guzellik merkezi",
      "botoks",
      "sac ekimi",
    ])
  ) {
    return mergePresets(genericPreset, aestheticPreset);
  }

  const archetype = resolveBusinessArchetype({
    industry,
  });

  const archetypePresets: Partial<
  Record<BusinessArchetype, KeywordPreset>
> = {
  industrial_instrumentation:
    industrialInstrumentationPreset,
  industrial_b2b: industrialB2bPreset,
    energy_environment: energyEnvironmentPreset,
    agriculture_food_production: agricultureFoodPreset,
    logistics_transport: logisticsTransportPreset,
    automotive: automotivePreset,
    real_estate_construction: realEstateConstructionPreset,
    finance_insurance: financeInsurancePreset,
    saas: saasPreset,
    hospitality: hospitalityPreset,
    professional_service: professionalServicePreset,
    local_service: localServicePreset,
    marketplace: marketplacePreset,
    ecommerce: ecommercePreset,
    education: educationPreset,
    healthcare: healthcarePreset,
    consumer_brand: consumerBrandPreset,
    media_publishing: mediaPublishingPreset,
    nonprofit_public: nonprofitPublicPreset,
  };
  const archetypePreset = archetypePresets[archetype];

  return archetypePreset
    ? mergePresets(genericPreset, archetypePreset)
    : genericPreset;
}