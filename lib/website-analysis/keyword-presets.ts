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

export function getWebsiteKeywordPreset(industry: string | null | undefined) {
  const normalizedIndustry = normalizeIndustry(industry);

  if (
    normalizedIndustry.includes("dis") ||
    normalizedIndustry.includes("dental") ||
    normalizedIndustry.includes("klinik")
  ) {
    return dentalPreset;
  }

  if (
    normalizedIndustry.includes("kahve") ||
    normalizedIndustry.includes("cafe") ||
    normalizedIndustry.includes("kafe") ||
    normalizedIndustry.includes("coffee")
  ) {
    return coffeePreset;
  }

  if (
    normalizedIndustry.includes("egitim") ||
    normalizedIndustry.includes("kurs") ||
    normalizedIndustry.includes("okul") ||
    normalizedIndustry.includes("lgs") ||
    normalizedIndustry.includes("yks")
  ) {
    return educationPreset;
  }

  if (
    normalizedIndustry.includes("e-ticaret") ||
    normalizedIndustry.includes("eticaret") ||
    normalizedIndustry.includes("ecommerce") ||
    normalizedIndustry.includes("magaza")
  ) {
    return ecommercePreset;
  }

  if (
    normalizedIndustry.includes("estetik") ||
    normalizedIndustry.includes("guzellik") ||
    normalizedIndustry.includes("medikal")
  ) {
    return aestheticPreset;
  }

  return {
    serviceKeywords: genericServiceKeywords,
    trustKeywords: genericTrustKeywords,
  };
}