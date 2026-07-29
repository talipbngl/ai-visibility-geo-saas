import { describe, expect, it } from "vitest";

import {
  buildClientReportBriefs,
  type ClientReportRun,
} from "@/lib/reports/client-action-briefs";
import type { BrandStrategyContext } from "@/lib/strategy/business-archetypes";

function createRun(
  overrides: Partial<ClientReportRun> = {}
): ClientReportRun {
  return {
    id: "run-1",
    promptText:
      "KOBİ'ler için güvenilir CRM yazılımları hangileridir?",
    promptIntent: "alternative_search",
    promptPriority: 3,
    brandMentioned: false,
    brandRank: null,
    brandSentiment: null,
    rawAnswer:
      "Rakip A ve Rakip B, KOBİ satış ekipleri için öne çıkan çözümlerdir.",
    engine: "Gemini",
    model: "gemini-test",
    competitors: [],
    ...overrides,
  };
}

function buildBriefs({
  brandName = "ASPEQO",
  brandContext = {
    industry: "SaaS",
    primaryOffer: "CRM yazılımı",
    targetAudience: "KOBİ satış ekipleri",
  },
  runs = [],
  serviceSignalsValue = null,
  technicalSignalsValue = null,
}: {
  brandName?: string;
  brandContext?: BrandStrategyContext;
  runs?: ClientReportRun[];
  serviceSignalsValue?: unknown;
  technicalSignalsValue?: unknown;
} = {}) {
  return buildClientReportBriefs({
    brandName,
    brandContext,
    runs,
    serviceSignalsValue,
    technicalSignalsValue,
  });
}

function analyzedPage(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    url: "https://example.com/sayfa",
    title: "Örnek Sayfa",
    h1Count: 1,
    indexable: true,
    metaDescription: "Özgün açıklama",
    canonicalUrl: "https://example.com/sayfa",
    schemaTypes: ["WebPage"],
    ...overrides,
  };
}

describe("buildClientReportBriefs", () => {
  describe("boş ve ölçülemeyen girdiler", () => {
    it("hiç veri yoksa boş kanıt ve aksiyon listeleri döndürür", () => {
      expect(buildBriefs()).toEqual({
        evidenceItems: [],
        actionBriefs: [],
      });
    });

    it.each([
      null,
      undefined,
      "",
      0,
      false,
      {},
      { analyzedPages: null },
      { analyzedPages: "geçersiz" },
    ])(
      "ölçülemeyen teknik sinyalde sahte teknik aksiyon üretmez: %j",
      (technicalSignalsValue) => {
        expect(
          buildBriefs({ technicalSignalsValue }).actionBriefs
        ).toEqual([]);
      }
    );

    it.each([
      null,
      undefined,
      "",
      0,
      false,
      {},
      "geçersiz",
    ])(
      "ölçülemeyen hizmet sinyalinde hata vermez: %j",
      (serviceSignalsValue) => {
        const result = buildBriefs({
          runs: [createRun()],
          serviceSignalsValue,
        });

        expect(result.actionBriefs).toHaveLength(1);
        expect(result.actionBriefs[0]?.deliverable).toContain(
          "yazılım çözümü"
        );
      }
    );

    it("URL'si boş sayfayı teknik ölçüme dahil etmez", () => {
      const result = buildBriefs({
        technicalSignalsValue: {
          analyzedPages: [
            analyzedPage({
              url: "   ",
              indexable: false,
              h1Count: 0,
            }),
          ],
        },
      });

      expect(result.actionBriefs).toEqual([]);
    });
  });

  describe("kanıt seçimi ve sıralaması", () => {
    it("kanıt listesini en fazla dört kayıtla sınırlar", () => {
      const runs = Array.from({ length: 8 }, (_, index) =>
        createRun({
          id: `run-${index}`,
          promptText: `Karar sorusu ${index}?`,
          brandMentioned: index >= 4,
          brandRank: index >= 4 ? index : null,
        })
      );

      expect(buildBriefs({ runs }).evidenceItems).toHaveLength(4);
    });

    it("en fazla üç görünmeme kanıtı gösterir", () => {
      const runs = Array.from({ length: 5 }, (_, index) =>
        createRun({
          id: `missing-${index}`,
          promptText: `Eksik soru ${index}?`,
          brandMentioned: false,
          promptPriority: 5 - index,
        })
      );

      const evidence = buildBriefs({ runs }).evidenceItems;

      expect(evidence).toHaveLength(3);
      expect(
        evidence.every((item) => item.status === "missing")
      ).toBe(true);
    });

    it("üç görünmeme kanıtından sonra bir görünür kanıt ekler", () => {
      const runs = [
        createRun({ id: "missing-1", promptPriority: 5 }),
        createRun({ id: "missing-2", promptPriority: 4 }),
        createRun({ id: "missing-3", promptPriority: 3 }),
        createRun({
          id: "visible",
          brandMentioned: true,
          brandRank: 2,
        }),
      ];

      expect(
        buildBriefs({ runs }).evidenceItems.map((item) => item.id)
      ).toEqual([
        "missing-1",
        "missing-2",
        "missing-3",
        "visible",
      ]);
    });

    it("görünmeyen soruları yüksek öncelikten düşüğe sıralar", () => {
      const runs = [
        createRun({ id: "low", promptPriority: 1 }),
        createRun({ id: "high", promptPriority: 5 }),
        createRun({ id: "medium", promptPriority: 3 }),
      ];

      expect(
        buildBriefs({ runs }).evidenceItems.map((item) => item.id)
      ).toEqual(["high", "medium", "low"]);
    });

    it("eşit öncelikli görünmeme kayıtlarında giriş sırasını korur", () => {
      const runs = [
        createRun({ id: "first", promptPriority: 3 }),
        createRun({ id: "second", promptPriority: 3 }),
        createRun({ id: "third", promptPriority: 3 }),
      ];

      expect(
        buildBriefs({ runs }).evidenceItems.map((item) => item.id)
      ).toEqual(["first", "second", "third"]);
    });

    it("yalnızca görünür kayıtlar varsa en kötü geçerli sırayı önce gösterir", () => {
      const runs = [
        createRun({
          id: "rank-1",
          brandMentioned: true,
          brandRank: 1,
        }),
        createRun({
          id: "rank-7",
          brandMentioned: true,
          brandRank: 7,
        }),
        createRun({
          id: "rank-3",
          brandMentioned: true,
          brandRank: 3,
        }),
      ];

      expect(
        buildBriefs({ runs }).evidenceItems.map((item) => item.id)
      ).toEqual(["rank-7", "rank-3", "rank-1"]);
    });

    it("geçersiz görünürlük sırasını en kötü sıra gibi öne çıkarmaz", () => {
      const runs = [
        createRun({
          id: "invalid-rank",
          brandMentioned: true,
          brandRank: Number.NaN,
        }),
        createRun({
          id: "real-low-rank",
          brandMentioned: true,
          brandRank: 8,
        }),
      ];

      expect(
        buildBriefs({ runs }).evidenceItems.map((item) => item.id)
      ).toEqual(["real-low-rank", "invalid-rank"]);
    });

    it.each([null, 1, 2])(
      "%s sırasındaki marka kanıtını görünür olarak etiketler",
      (brandRank) => {
        const evidence = buildBriefs({
          runs: [
            createRun({
              brandMentioned: true,
              brandRank,
            }),
          ],
        }).evidenceItems[0];

        expect(evidence?.status).toBe("visible");
      }
    );

    it.each([3, 5, 20])(
      "%s sırasındaki marka kanıtını düşük sıra olarak etiketler",
      (brandRank) => {
        const evidence = buildBriefs({
          runs: [
            createRun({
              brandMentioned: true,
              brandRank,
            }),
          ],
        }).evidenceItems[0];

        expect(evidence?.status).toBe("low_rank");
      }
    );

    it.each([
      0,
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ])(
      "geçersiz %s sırasını düşük sıra olarak etiketlemez",
      (brandRank) => {
        const evidence = buildBriefs({
          runs: [
            createRun({
              brandMentioned: true,
              brandRank,
            }),
          ],
        }).evidenceItems[0];

        expect(evidence?.status).toBe("visible");
        expect(evidence?.brandRank).toBeNull();
      }
    );
  });

  describe("rakip kanıtlarının normalizasyonu", () => {
    it("yalnızca gerçekten görünen rakipleri kanıta ekler", () => {
      const evidence = buildBriefs({
        runs: [
          createRun({
            competitors: [
              { name: "Rakip A", mentioned: true, rank: 2 },
              { name: "Rakip B", mentioned: false, rank: 1 },
            ],
          }),
        ],
      }).evidenceItems[0];

      expect(evidence?.mentionedCompetitors).toEqual(["Rakip A"]);
    });

    it("rakipleri geçerli sıralarına göre önden arkaya dizer", () => {
      const evidence = buildBriefs({
        runs: [
          createRun({
            competitors: [
              { name: "Üçüncü", mentioned: true, rank: 3 },
              { name: "Birinci", mentioned: true, rank: 1 },
              { name: "İkinci", mentioned: true, rank: 2 },
            ],
          }),
        ],
      }).evidenceItems[0];

      expect(evidence?.mentionedCompetitors).toEqual([
        "Birinci",
        "İkinci",
        "Üçüncü",
      ]);
    });

    it("aynı rakibin harf ve boşluk varyasyonlarını bir kez gösterir", () => {
      const evidence = buildBriefs({
        runs: [
          createRun({
            competitors: [
              {
                name: "Penta Otomasyon",
                mentioned: true,
                rank: 4,
              },
              {
                name: "  PENTA   OTOMASYON  ",
                mentioned: true,
                rank: 2,
              },
            ],
          }),
        ],
      }).evidenceItems[0];

      expect(evidence?.mentionedCompetitors).toEqual([
        "Penta Otomasyon",
      ]);
    });

    it("mükerrer rakipte en iyi geçerli sırayı kullanır", () => {
      const evidence = buildBriefs({
        runs: [
          createRun({
            competitors: [
              { name: "Rakip A", mentioned: true, rank: 8 },
              { name: "Rakip B", mentioned: true, rank: 3 },
              { name: "rakip a", mentioned: true, rank: 1 },
            ],
          }),
        ],
      }).evidenceItems[0];

      expect(evidence?.mentionedCompetitors).toEqual([
        "Rakip A",
        "Rakip B",
      ]);
    });

    it.each(["", "   ", "\n\t"])(
      "adı boş rakibi kanıta eklemez: %j",
      (name) => {
        const evidence = buildBriefs({
          runs: [
            createRun({
              competitors: [
                { name, mentioned: true, rank: 1 },
              ],
            }),
          ],
        }).evidenceItems[0];

        expect(evidence?.mentionedCompetitors).toEqual([]);
      }
    );

    it.each([
      0,
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ])(
      "geçersiz %s rakip sırasını öne geçirmez",
      (rank) => {
        const evidence = buildBriefs({
          runs: [
            createRun({
              competitors: [
                {
                  name: "Geçersiz Sıra",
                  mentioned: true,
                  rank,
                },
                {
                  name: "Geçerli Sıra",
                  mentioned: true,
                  rank: 2,
                },
              ],
            }),
          ],
        }).evidenceItems[0];

        expect(evidence?.mentionedCompetitors).toEqual([
          "Geçerli Sıra",
          "Geçersiz Sıra",
        ]);
      }
    );
  });

  describe("cevap kesiti ve motor etiketi", () => {
    it.each(["", "   ", "\n\t"])(
      "boş AI cevabında açık geri dönüş metni kullanır: %j",
      (rawAnswer) => {
        const evidence = buildBriefs({
          runs: [createRun({ rawAnswer })],
        }).evidenceItems[0];

        expect(evidence?.answerExcerpt).toBe(
          "AI cevabı kaydedilmedi."
        );
      }
    );

    it("cevaptaki tekrarlı boşlukları ve satır sonlarını temizler", () => {
      const evidence = buildBriefs({
        runs: [
          createRun({
            rawAnswer:
              "İlk   bölüm.\n\nRakip A\töne çıkan çözümdür.",
            competitors: [
              { name: "Rakip A", mentioned: true, rank: 1 },
            ],
          }),
        ],
      }).evidenceItems[0];

      expect(evidence?.answerExcerpt).toBe(
        "İlk bölüm. Rakip A öne çıkan çözümdür."
      );
    });

    it("uzun cevapta marka veya rakip geçen bölgenin çevresini seçer", () => {
      const prefix = "Genel açıklama ".repeat(30);
      const suffix = " Sonraki açıklama".repeat(30);
      const evidence = buildBriefs({
        brandName: "ASPEQO",
        runs: [
          createRun({
            rawAnswer: `${prefix}ASPEQO karar listesinde yer alır.${suffix}`,
            brandMentioned: true,
            brandRank: 2,
          }),
        ],
      }).evidenceItems[0];

      expect(evidence?.answerExcerpt).toContain("ASPEQO");
      expect(evidence?.answerExcerpt.startsWith("…")).toBe(true);
      expect(evidence?.answerExcerpt.endsWith("…")).toBe(true);
      expect(evidence?.answerExcerpt.length).toBeLessThanOrEqual(
        242
      );
    });

    it("kesiti mümkün olduğunda sözcüğün ortasından bölmez", () => {
      const evidence = buildBriefs({
        runs: [
          createRun({
            rawAnswer:
              "uzunkelimelerdenolusansinirmetni ".repeat(20),
          }),
        ],
      }).evidenceItems[0];

      expect(evidence?.answerExcerpt).toMatch(
        /uzunkelimelerdenolusansinirmetni…$/u
      );
    });

    it("cümle sonu yeterince ilerideyse kesiti doğal cümlede bitirir", () => {
      const firstSentence =
        "Bu karar için ayrıntılı ve doğrulanabilir bilgiler gerekir. ";
      const evidence = buildBriefs({
        runs: [
          createRun({
            rawAnswer:
              firstSentence.repeat(5) +
              "Bu bölüm daha sonra devam eder.",
          }),
        ],
      }).evidenceItems[0];

      expect(evidence?.answerExcerpt).toMatch(/[.!?]…$/u);
    });

    it("motor ve model adını birlikte gösterir", () => {
      const evidence = buildBriefs({
        runs: [
          createRun({
            engine: "Gemini",
            model: "gemini-3.1-flash-lite",
          }),
        ],
      }).evidenceItems[0];

      expect(evidence?.engineLabel).toBe(
        "Gemini · gemini-3.1-flash-lite"
      );
    });

    it("motor ve model dış boşluklarını temizler", () => {
      const evidence = buildBriefs({
        runs: [
          createRun({
            engine: "  Gemini  ",
            model: "  model-x  ",
          }),
        ],
      }).evidenceItems[0];

      expect(evidence?.engineLabel).toBe("Gemini · model-x");
    });

    it.each([null, "", "   "])(
      "motor boşsa Gemini geri dönüşünü kullanır: %j",
      (engine) => {
        const evidence = buildBriefs({
          runs: [
            createRun({
              engine,
              model: null,
            }),
          ],
        }).evidenceItems[0];

        expect(evidence?.engineLabel).toBe("Gemini");
      }
    );

    it("motor boşken model varsa güvenli motor adıyla modeli gösterir", () => {
      const evidence = buildBriefs({
        runs: [
          createRun({
            engine: null,
            model: "model-x",
          }),
        ],
      }).evidenceItems[0];

      expect(evidence?.engineLabel).toBe("Gemini · model-x");
    });
  });

  describe("soru niyeti ve prompt aksiyonları", () => {
    it("kayıtlı geçerli soru niyetini kanıtta korur", () => {
      const evidence = buildBriefs({
        runs: [
          createRun({
            promptIntent: "comparison",
          }),
        ],
      }).evidenceItems[0];

      expect(evidence?.promptIntent).toBe("comparison");
    });

    it("Türkçe niyet etiketini iç niyet değerine dönüştürür", () => {
      const evidence = buildBriefs({
        runs: [
          createRun({
            promptIntent: "Satın Alma Niyeti",
          }),
        ],
      }).evidenceItems[0];

      expect(evidence?.promptIntent).toBe("buying_intent");
    });

    it("kayıtlı niyet yoksa soru metninden niyet çıkarır", () => {
      const evidence = buildBriefs({
        runs: [
          createRun({
            promptText:
              "CRM A ile CRM B arasındaki farklar nelerdir?",
            promptIntent: null,
          }),
        ],
      }).evidenceItems[0];

      expect(evidence?.promptIntent).toBe("comparison");
    });

    it("en fazla iki görünmeme prompt aksiyonu üretir", () => {
      const runs = Array.from({ length: 5 }, (_, index) =>
        createRun({
          id: `missing-${index}`,
          promptText: `Eksik karar sorusu ${index}?`,
          promptPriority: 5 - index,
        })
      );

      expect(buildBriefs({ runs }).actionBriefs).toHaveLength(2);
    });

    it("prompt aksiyonlarını yüksek öncelikten başlayarak üretir", () => {
      const runs = [
        createRun({
          id: "low",
          promptText: "Düşük öncelikli soru?",
          promptPriority: 1,
        }),
        createRun({
          id: "high",
          promptText: "Yüksek öncelikli soru?",
          promptPriority: 5,
        }),
      ];

      expect(
        buildBriefs({ runs }).actionBriefs.map(
          (action) => action.id
        )
      ).toEqual(["prompt-high", "prompt-low"]);
    });

    it("görünmeme yoksa en kötü geçerli sıradaki tek soruyu güçlendirir", () => {
      const runs = [
        createRun({
          id: "rank-3",
          brandMentioned: true,
          brandRank: 3,
        }),
        createRun({
          id: "rank-9",
          brandMentioned: true,
          brandRank: 9,
        }),
      ];

      expect(
        buildBriefs({ runs }).actionBriefs.map(
          (action) => action.id
        )
      ).toEqual(["prompt-rank-9"]);
    });

    it.each([
      0,
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ])(
      "geçersiz %s sıra için düşük sıra aksiyonu üretmez",
      (brandRank) => {
        const result = buildBriefs({
          runs: [
            createRun({
              brandMentioned: true,
              brandRank,
            }),
          ],
        });

        expect(result.actionBriefs).toEqual([]);
      }
    );

    it.each([null, 1, 2])(
      "%s sırasındaki görünür marka için gereksiz prompt aksiyonu üretmez",
      (brandRank) => {
        const result = buildBriefs({
          runs: [
            createRun({
              brandMentioned: true,
              brandRank,
            }),
          ],
        });

        expect(result.actionBriefs).toEqual([]);
      }
    );

    it("görünmeyen soruda rakip varsa nedeni rakip adlarıyla açıklar", () => {
      const action = buildBriefs({
        runs: [
          createRun({
            competitors: [
              { name: "Rakip A", mentioned: true, rank: 1 },
              { name: "Rakip B", mentioned: true, rank: 2 },
            ],
          }),
        ],
      }).actionBriefs[0];

      expect(action?.reason).toContain("Rakip A, Rakip B");
    });

    it("görünmeyen soruda rakip yoksa kanıtsız rakip iddiası üretmez", () => {
      const action = buildBriefs({
        runs: [createRun({ competitors: [] })],
      }).actionBriefs[0];

      expect(action?.reason).toContain(
        "ASPEQO bu sorunun cevabında görünmedi"
      );
      expect(action?.reason).not.toContain(
        "görünür durumda"
      );
    });

    it("mükerrer ve boş rakip adlarını aksiyon nedenine taşımaz", () => {
      const action = buildBriefs({
        runs: [
          createRun({
            competitors: [
              { name: "Rakip A", mentioned: true, rank: 3 },
              { name: " rakip a ", mentioned: true, rank: 1 },
              { name: "   ", mentioned: true, rank: 2 },
            ],
          }),
        ],
      }).actionBriefs[0];

      expect(action?.reason.match(/Rakip A/gu)).toHaveLength(1);
      expect(action?.reason).not.toContain(",  ");
    });

    it("aksiyonda önce mevcut ilgili sayfanın kontrol edilmesini ister", () => {
      const action = buildBriefs({
        runs: [createRun()],
      }).actionBriefs[0];

      expect(action?.requiredSections[0]).toContain(
        "Önce aynı konuya hizmet eden mevcut"
      );
    });

    it("görünmeme aksiyonunun başarı metriğinde yeniden görünmeyi ister", () => {
      const action = buildBriefs({
        runs: [createRun()],
      }).actionBriefs[0];

      expect(action?.successMetric).toContain(
        "ASPEQO adının cevapta görünmesi"
      );
      expect(action?.successMetric).not.toContain(
        "ilk iki öneri"
      );
    });

    it("düşük sıra aksiyonunda ilk iki öneriye yükselmeyi ister", () => {
      const action = buildBriefs({
        runs: [
          createRun({
            brandMentioned: true,
            brandRank: 5,
          }),
        ],
      }).actionBriefs[0];

      expect(action?.successMetric).toContain(
        "ilk iki öneri arasına yükselmesi"
      );
    });
  });

  describe("teknik website aksiyonları", () => {
    it("indekslenemeyen sayfayı en yüksek teknik öncelik yapar", () => {
      const action = buildBriefs({
        technicalSignalsValue: {
          analyzedPages: [
            analyzedPage({
              indexable: false,
              h1Count: 0,
              metaDescription: null,
              canonicalUrl: null,
              schemaTypes: [],
            }),
          ],
        },
      }).actionBriefs[0];

      expect(action?.id).toMatch(/^website-index-/);
      expect(action?.priority).toBe("Yüksek");
      expect(action?.week).toBe(1);
    });

    it("birden fazla teknik sorun varsa indeksleme sorununu önce seçer", () => {
      const action = buildBriefs({
        technicalSignalsValue: {
          analyzedPages: [
            analyzedPage({
              url: "https://example.com/h1",
              h1Count: 0,
            }),
            analyzedPage({
              url: "https://example.com/noindex",
              indexable: false,
            }),
          ],
        },
      }).actionBriefs[0];

      expect(action?.id).toBe(
        "website-index-https://example.com/noindex"
      );
    });

    it.each([0, 2, 3, 8])(
      "%s H1 bulunan sayfa için başlık aksiyonu üretir",
      (h1Count) => {
        const action = buildBriefs({
          technicalSignalsValue: {
            analyzedPages: [
              analyzedPage({ h1Count }),
            ],
          },
        }).actionBriefs[0];

        expect(action?.id).toBe(
          "website-heading-structure"
        );
        expect(action?.title).toContain("H1 yapısını düzelt");
      }
    );

    it.each([
      null,
      undefined,
      "",
      "   ",
      false,
      true,
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      {},
    ])(
      "geçersiz H1 değeriyle sahte başlık aksiyonu üretmez: %j",
      (h1Count) => {
        const page = analyzedPage();

        if (h1Count === undefined) {
          delete page.h1Count;
        } else {
          page.h1Count = h1Count;
        }

        const result = buildBriefs({
          technicalSignalsValue: {
            analyzedPages: [page],
          },
        });

        expect(result.actionBriefs).toEqual([]);
      }
    );

    it("sayısal metin H1 değerini geriye uyumlu biçimde kabul eder", () => {
      const action = buildBriefs({
        technicalSignalsValue: {
          analyzedPages: [
            analyzedPage({ h1Count: "0" }),
          ],
        },
      }).actionBriefs[0];

      expect(action?.id).toBe(
        "website-heading-structure"
      );
    });

    it("birden fazla H1 sorununu tek toplu aksiyonda sayar", () => {
      const action = buildBriefs({
        technicalSignalsValue: {
          analyzedPages: [
            analyzedPage({
              url: "https://example.com/a",
              title: "A",
              h1Count: 0,
            }),
            analyzedPage({
              url: "https://example.com/b",
              title: "B",
              h1Count: 2,
            }),
            analyzedPage({
              url: "https://example.com/c",
              title: "C",
              h1Count: 1,
            }),
          ],
        },
      }).actionBriefs[0];

      expect(action?.title).toContain(
        "2/3 taranan sayfada"
      );
      expect(action?.reason).toContain("A (0 H1)");
      expect(action?.reason).toContain("B (2 H1)");
    });

    it("meta açıklaması alanı ölçülmüş ve boşsa meta aksiyonu üretir", () => {
      const action = buildBriefs({
        technicalSignalsValue: {
          analyzedPages: [
            analyzedPage({ metaDescription: null }),
          ],
        },
      }).actionBriefs[0];

      expect(action?.id).toMatch(/^website-meta-/);
      expect(action?.priority).toBe("Orta");
    });

    it("meta açıklaması hiç ölçülmemişse eksik diye işaretlemez", () => {
      const page = analyzedPage();
      delete page.metaDescription;

      expect(
        buildBriefs({
          technicalSignalsValue: {
            analyzedPages: [page],
          },
        }).actionBriefs
      ).toEqual([]);
    });

    it("canonical alanı ölçülmüş ve boşsa toplu canonical aksiyonu üretir", () => {
      const action = buildBriefs({
        technicalSignalsValue: {
          analyzedPages: [
            analyzedPage({ canonicalUrl: null }),
          ],
        },
      }).actionBriefs[0];

      expect(action?.id).toBe(
        "website-canonical-coverage"
      );
      expect(action?.deliverable).toContain(
        "1 sayfada canonical"
      );
    });

    it("canonical hiç ölçülmemişse eksik diye işaretlemez", () => {
      const page = analyzedPage();
      delete page.canonicalUrl;

      expect(
        buildBriefs({
          technicalSignalsValue: {
            analyzedPages: [page],
          },
        }).actionBriefs
      ).toEqual([]);
    });

    it("çok sayıdaki canonical sorununu özette dört sayfa ve kalan sayı ile sınırlar", () => {
      const pages = Array.from({ length: 7 }, (_, index) =>
        analyzedPage({
          url: `https://example.com/${index}`,
          title: `Sayfa ${index}`,
          canonicalUrl: null,
        })
      );
      const action = buildBriefs({
        technicalSignalsValue: {
          analyzedPages: pages,
        },
      }).actionBriefs[0];

      expect(action?.title).toContain("7/7");
      expect(action?.reason).toContain("ve 3 sayfa daha");
      expect(action?.reason).not.toContain("Sayfa 4");
    });

    it("schema alanı ölçülmüş ve boşsa schema aksiyonu üretir", () => {
      const action = buildBriefs({
        technicalSignalsValue: {
          analyzedPages: [
            analyzedPage({ schemaTypes: [] }),
          ],
        },
      }).actionBriefs[0];

      expect(action?.id).toMatch(/^website-schema-/);
      expect(action?.deliverable).toBe(
        "JSON-LD yapısal veri"
      );
    });

    it("schema hiç ölçülmemişse eksik diye işaretlemez", () => {
      const page = analyzedPage();
      delete page.schemaTypes;

      expect(
        buildBriefs({
          technicalSignalsValue: {
            analyzedPages: [page],
          },
        }).actionBriefs
      ).toEqual([]);
    });

    it("boşluklardan oluşan schema türlerini geçerli saymaz", () => {
      const action = buildBriefs({
        technicalSignalsValue: {
          analyzedPages: [
            analyzedPage({
              schemaTypes: ["   ", "\n"],
            }),
          ],
        },
      }).actionBriefs[0];

      expect(action?.id).toMatch(/^website-schema-/);
    });

    it("sayfa başlığı boşsa URL'yi güvenli başlık olarak kullanır", () => {
      const action = buildBriefs({
        technicalSignalsValue: {
          analyzedPages: [
            analyzedPage({
              title: "   ",
              h1Count: 0,
            }),
          ],
        },
      }).actionBriefs[0];

      expect(action?.reason).toContain(
        "https://example.com/sayfa (0 H1)"
      );
    });

    it("teknik öncelik sırasını indeks, H1, meta, canonical ve schema olarak uygular", () => {
      const base = analyzedPage({
        indexable: false,
        h1Count: 0,
        metaDescription: null,
        canonicalUrl: null,
        schemaTypes: [],
      });

      const expectedIds = [
        "website-index-https://example.com/sayfa",
        "website-heading-structure",
        "website-meta-https://example.com/sayfa",
        "website-canonical-coverage",
        "website-schema-https://example.com/sayfa",
      ];

      const variants = [
        base,
        { ...base, indexable: true },
        { ...base, indexable: true, h1Count: 1 },
        {
          ...base,
          indexable: true,
          h1Count: 1,
          metaDescription: "Açıklama",
        },
        {
          ...base,
          indexable: true,
          h1Count: 1,
          metaDescription: "Açıklama",
          canonicalUrl: "https://example.com/sayfa",
        },
      ];

      variants.forEach((page, index) => {
        const action = buildBriefs({
          technicalSignalsValue: {
            analyzedPages: [page],
          },
        }).actionBriefs[0];

        expect(action?.id).toBe(expectedIds[index]);
      });
    });
  });

  describe("hizmet sinyalleri ve sektör bağımsızlığı", () => {
    it("sektörel sinyal varsa genel hizmet kelimeleri yerine sektörel sinyali kullanır", () => {
      const action = buildBriefs({
        brandContext: {
          industry: "Kurumsal çözümler",
        },
        runs: [createRun()],
        serviceSignalsValue: [
          { keyword: "hizmet", found: true, count: 12 },
          { keyword: "ürün", found: true, count: 8 },
          {
            keyword: "vibrasyon analizi",
            found: true,
            count: 4,
          },
        ],
      }).actionBriefs[0];

      expect(action?.deliverable).toContain(
        "endüstriyel çözüm"
      );
    });

    it("count pozitifse found false olsa bile gerçek sinyal kabul eder", () => {
      const action = buildBriefs({
        brandContext: {
          industry: "Kurumsal çözümler",
        },
        runs: [createRun()],
        serviceSignalsValue: [
          {
            keyword: "vibrasyon analizi",
            found: false,
            count: 3,
          },
        ],
      }).actionBriefs[0];

      expect(action?.deliverable).toContain(
        "endüstriyel çözüm"
      );
    });

    it("bulunmayan ve sayımı sıfır sinyali kullanmaz", () => {
      const action = buildBriefs({
        brandContext: {
          industry: "Kurumsal çözümler",
        },
        runs: [createRun()],
        serviceSignalsValue: [
          {
            keyword: "vibrasyon analizi",
            found: false,
            count: 0,
          },
        ],
      }).actionBriefs[0];

      expect(action?.deliverable).toContain(
        "ürün veya hizmet"
      );
    });

    it.each([
      "HİZMET",
      " ürün ",
      "ÇÖZÜM",
      "PAKET",
      "FİYAT",
      "KAMPANYA",
      "RANDEVU",
      "ONLİNE",
      "DESTEK",
      "BAŞVURU",
      "İLETİŞİM",
    ])(
      "genel %s sinyalini sektör kanıtı gibi kullanmaz",
      (keyword) => {
        const action = buildBriefs({
          brandContext: {
            industry: "Kurumsal çözümler",
          },
          runs: [createRun()],
          serviceSignalsValue: [
            { keyword, found: true, count: 1 },
          ],
        }).actionBriefs[0];

        expect(action?.deliverable).toContain(
          "ürün veya hizmet"
        );
      }
    );

    it.each([
      {
        name: "e-ticaret",
        context: { industry: "E-ticaret" },
        expected: "ürün seçim",
      },
      {
        name: "sağlık",
        context: { industry: "Hastane" },
        expected: "sağlık hizmeti seçim",
      },
      {
        name: "lojistik",
        context: { industry: "Lojistik" },
        expected: "lojistik hizmeti seçim",
      },
      {
        name: "eğitim",
        context: { industry: "Üniversite" },
        expected: "eğitim programı seçim",
      },
      {
        name: "konaklama",
        context: { industry: "Otel ve konaklama" },
        expected: "konaklama veya deneyim seçim",
      },
      {
        name: "finans",
        context: { industry: "Bankacılık" },
        expected: "finansal ürün veya sigorta seçim",
      },
    ])(
      "$name sektöründe doğru aksiyon türünü korur",
      ({ context, expected }) => {
        const action = buildBriefs({
          brandContext: context,
          runs: [
            createRun({
              promptIntent: "buying_intent",
            }),
          ],
        }).actionBriefs[0];

        expect(action?.deliverable).toContain(expected);
      }
    );
  });

  describe("aksiyon sınırları ve yan etkisizlik", () => {
    it("iki prompt ve bir website aksiyonunu üç haftaya sıralar", () => {
      const result = buildBriefs({
        runs: [
          createRun({
            id: "first",
            promptPriority: 5,
          }),
          createRun({
            id: "second",
            promptPriority: 4,
          }),
        ],
        technicalSignalsValue: {
          analyzedPages: [
            analyzedPage({ h1Count: 0 }),
          ],
        },
      });

      expect(result.actionBriefs).toHaveLength(3);
      expect(
        result.actionBriefs.map((action) => action.week)
      ).toEqual([1, 2, 3]);
      expect(
        result.actionBriefs.map((action) => action.id)
      ).toEqual([
        "prompt-first",
        "prompt-second",
        "website-heading-structure",
      ]);
    });

    it("aksiyon listesini her durumda en fazla üç kayıtla sınırlar", () => {
      const runs = Array.from({ length: 10 }, (_, index) =>
        createRun({
          id: `run-${index}`,
          promptText: `Karar sorusu ${index}?`,
          promptPriority: 10 - index,
        })
      );

      expect(
        buildBriefs({
          runs,
          technicalSignalsValue: {
            analyzedPages: [
              analyzedPage({ indexable: false }),
            ],
          },
        }).actionBriefs
      ).toHaveLength(3);
    });

    it("teknik sorun yoksa yalnızca prompt aksiyonlarını döndürür", () => {
      const result = buildBriefs({
        runs: [createRun()],
        technicalSignalsValue: {
          analyzedPages: [analyzedPage()],
        },
      });

      expect(result.actionBriefs).toHaveLength(1);
      expect(result.actionBriefs[0]?.id).toBe("prompt-run-1");
    });

    it("prompt açığı yoksa yalnızca teknik aksiyonu döndürür", () => {
      const result = buildBriefs({
        runs: [
          createRun({
            brandMentioned: true,
            brandRank: 1,
          }),
        ],
        technicalSignalsValue: {
          analyzedPages: [
            analyzedPage({ h1Count: 0 }),
          ],
        },
      });

      expect(result.actionBriefs).toHaveLength(1);
      expect(result.actionBriefs[0]?.id).toBe(
        "website-heading-structure"
      );
      expect(result.actionBriefs[0]?.week).toBe(1);
    });

    it("girdi koşularını, rakipleri ve sinyal nesnelerini değiştirmez", () => {
      const runs = [
        createRun({
          competitors: [
            { name: "Rakip B", mentioned: true, rank: 2 },
            { name: "Rakip A", mentioned: true, rank: 1 },
          ],
        }),
      ];
      const serviceSignalsValue = [
        {
          keyword: "vibrasyon analizi",
          found: true,
          count: 2,
        },
      ];
      const technicalSignalsValue = {
        analyzedPages: [
          analyzedPage({ h1Count: 0 }),
        ],
      };
      const snapshot = structuredClone({
        runs,
        serviceSignalsValue,
        technicalSignalsValue,
      });

      buildBriefs({
        runs,
        serviceSignalsValue,
        technicalSignalsValue,
      });

      expect({
        runs,
        serviceSignalsValue,
        technicalSignalsValue,
      }).toEqual(snapshot);
    });

    it("bin koşuda kanıt ve aksiyon sınırlarını korur", () => {
      const runs = Array.from({ length: 1_000 }, (_, index) =>
        createRun({
          id: `run-${index}`,
          promptText: `Sektör bağımsız karar sorusu ${index}?`,
          promptPriority: index % 5,
          brandMentioned: index % 3 === 0,
          brandRank: index % 3 === 0 ? (index % 10) + 1 : null,
        })
      );

      const result = buildBriefs({ runs });

      expect(result.evidenceItems.length).toBeLessThanOrEqual(4);
      expect(result.actionBriefs.length).toBeLessThanOrEqual(3);
    });
  });
});