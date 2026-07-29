import { describe, expect, it } from "vitest";

import {
  buildContentActionBlueprint,
  type ContentActionBlueprint,
} from "@/lib/strategy/content-action-blueprints";
import type { BrandStrategyContext } from "@/lib/strategy/business-archetypes";
import type { PromptIntent } from "@/lib/strategy/prompt-intents";

type SectorCase = {
  name: string;
  context: BrandStrategyContext;
  categoryLabel: string;
  mainPath: string;
  localPath: string;
  proofFragment: string;
};

const sectorCases: SectorCase[] = [
  {
    name: "endüstriyel test ve kalibrasyon",
    context: {
      industry:
        "Endüstriyel test, ölçüm ve kalibrasyon sistemleri",
      primaryOffer:
        "Kuru blok kalibratör ve sıcaklık kalibrasyon banyosu",
    },
    categoryLabel:
      "endüstriyel test, ölçüm ve kalibrasyon cihazı",
    mainPath: "test-ve-kalibrasyon-cihazlari",
    localPath: "teknik-servis",
    proofFragment: "teknik veri sayfası",
  },
  {
    name: "endüstriyel bakım",
    context: {
      industry: "Kestirimci bakım ve vibrasyon analizi",
      primaryOffer:
        "Vibrasyon analizi ve lazerli kaplin ayarı",
    },
    categoryLabel: "endüstriyel çözüm",
    mainPath: "endustriyel-cozumler",
    localPath: "saha-hizmetleri",
    proofFragment: "örnek ölçüm",
  },
  {
    name: "enerji ve çevre",
    context: {
      industry: "Yenilenebilir enerji",
      primaryOffer: "Güneş enerji santrali kurulumu",
    },
    categoryLabel: "enerji veya çevre çözümü",
    mainPath: "enerji-cevre-cozumleri",
    localPath: "proje-bolgeleri",
    proofFragment: "yetki ve yeterlilik",
  },
  {
    name: "tarım ve gıda üretimi",
    context: {
      industry: "Gıda üretimi",
      primaryOffer: "İzlenebilir üretim çözümleri",
    },
    categoryLabel: "tarım veya üretim çözümü",
    mainPath: "tarim-uretim-cozumleri",
    localPath: "uretim-bolgeleri",
    proofFragment: "parti ve menşe",
  },
  {
    name: "lojistik",
    context: {
      industry: "Lojistik",
      primaryOffer: "Soğuk zincir taşımacılığı",
    },
    categoryLabel: "lojistik hizmeti",
    mainPath: "lojistik-cozumleri",
    localPath: "hizmet-hatlari",
    proofFragment: "yetki belgeleri",
  },
  {
    name: "otomotiv",
    context: {
      industry: "Otomotiv",
      primaryOffer: "Araç bakım ve yedek parça",
    },
    categoryLabel: "otomotiv ürünü veya hizmeti",
    mainPath: "otomotiv-cozumleri",
    localPath: "servis-noktalari",
    proofFragment: "şasi veya model",
  },
  {
    name: "gayrimenkul ve inşaat",
    context: {
      industry: "Gayrimenkul",
      primaryOffer: "Konut projeleri",
    },
    categoryLabel: "gayrimenkul veya yapı çözümü",
    mainPath: "projeler",
    localPath: "bolgeler",
    proofFragment: "tapu veya ruhsat",
  },
  {
    name: "sağlık",
    context: {
      industry: "Hastane",
      primaryOffer: "Ortopedi tedavileri",
    },
    categoryLabel: "sağlık hizmeti",
    mainPath: "tedaviler",
    localPath: "klinikler",
    proofFragment: "hekim bilgileri",
  },
  {
    name: "finans ve sigorta",
    context: {
      industry: "Bankacılık",
      primaryOffer: "KOBİ finansmanı",
    },
    categoryLabel: "finansal ürün veya sigorta",
    mainPath: "finansal-cozumler",
    localPath: "subeler",
    proofFragment: "yetkili kurum",
  },
  {
    name: "eğitim",
    context: {
      industry: "Üniversite",
      primaryOffer: "Yazılım eğitim programı",
    },
    categoryLabel: "eğitim programı",
    mainPath: "programlar",
    localPath: "egitim-merkezleri",
    proofFragment: "eğitmen yetkinliği",
  },
  {
    name: "SaaS",
    context: {
      industry: "SaaS",
      primaryOffer: "CRM yazılımı",
    },
    categoryLabel: "yazılım çözümü",
    mainPath: "cozumler",
    localPath: "cozumler",
    proofFragment: "güvenlik belgeleri",
  },
  {
    name: "e-ticaret",
    context: {
      industry: "E-ticaret",
      primaryOffer: "Ev elektroniği ürünleri",
    },
    categoryLabel: "ürün",
    mainPath: "urun-rehberi",
    localPath: "magazalar",
    proofFragment: "iade koşulları",
  },
  {
    name: "pazaryeri",
    context: {
      industry: "Pazaryeri",
      primaryOffer: "Hizmet veren pazaryeri",
    },
    categoryLabel: "pazaryeri kategorisi",
    mainPath: "kategoriler",
    localPath: "bolgeler",
    proofFragment: "doğrulanmış satıcı",
  },
  {
    name: "konaklama",
    context: {
      industry: "Otel ve konaklama",
      primaryOffer: "Aile oteli",
    },
    categoryLabel: "konaklama veya deneyim",
    mainPath: "deneyimler",
    localPath: "destinasyonlar",
    proofFragment: "misafir yorumları",
  },
  {
    name: "profesyonel hizmet",
    context: {
      industry: "Hukuk bürosu",
      primaryOffer: "Şirketler hukuku danışmanlığı",
    },
    categoryLabel: "profesyonel hizmet",
    mainPath: "hizmetler",
    localPath: "ofisler",
    proofFragment: "ekip özgeçmişleri",
  },
  {
    name: "yerel hizmet",
    context: {
      industry: "Temizlik şirketi",
      primaryOffer: "Ev ve ofis temizliği",
    },
    categoryLabel: "hizmet",
    mainPath: "hizmetler",
    localPath: "hizmet-bolgeleri",
    proofFragment: "ruhsat veya yetki",
  },
  {
    name: "tüketici markası",
    context: {
      industry: "Kozmetik markası",
      primaryOffer: "Cilt bakım ürünleri",
    },
    categoryLabel: "ürün grubu",
    mainPath: "urunler",
    localPath: "satis-noktalari",
    proofFragment: "kalite belgeleri",
  },
  {
    name: "medya ve yayıncılık",
    context: {
      industry: "Haber sitesi",
      primaryOffer: "Sektörel haber yayını",
    },
    categoryLabel: "yayın veya içerik kaynağı",
    mainPath: "konular",
    localPath: "yerel-yayinlar",
    proofFragment: "yazar ve editör",
  },
  {
    name: "kamu ve sivil toplum",
    context: {
      industry: "Dernek",
      primaryOffer: "Üyelik ve sosyal destek programları",
    },
    categoryLabel: "kamu veya sivil toplum hizmeti",
    mainPath: "hizmetler-ve-programlar",
    localPath: "hizmet-birimleri",
    proofFragment: "hukuki statüsü",
  },
  {
    name: "bilinmeyen sektör",
    context: {
      industry: "Yenilikçi kurumsal çözümler",
      primaryOffer: "İşletmelere özel seçenekler",
    },
    categoryLabel: "ürün veya hizmet",
    mainPath: "cozumler",
    localPath: "hizmet-bolgeleri",
    proofFragment: "şirket bilgileri",
  },
];

function buildBlueprint({
  context = {
    industry: "SaaS",
    primaryOffer: "CRM yazılımı",
  },
  promptText = "KOBİ'ler için CRM yazılımı seçerken nelere bakılmalı?",
  intent = "buying_intent",
  brandName = "ASPEQO",
  strongestCompetitorName = null,
  detectedServiceKeywords = [],
}: {
  context?: BrandStrategyContext;
  promptText?: string;
  intent?: PromptIntent | null;
  brandName?: string;
  strongestCompetitorName?: string | null;
  detectedServiceKeywords?: string[];
} = {}): ContentActionBlueprint {
  return buildContentActionBlueprint({
    brandName,
    brandContext: context,
    promptText,
    intent,
    strongestCompetitorName,
    detectedServiceKeywords,
  });
}

describe("buildContentActionBlueprint", () => {
  describe("sektör bağımsız seçim rehberleri", () => {
    it.each(sectorCases)(
      "$name için doğru sektör profili ve ana yolu kullanır",
      ({
        context,
        categoryLabel,
        mainPath,
        proofFragment,
      }) => {
        const result = buildBlueprint({
          context,
          promptText:
            "Satın alma kararı verirken hangi ölçütlere bakılmalı?",
          intent: "buying_intent",
        });
        const sections = result.requiredSections.join(" ");

        expect(result.deliverable).toBe(
          `${categoryLabel} seçim rehberi`
        );
        expect(result.suggestedPath).toMatch(
          new RegExp(`^/${mainPath}/`)
        );
        expect(result.requiredSections).toHaveLength(5);
        expect(sections).toContain(proofFragment);
      }
    );
  });

  describe("sektör bağımsız yerel sayfalar", () => {
    it.each(sectorCases)(
      "$name için doğru yerel dizini kullanır",
      ({ context, categoryLabel, localPath }) => {
        const result = buildBlueprint({
          context,
          promptText:
            "Ankara'daki güvenilir seçenekler hangileridir?",
          intent: "local_recommendation",
        });

        expect(result.deliverable).toBe(
          `Yerel ${categoryLabel} sayfası`
        );
        expect(result.suggestedPath).toMatch(
          new RegExp(`^/${localPath}/ankara/`)
        );
        expect(result.requiredSections).toHaveLength(5);
      }
    );
  });

  describe("kullanıcı niyetleri", () => {
    it.each<
      [
        PromptIntent | null,
        string,
        string,
      ]
    >([
      [
        "buying_intent",
        "yazılım çözümü seçim rehberi",
        "/cozumler/",
      ],
      [
        "comparison",
        "yazılım çözümü karşılaştırma rehberi",
        "/karsilastirma/",
      ],
      [
        "local_recommendation",
        "Yerel yazılım çözümü sayfası",
        "/cozumler/",
      ],
      [
        "problem_solution",
        "Sorun çözme rehberi",
        "/rehber/",
      ],
      [
        "alternative_search",
        "yazılım çözümü seçim ve alternatifler rehberi",
        "/rehber/",
      ],
      [
        "budget_friendly",
        "Fiyat ve toplam değer rehberi",
        "/fiyatlar/",
      ],
      [
        "premium_choice",
        "Premium yazılım çözümü değerlendirme rehberi",
        "/rehber/",
      ],
      [
        "trust_reputation",
        "Güven ve doğrulama sayfası",
        "/hakkimizda/guven-ve-kalite",
      ],
      [
        null,
        "yazılım çözümü seçim ve alternatifler rehberi",
        "/rehber/",
      ],
    ])(
      "%s niyetinde doğru teslimatı ve yolu üretir",
      (intent, deliverable, pathPrefix) => {
        const result = buildBlueprint({
          intent,
          promptText:
            intent === "local_recommendation"
              ? "İzmir'deki CRM çözümleri hangileridir?"
              : "CRM çözümleri hakkında karar vermek istiyorum",
          strongestCompetitorName:
            intent === "comparison"
              ? "Rakip Çözüm"
              : null,
        });

        expect(result.deliverable).toBe(deliverable);
        expect(result.suggestedPath.startsWith(pathPrefix)).toBe(
          true
        );
        expect(result.requiredSections).toHaveLength(5);
        expect(
          result.requiredSections.every(
            (section) => section.trim().length > 0
          )
        ).toBe(true);
      }
    );
  });

  describe("karşılaştırma yolu ve rakip normalizasyonu", () => {
    it("marka ve rakip adındaki Türkçe karakterleri URL uyumlu yapar", () => {
      const result = buildBlueprint({
        brandName: "İş Çözüm A.Ş.",
        strongestCompetitorName: "Öncü Yazılım",
        intent: "comparison",
      });

      expect(result.suggestedPath).toBe(
        "/karsilastirma/is-cozum-a-s-oncu-yazilim"
      );
    });

    it("rakip verilmediğinde konu tabanlı karşılaştırma yolu üretir", () => {
      const result = buildBlueprint({
        intent: "comparison",
        promptText:
          "CRM ile ERP yazılımı arasındaki farklar nelerdir?",
      });

      expect(result.suggestedPath).toMatch(
        /^\/karsilastirma\/crm-erp-yazilimi/
      );
      expect(result.requiredSections.join(" ")).toContain(
        "alternatiflerin"
      );
    });

    it("boşluklardan oluşan rakip adını gerçek rakip gibi kullanmaz", () => {
      const result = buildBlueprint({
        intent: "comparison",
        strongestCompetitorName: "   ",
      });

      expect(result.suggestedPath).not.toMatch(/-$/);
      expect(result.requiredSections.join(" ")).toContain(
        "alternatiflerin"
      );
    });

    it("boş marka adında güvenli marka slugı kullanır", () => {
      const result = buildBlueprint({
        brandName: "   ",
        intent: "comparison",
        strongestCompetitorName: "Rakip",
      });

      expect(result.suggestedPath).toBe(
        "/karsilastirma/marka-rakip"
      );
    });

    it("rakip adı verilmiş karşılaştırmada rakibi kanıt bölümüne taşır", () => {
      const result = buildBlueprint({
        intent: "comparison",
        strongestCompetitorName: "Rakip CRM",
      });

      expect(result.requiredSections.join(" ")).toContain(
        "ASPEQO ile Rakip CRM"
      );
    });
  });

  describe("yerel yol ve konum sınırları", () => {
    it.each([
      ["Aydın", "aydin"],
      ["Çanakkale", "canakkale"],
      ["Diyarbakır", "diyarbakir"],
      ["Kahramanmaraş", "kahramanmaras"],
      ["Şanlıurfa", "sanliurfa"],
      ["Iğdır", "igdir"],
    ])(
      "%s şehrini doğru slug ile yerel yola taşır",
      (city, citySlug) => {
        const result = buildBlueprint({
          intent: "local_recommendation",
          promptText: `${city}'daki güvenilir CRM firmaları hangileridir?`,
        });

        expect(result.suggestedPath).toContain(
          `/cozumler/${citySlug}/`
        );
      }
    );

    it("şehir bulunmadığında açık bir yer tutucu kullanır", () => {
      const result = buildBlueprint({
        intent: "local_recommendation",
        promptText:
          "Yakınımdaki güvenilir CRM firmaları hangileridir?",
      });

      expect(result.suggestedPath).toContain(
        "/cozumler/{sehir-veya-ilce}/"
      );
    });

    it("şehir adını konu slugında ikinci kez tekrar etmez", () => {
      const result = buildBlueprint({
        intent: "local_recommendation",
        promptText:
          "Ankara'daki CRM danışmanlığı firmaları hangileridir?",
      });

      expect(result.suggestedPath).toMatch(
        /^\/cozumler\/ankara\/crm-danismanligi-firmalari/
      );
      expect(result.suggestedPath).not.toContain(
        "/ankara/ankara-"
      );
    });

    it("konum eki olmayan Dan gibi gerçek kelimeleri yanlışlıkla silmez", () => {
      const result = buildBlueprint({
        intent: "buying_intent",
        promptText:
          "Dan Brown kitapları arasından hangisi seçilmeli?",
      });

      expect(result.suggestedPath).toContain(
        "/cozumler/dan-brown-kitaplari"
      );
    });
  });

  describe("konu ve slug üretimi", () => {
    it("alternatif aramadaki marka başlangıcını konu slugından çıkarır", () => {
      const result = buildBlueprint({
        intent: "alternative_search",
        promptText:
          "Kraft Teknik dışında, Türkiye'de yüksek sıcaklık kalibrasyon cihazı firmaları hangileridir?",
      });

      expect(result.suggestedPath).not.toContain("kraft");
      expect(result.suggestedPath).not.toContain("teknik");
      expect(result.suggestedPath).toContain(
        "yuksek-sicaklik-kalibrasyon-cihazi-firmalari"
      );
    });

    it("soru işaretlerini ve noktalama işaretlerini URL'ye taşımaz", () => {
      const result = buildBlueprint({
        promptText:
          "CRM, ERP ve satış otomasyonu: hangisi uygun?!",
      });

      expect(result.suggestedPath).toMatch(
        /^\/cozumler\/[a-z0-9-]+$/
      );
    });

    it("konu çıkarılamadığında birincil tekliften slug üretir", () => {
      const result = buildBlueprint({
        context: {
          industry: "SaaS",
          primaryOffer: "Müşteri İlişkileri Yönetimi",
        },
        promptText: "Hangi çözüm uygun?",
      });

      expect(result.suggestedPath).toBe(
        "/cozumler/musteri-iliskileri-yonetimi"
      );
    });

    it("konu ve teklif boşsa karar rehberi geri dönüşünü kullanır", () => {
      const result = buildBlueprint({
        context: {},
        promptText: "Hangi çözüm uygun?",
      });

      expect(result.suggestedPath).toBe(
        "/cozumler/karar-rehberi"
      );
    });

    it("konu slugını yedi anlamlı sözcükle sınırlar", () => {
      const result = buildBlueprint({
        promptText:
          "Kurumsal ekiplerin müşteri verisi satış tahmini otomasyon entegrasyon güvenlik raporlama platformları",
      });
      const topicSlug = result.suggestedPath.replace(
        "/cozumler/",
        ""
      );

      expect(topicSlug.split("-")).toHaveLength(7);
    });
  });

  describe("hedef kitle ve içerik bölümleri", () => {
    it("hedef kitleyi satın alma rehberine taşır", () => {
      const result = buildBlueprint({
        context: {
          industry: "SaaS",
          primaryOffer: "CRM yazılımı",
          targetAudience: "10-50 kişilik satış ekipleri.",
        },
      });

      expect(result.requiredSections.join(" ")).toContain(
        "10-50 kişilik satış ekipleri için"
      );
    });

    it("hedef kitle sonundaki noktalama işaretlerini temizler", () => {
      const result = buildBlueprint({
        context: {
          industry: "SaaS",
          targetAudience: "KOBİ satış ekipleri?!",
        },
      });

      expect(result.requiredSections.join(" ")).toContain(
        "KOBİ satış ekipleri için"
      );
      expect(result.requiredSections.join(" ")).not.toContain(
        "ekipleri?! için"
      );
    });

    it("hedef kitle yoksa genel fakat uygulanabilir geri dönüş kullanır", () => {
      const result = buildBlueprint({
        context: {
          industry: "SaaS",
        },
      });

      expect(result.requiredSections.join(" ")).toContain(
        "Farklı ihtiyaçlara göre"
      );
    });

    it("bütçe niyetinde fiyat ve ek maliyet bölümlerini zorunlu tutar", () => {
      const result = buildBlueprint({
        intent: "budget_friendly",
      });
      const sections = result.requiredSections.join(" ");

      expect(sections).toContain("başlangıç fiyatları");
      expect(sections).toContain("ek ücretler");
      expect(sections).toContain("toplam maliyeti");
    });

    it("güven niyetinde doğrulanabilir kanıt ve politika ister", () => {
      const result = buildBlueprint({
        intent: "trust_reputation",
      });
      const sections = result.requiredSections.join(" ");

      expect(sections).toContain("güvenlik belgeleri");
      expect(sections).toContain("politikalarının");
      expect(sections).toContain("yanıltıcı");
    });

    it("sorun çözme niyetinde çözümün sınırlarını açıkça ister", () => {
      const result = buildBlueprint({
        intent: "problem_solution",
      });

      expect(result.requiredSections.join(" ")).toContain(
        "çözümün sınırları"
      );
    });

    it("premium niyetinde yüksek fiyatın gereksiz olduğu durumları da ister", () => {
      const result = buildBlueprint({
        intent: "premium_choice",
      });

      expect(result.requiredSections.join(" ")).toContain(
        "gereksiz olacağı"
      );
    });
  });

  describe("tespit edilen hizmet sinyalleri", () => {
    it("belirsiz şirket bilgisini sektörel anahtar kelimeyle doğru profile taşır", () => {
      const result = buildBlueprint({
        context: {
          industry: "Kurumsal çözümler",
        },
        detectedServiceKeywords: [
          "vibrasyon analizi",
          "yerinde balans",
        ],
      });

      expect(result.deliverable).toBe(
        "endüstriyel çözüm seçim rehberi"
      );
      expect(result.suggestedPath).toMatch(
        /^\/endustriyel-cozumler\//
      );
    });

    it("yalnızca genel sinyallerde yanlış sektör uydurmaz", () => {
      const result = buildBlueprint({
        context: {
          industry: "Kurumsal çözümler",
        },
        detectedServiceKeywords: [
          "hizmet",
          "ürün",
          "çözüm",
        ],
      });

      expect(result.deliverable).toBe(
        "ürün veya hizmet seçim rehberi"
      );
    });

    it("boş sinyal dizisinde mevcut şirket profilini korur", () => {
      const result = buildBlueprint({
        context: {
          industry: "Hastane",
        },
        detectedServiceKeywords: [],
      });

      expect(result.deliverable).toBe(
        "sağlık hizmeti seçim rehberi"
      );
    });
  });

  describe("dayanıklılık ve yan etkisizlik", () => {
    it("girdi bağlamını ve anahtar kelime dizisini değiştirmez", () => {
      const context: BrandStrategyContext = {
        industry: "SaaS",
        description: "Satış ekipleri için platform",
        targetAudience: "KOBİ'ler",
        primaryOffer: "CRM yazılımı",
      };
      const detectedServiceKeywords = [
        "entegrasyon",
        "otomasyon",
      ];
      const contextSnapshot = structuredClone(context);
      const keywordsSnapshot = structuredClone(
        detectedServiceKeywords
      );

      buildBlueprint({
        context,
        detectedServiceKeywords,
      });

      expect(context).toEqual(contextSnapshot);
      expect(detectedServiceKeywords).toEqual(
        keywordsSnapshot
      );
    });

    it.each([
      "buying_intent",
      "comparison",
      "local_recommendation",
      "problem_solution",
      "alternative_search",
      "budget_friendly",
      "premium_choice",
      "trust_reputation",
    ] satisfies PromptIntent[])(
      "%s sonucunda boş teslimat, yol veya bölüm üretmez",
      (intent) => {
        const result = buildBlueprint({
          intent,
          promptText:
            "Kurumsal ekipler için uygun çözüm hangisidir?",
          strongestCompetitorName:
            intent === "comparison" ? "Rakip" : null,
        });

        expect(result.deliverable.trim()).not.toBe("");
        expect(result.suggestedPath).toMatch(/^\//);
        expect(result.requiredSections).toHaveLength(5);
        expect(
          result.requiredSections.every(
            (section) => section.trim().length > 0
          )
        ).toBe(true);
      }
    );
  });
});