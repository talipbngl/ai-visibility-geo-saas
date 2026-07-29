import { describe, expect, it } from "vitest";

import { getWebsiteKeywordPreset } from "@/lib/website-analysis/keyword-presets";

type SectorCase = {
  name: string;
  industry: string;
  serviceKeyword: string;
  trustKeyword: string;
  unrelatedKeyword: string;
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

const sectorCases: SectorCase[] = [
  {
    name: "endüstriyel test ve kalibrasyon",
    industry:
      "Endüstriyel test, ölçüm ve kalibrasyon sistemleri",
    serviceKeyword: "kuru blok kalibratör",
    trustKeyword: "iso/iec 17025",
    unrelatedKeyword: "vibrasyon analizi",
  },
  {
    name: "endüstriyel kestirimci bakım",
    industry: "Kestirimci bakım ve vibrasyon analizi",
    serviceKeyword: "vibrasyon analizi",
    trustKeyword: "iso 18436",
    unrelatedKeyword: "kuru blok kalibratör",
  },
  {
    name: "enerji ve çevre",
    industry: "Yenilenebilir enerji",
    serviceKeyword: "ön fizibilite",
    trustKeyword: "performans garantisi",
    unrelatedKeyword: "şasi",
  },
  {
    name: "tarım ve gıda üretimi",
    industry: "Gıda üretimi",
    serviceKeyword: "soğuk zincir",
    trustKeyword: "iso 22000",
    unrelatedKeyword: "sepet",
  },
  {
    name: "lojistik ve taşımacılık",
    industry: "Lojistik",
    serviceKeyword: "parsiyel",
    trustKeyword: "araç filosu",
    unrelatedKeyword: "oda",
  },
  {
    name: "otomotiv",
    industry: "Otomotiv",
    serviceKeyword: "şasi",
    trustKeyword: "orijinal parça",
    unrelatedKeyword: "faiz oranı",
  },
  {
    name: "gayrimenkul ve yapı",
    industry: "Gayrimenkul",
    serviceKeyword: "kat planı",
    trustKeyword: "iskan",
    unrelatedKeyword: "yük takibi",
  },
  {
    name: "finans ve sigorta",
    industry: "Bankacılık",
    serviceKeyword: "faiz oranı",
    trustKeyword: "bddk",
    unrelatedKeyword: "implant",
  },
  {
    name: "SaaS",
    industry: "SaaS",
    serviceKeyword: "api",
    trustKeyword: "gdpr",
    unrelatedKeyword: "kat planı",
  },
  {
    name: "konaklama",
    industry: "Otel ve konaklama",
    serviceKeyword: "rezervasyon",
    trustKeyword: "misafir yorumu",
    unrelatedKeyword: "termokupl",
  },
  {
    name: "profesyonel hizmet",
    industry: "Hukuk bürosu",
    serviceKeyword: "ön görüşme",
    trustKeyword: "yetki belgesi",
    unrelatedKeyword: "soğuk zincir",
  },
  {
    name: "yerel hizmet",
    industry: "Temizlik şirketi",
    serviceKeyword: "hizmet bölgesi",
    trustKeyword: "harita",
    unrelatedKeyword: "prim",
  },
  {
    name: "pazaryeri",
    industry: "Pazaryeri",
    serviceKeyword: "komisyon",
    trustKeyword: "doğrulanmış profil",
    unrelatedKeyword: "muayene",
  },
  {
    name: "e-ticaret",
    industry: "E-ticaret",
    serviceKeyword: "sepet",
    trustKeyword: "mesafeli satış",
    unrelatedKeyword: "ön fizibilite",
  },
  {
    name: "eğitim",
    industry: "Üniversite",
    serviceKeyword: "lgs",
    trustKeyword: "öğretmen",
    unrelatedKeyword: "gümrükleme",
  },
  {
    name: "sağlık",
    industry: "Hastane",
    serviceKeyword: "muayene",
    trustKeyword: "diploma",
    unrelatedKeyword: "sepet",
  },
  {
    name: "tüketici markası",
    industry: "Kozmetik markası",
    serviceKeyword: "içindekiler",
    trustKeyword: "menşei",
    unrelatedKeyword: "yük takibi",
  },
  {
    name: "medya ve yayıncılık",
    industry: "Haber sitesi",
    serviceKeyword: "bülten",
    trustKeyword: "künye",
    unrelatedKeyword: "servis randevusu",
  },
  {
    name: "kamu ve sivil toplum",
    industry: "Dernek",
    serviceKeyword: "gerekli belgeler",
    trustKeyword: "faaliyet raporu",
    unrelatedKeyword: "cold brew",
  },
  {
    name: "diş kliniği özel eşleşmesi",
    industry: "Diş kliniği",
    serviceKeyword: "implant",
    trustKeyword: "hekim",
    unrelatedKeyword: "iso 18436",
  },
  {
    name: "kahve işletmesi özel eşleşmesi",
    industry: "Kahve zinciri",
    serviceKeyword: "espresso",
    trustKeyword: "sadakat",
    unrelatedKeyword: "iskan",
  },
  {
    name: "medikal estetik özel eşleşmesi",
    industry: "Medikal estetik",
    serviceKeyword: "botoks",
    trustKeyword: "öncesi sonrası",
    unrelatedKeyword: "parsiyel",
  },
];

describe("getWebsiteKeywordPreset", () => {
  describe("genel işletme tabanı", () => {
    it.each([
      null,
      undefined,
      "",
      " ",
      "   ",
      "\n\t",
      "Yenilikçi kurumsal çözümler",
    ])(
      "sektör bilgisi yetersiz olduğunda güvenli genel preset döndürür: %j",
      (industry) => {
        expect(
          getWebsiteKeywordPreset(industry)
        ).toEqual({
          serviceKeywords: genericServiceKeywords,
          trustKeywords: genericTrustKeywords,
        });
      }
    );

    it("genel hizmet kelimelerinin sırasını deterministik korur", () => {
      expect(
        getWebsiteKeywordPreset(null).serviceKeywords
      ).toEqual(genericServiceKeywords);
    });

    it("genel güven kelimelerinin sırasını deterministik korur", () => {
      expect(
        getWebsiteKeywordPreset(null).trustKeywords
      ).toEqual(genericTrustKeywords);
    });

    it("genel hizmet kelimelerinde mükerrer kayıt üretmez", () => {
      const { serviceKeywords } =
        getWebsiteKeywordPreset(null);

      expect(new Set(serviceKeywords).size).toBe(
        serviceKeywords.length
      );
    });

    it("genel güven kelimelerinde mükerrer kayıt üretmez", () => {
      const { trustKeywords } =
        getWebsiteKeywordPreset(null);

      expect(new Set(trustKeywords).size).toBe(
        trustKeywords.length
      );
    });

    it("genel preset çağrılarında hizmet dizisini ortak mutable referans olarak paylaşmaz", () => {
      const first = getWebsiteKeywordPreset(null);
      first.serviceKeywords.push(
        "sonraki analize sızmamalı"
      );

      const second = getWebsiteKeywordPreset(null);

      expect(second.serviceKeywords).not.toContain(
        "sonraki analize sızmamalı"
      );
      expect(second.serviceKeywords).toEqual(
        genericServiceKeywords
      );
    });

    it("genel preset çağrılarında güven dizisini ortak mutable referans olarak paylaşmaz", () => {
      const first = getWebsiteKeywordPreset(undefined);
      first.trustKeywords.push(
        "sonraki güven analizine sızmamalı"
      );

      const second = getWebsiteKeywordPreset(undefined);

      expect(second.trustKeywords).not.toContain(
        "sonraki güven analizine sızmamalı"
      );
      expect(second.trustKeywords).toEqual(
        genericTrustKeywords
      );
    });

    it("aynı çağrının hizmet ve güven dizilerini birbirinden bağımsız tutar", () => {
      const preset = getWebsiteKeywordPreset(null);

      expect(preset.serviceKeywords).not.toBe(
        preset.trustKeywords
      );
    });
  });

  describe("sektörler arası kapsama", () => {
    it.each(sectorCases)(
      "$name sektörü için ayırt edici hizmet kelimesi üretir",
      ({ industry, serviceKeyword }) => {
        expect(
          getWebsiteKeywordPreset(industry)
            .serviceKeywords
        ).toContain(serviceKeyword);
      }
    );

    it.each(sectorCases)(
      "$name sektörü için ayırt edici güven kelimesi üretir",
      ({ industry, trustKeyword }) => {
        expect(
          getWebsiteKeywordPreset(industry)
            .trustKeywords
        ).toContain(trustKeyword);
      }
    );

    it.each(sectorCases)(
      "$name sektörüne ilgisiz özel kelimeyi hizmet listesine sızdırmaz",
      ({ industry, unrelatedKeyword }) => {
        expect(
          getWebsiteKeywordPreset(industry)
            .serviceKeywords
        ).not.toContain(unrelatedKeyword);
      }
    );

    it.each(sectorCases)(
      "$name sektöründe genel hizmet tabanını korur",
      ({ industry }) => {
        const preset =
          getWebsiteKeywordPreset(industry);

        for (const keyword of genericServiceKeywords) {
          expect(preset.serviceKeywords).toContain(
            keyword
          );
        }
      }
    );

    it.each(sectorCases)(
      "$name sektöründe genel güven tabanını korur",
      ({ industry }) => {
        const preset =
          getWebsiteKeywordPreset(industry);

        for (const keyword of genericTrustKeywords) {
          expect(preset.trustKeywords).toContain(
            keyword
          );
        }
      }
    );

    it.each(sectorCases)(
      "$name sektörünün hizmet listesinde mükerrer kayıt üretmez",
      ({ industry }) => {
        const { serviceKeywords } =
          getWebsiteKeywordPreset(industry);

        expect(new Set(serviceKeywords).size).toBe(
          serviceKeywords.length
        );
      }
    );

    it.each(sectorCases)(
      "$name sektörünün güven listesinde mükerrer kayıt üretmez",
      ({ industry }) => {
        const { trustKeywords } =
          getWebsiteKeywordPreset(industry);

        expect(new Set(trustKeywords).size).toBe(
          trustKeywords.length
        );
      }
    );

    it.each(sectorCases)(
      "$name sektöründe boş veya dış boşluklu anahtar kelime üretmez",
      ({ industry }) => {
        const preset =
          getWebsiteKeywordPreset(industry);

        for (const keyword of [
          ...preset.serviceKeywords,
          ...preset.trustKeywords,
        ]) {
          expect(keyword).not.toBe("");
          expect(keyword).toBe(keyword.trim());
        }
      }
    );

    it.each(sectorCases)(
      "$name sektörü her çağrıda bağımsız diziler döndürür",
      ({ industry }) => {
        const first =
          getWebsiteKeywordPreset(industry);
        const second =
          getWebsiteKeywordPreset(industry);

        expect(first).not.toBe(second);
        expect(first.serviceKeywords).not.toBe(
          second.serviceKeywords
        );
        expect(first.trustKeywords).not.toBe(
          second.trustKeywords
        );
        expect(first).toEqual(second);
      }
    );
  });

  describe("TKS ve DMT sektör izolasyonu", () => {
    it.each([
      "kuru blok kalibratör",
      "sıcaklık kalibrasyon banyosu",
      "siyah cisim",
      "referans termometre",
      "termokupl",
      "ölçüm belirsizliği",
    ])(
      "TKS benzeri test ve kalibrasyon firmasında %s hizmet sinyalini arar",
      (keyword) => {
        expect(
          getWebsiteKeywordPreset(
            "Endüstriyel test, ölçüm ve kalibrasyon sistemleri"
          ).serviceKeywords
        ).toContain(keyword);
      }
    );

    it.each([
      "iso/iec 17025",
      "türkak",
      "akreditasyon",
      "teknik veri sayfası",
      "satış sonrası destek",
      "laboratuvar",
    ])(
      "TKS benzeri test ve kalibrasyon firmasında %s güven sinyalini arar",
      (keyword) => {
        expect(
          getWebsiteKeywordPreset(
            "Endüstriyel test, ölçüm ve kalibrasyon sistemleri"
          ).trustKeywords
        ).toContain(keyword);
      }
    );

    it.each([
      "kestirimci bakım",
      "vibrasyon analizi",
      "durum izleme",
      "lazerli kaplin ayarı",
      "yerinde balans",
      "termal kamera",
    ])(
      "TKS benzeri firmaya DMT hizmet sinyali %s değerini sızdırmaz",
      (keyword) => {
        expect(
          getWebsiteKeywordPreset(
            "Endüstriyel test, ölçüm ve kalibrasyon sistemleri"
          ).serviceKeywords
        ).not.toContain(keyword);
      }
    );

    it.each([
      "kestirimci bakım",
      "vibrasyon analizi",
      "durum izleme",
      "lazerli kaplin ayarı",
      "yerinde balans",
      "termal kamera",
    ])(
      "DMT benzeri bakım firmasında %s hizmet sinyalini arar",
      (keyword) => {
        expect(
          getWebsiteKeywordPreset(
            "Kestirimci bakım, vibrasyon analizi ve durum izleme"
          ).serviceKeywords
        ).toContain(keyword);
      }
    );

    it.each([
      "iso 18436",
      "sertifikalı uzman",
      "referans proje",
      "örnek rapor",
      "cihaz parkı",
      "teknik destek",
    ])(
      "DMT benzeri bakım firmasında %s güven sinyalini arar",
      (keyword) => {
        expect(
          getWebsiteKeywordPreset(
            "Kestirimci bakım, vibrasyon analizi ve durum izleme"
          ).trustKeywords
        ).toContain(keyword);
      }
    );

    it.each([
      "kuru blok kalibratör",
      "sıcaklık kalibrasyon banyosu",
      "siyah cisim",
      "referans termometre",
      "termokupl",
      "sprt",
    ])(
      "DMT benzeri firmaya TKS hizmet sinyali %s değerini sızdırmaz",
      (keyword) => {
        expect(
          getWebsiteKeywordPreset(
            "Kestirimci bakım, vibrasyon analizi ve durum izleme"
          ).serviceKeywords
        ).not.toContain(keyword);
      }
    );
  });

  describe("normalizasyon ve kelime sınırı", () => {
    it.each([
      "DİŞ KLİNİĞİ",
      "diş-kliniği",
      "Ağız ve Diş Sağlığı",
      "Dental Klinik",
    ])(
      "Türkçe ve noktalama varyantı %s değerini dental preset olarak çözer",
      (industry) => {
        expect(
          getWebsiteKeywordPreset(industry)
            .serviceKeywords
        ).toContain("implant");
      }
    );

    it.each([
      "KAHVE",
      "Coffee",
      "KAFE",
      "Cafe zinciri",
    ])(
      "büyük-küçük harf varyantı %s değerini kahve preset olarak çözer",
      (industry) => {
        expect(
          getWebsiteKeywordPreset(industry)
            .serviceKeywords
        ).toContain("espresso");
      }
    );

    it.each([
      "E-TİCARET",
      "eticaret",
      "ECOMMERCE",
      "Online mağaza",
    ])(
      "yazım varyantı %s değerini e-ticaret preset olarak çözer",
      (industry) => {
        expect(
          getWebsiteKeywordPreset(industry)
            .serviceKeywords
        ).toContain("sepet");
      }
    );

    it.each([
      "LGS kursu",
      "YKS eğitim kurumu",
      "ÖZEL DERS",
      "Üniversite",
    ])(
      "eğitim varyantı %s değerini eğitim preset olarak çözer",
      (industry) => {
        expect(
          getWebsiteKeywordPreset(industry)
            .serviceKeywords
        ).toContain("rehberlik");
      }
    );

    it.each([
      "mühendislik",
      "endüstriyel mühendislik",
      "dış ticaret",
      "dış cephe",
      "dişli üretimi",
    ])(
      "%s içindeki benzer karakterleri diş kelimesi sanmaz",
      (industry) => {
        expect(
          getWebsiteKeywordPreset(industry)
            .serviceKeywords
        ).not.toContain("implant");
      }
    );

    it.each([
      "kafes üretimi",
      "kafeterya ekipmanları",
      "coffeeScript yazılımı",
    ])(
      "%s içindeki benzer kelimeyi kahve işletmesi sanmaz",
      (industry) => {
        expect(
          getWebsiteKeywordPreset(industry)
            .serviceKeywords
        ).not.toContain("espresso");
      }
    );
  });
});