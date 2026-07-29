import { describe, expect, it } from "vitest";

import {
  buildEvidenceBasedRecommendations,
  type EvidenceRecommendation,
} from "@/lib/recommendations/evidence-based-recommendations";

type BuildInput = Parameters<
  typeof buildEvidenceBasedRecommendations
>[0];
type AnalysisInput = BuildInput["analyses"][number];
type BrandSnapshot = NonNullable<
  BuildInput["brandWebsiteSnapshot"]
>;
type CompetitorSnapshot =
  BuildInput["competitorWebsiteSnapshots"][number];

const titles = {
  websiteMissing: "Marka website analizini tamamla",
  websiteWeak: "Ana sayfa içerik sinyallerini güçlendir",
  competitorScore: "Rakip website sinyal farkını kapat",
  contentGap: "Rakiplerde bulunan içerik boşluklarını kapat",
  competitorService:
    "Rakiplerde bulunan hizmet sinyallerini içerikte güçlendir",
  competitorTrust:
    "Güven sinyallerini rakip seviyesine yaklaştır",
  missingService:
    "Görünmediğin hizmet niyetleri için içerik üret",
  missingTrust: "Marka güven anlatımını güçlendir",
  invisibleGeneric:
    "Markanın görünmediği sorulara özel içerik oluştur",
  strongestCompetitor:
    "En güçlü rakibe karşı karşılaştırma içeriği hazırla",
  averageRank:
    "İlk öneri konumuna çıkmak için kategori otoritesini artır",
  measurement: "Düzenli AI görünürlük takibi yap",
} as const;

function score(
  overrides: Partial<NonNullable<BuildInput["score"]>> = {}
): NonNullable<BuildInput["score"]> {
  return {
    visibility_score: 80,
    share_of_voice: 70,
    average_rank: 1,
    positive_sentiment_rate: 90,
    opportunity_score: 20,
    ...overrides,
  };
}

function brandSnapshot(
  overrides: Partial<BrandSnapshot> = {}
): BrandSnapshot {
  return {
    content_score: 80,
    service_signals_json: [],
    trust_signals_json: [],
    technical_signals_json: {
      contentTypesFound: [
        "service",
        "about",
        "contact",
        "faq",
        "guide",
        "comparison",
        "pricing",
      ],
    },
    ...overrides,
  };
}

function competitorSnapshot(
  overrides: Partial<CompetitorSnapshot> = {}
): CompetitorSnapshot {
  return {
    competitor_name: "Rakip A",
    content_score: 80,
    service_signals_json: [],
    trust_signals_json: [],
    technical_signals_json: {
      contentTypesFound: [
        "service",
        "about",
        "contact",
        "faq",
        "guide",
        "comparison",
        "pricing",
      ],
    },
    ...overrides,
  };
}

function analysis(
  overrides: Partial<AnalysisInput> = {}
): AnalysisInput {
  return {
    brand_mentioned: true,
    brand_rank: 1,
    brand_sentiment: "positive",
    competitors_json: [],
    summary: "Ölçüm özeti",
    audit_runs: {
      prompt_text_snapshot: "Karar sorusu?",
      prompt_intent_snapshot: "buying_intent",
    },
    ...overrides,
  };
}

function buildRecommendations(
  overrides: Partial<BuildInput> = {}
) {
  return buildEvidenceBasedRecommendations({
    brandName: "ASPEQO",
    score: score(),
    analyses: [],
    brandWebsiteSnapshot: brandSnapshot(),
    competitorWebsiteSnapshots: [],
    ...overrides,
  });
}

function findRecommendation(
  recommendations: EvidenceRecommendation[],
  title: string
) {
  return recommendations.find(
    (recommendation) => recommendation.title === title
  );
}

function recommendationTitles(
  recommendations: EvidenceRecommendation[]
) {
  return recommendations.map(
    (recommendation) => recommendation.title
  );
}

describe("buildEvidenceBasedRecommendations", () => {
  describe("temel çıktı sözleşmesi", () => {
    it("kritik açık yoksa yalnızca düzenli ölçüm önerisi döndürür", () => {
      const recommendations = buildRecommendations();

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0]).toEqual({
        category: "measurement",
        title: titles.measurement,
        description: expect.stringContaining("haftalık veya aylık"),
        priority: "low",
        effort: "low",
        impact: "medium",
        status: "open",
      });
    });

    it("bütün öneriler eksiksiz sözleşmeye uyar", () => {
      const recommendations = buildRecommendations({
        score: score({
          visibility_score: 20,
          average_rank: 5,
          positive_sentiment_rate: 20,
        }),
        analyses: [
          analysis({
            brand_mentioned: false,
            competitors_json: [
              { name: "Rakip A", mentioned: true, rank: 1 },
            ],
          }),
        ],
        brandWebsiteSnapshot: brandSnapshot({
          content_score: 30,
          service_signals_json: [
            { keyword: "fiyat", found: false, count: 0 },
          ],
          trust_signals_json: [
            { keyword: "referans", found: false, count: 0 },
          ],
        }),
        competitorWebsiteSnapshots: [
          competitorSnapshot({ content_score: 80 }),
        ],
      });

      for (const recommendation of recommendations) {
        expect(recommendation).toEqual({
          category: expect.any(String),
          title: expect.any(String),
          description: expect.any(String),
          priority: expect.stringMatching(/^(low|medium|high)$/u),
          effort: expect.stringMatching(/^(low|medium|high)$/u),
          impact: expect.stringMatching(/^(low|medium|high)$/u),
          status: "open",
        });
        expect(recommendation.title.trim()).not.toBe("");
        expect(recommendation.description.length).toBeGreaterThan(40);
      }
    });

    it("öneri başlıklarını mükerrer üretmez", () => {
      const recommendations = buildRecommendations({
        score: score({
          visibility_score: 10,
          average_rank: 8,
          positive_sentiment_rate: 10,
        }),
        analyses: Array.from({ length: 20 }, () =>
          analysis({ brand_mentioned: false })
        ),
        brandWebsiteSnapshot: brandSnapshot({
          content_score: 10,
          service_signals_json: [
            { keyword: "fiyat", found: false, count: 0 },
            { keyword: "fiyat", found: false, count: 0 },
          ],
          trust_signals_json: [
            { keyword: "referans", found: false, count: 0 },
          ],
        }),
      });
      const resultTitles = recommendationTitles(recommendations);

      expect(new Set(resultTitles).size).toBe(
        resultTitles.length
      );
    });

    it("öneri listesini en fazla sekiz kayıtla sınırlar", () => {
      const recommendations = buildRecommendations({
        score: score({
          visibility_score: 10,
          average_rank: 7,
          positive_sentiment_rate: 10,
        }),
        analyses: [
          analysis({
            brand_mentioned: false,
            competitors_json: [
              { name: "Rakip A", mentioned: true, rank: 1 },
            ],
          }),
          analysis({
            brand_mentioned: false,
            competitors_json: [
              { name: "Rakip A", mentioned: true, rank: 1 },
            ],
          }),
        ],
        brandWebsiteSnapshot: brandSnapshot({
          content_score: 20,
          service_signals_json: [
            { keyword: "fiyat", found: false, count: 0 },
          ],
          trust_signals_json: [
            { keyword: "referans", found: false, count: 0 },
          ],
          technical_signals_json: { contentTypesFound: [] },
        }),
        competitorWebsiteSnapshots: [
          competitorSnapshot({
            content_score: 90,
            service_signals_json: [
              {
                keyword: "online başvuru",
                found: true,
                count: 2,
              },
            ],
            trust_signals_json: [
              {
                keyword: "sertifika",
                found: true,
                count: 2,
              },
            ],
          }),
        ],
      });

      expect(recommendations).toHaveLength(8);
    });
  });

  describe("marka website analizi ve skor sınırları", () => {
    it("marka website snapshot'ı yoksa analiz tamamlama önerisi üretir", () => {
      const recommendations = buildRecommendations({
        brandWebsiteSnapshot: null,
      });

      expect(
        findRecommendation(
          recommendations,
          titles.websiteMissing
        )
      ).toMatchObject({
        category: "website",
        priority: "high",
        effort: "low",
        impact: "high",
      });
    });

    it.each([0, 1, 25, 49, 49.9])(
      "%s website skorunda içerik güçlendirme önerisi üretir",
      (contentScore) => {
        const recommendations = buildRecommendations({
          brandWebsiteSnapshot: brandSnapshot({
            content_score: contentScore,
          }),
        });

        expect(
          findRecommendation(
            recommendations,
            titles.websiteWeak
          )
        ).toBeDefined();
      }
    );

    it.each([50, 50.1, 75, 100])(
      "%s website skorunda düşük skor önerisi üretmez",
      (contentScore) => {
        const recommendations = buildRecommendations({
          brandWebsiteSnapshot: brandSnapshot({
            content_score: contentScore,
          }),
        });

        expect(
          findRecommendation(
            recommendations,
            titles.websiteWeak
          )
        ).toBeUndefined();
      }
    );

    it.each([
      null,
      -1,
      100.1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ])(
      "ölçülemeyen %s website skorunu sıfır gibi yorumlamaz",
      (contentScore) => {
        const recommendations = buildRecommendations({
          brandWebsiteSnapshot: brandSnapshot({
            content_score: contentScore,
          }),
        });

        expect(
          findRecommendation(
            recommendations,
            titles.websiteWeak
          )
        ).toBeUndefined();
      }
    );

    it("website skoru açıklamada en yakın tam sayıya yuvarlanır", () => {
      const recommendation = findRecommendation(
        buildRecommendations({
          brandWebsiteSnapshot: brandSnapshot({
            content_score: 42.6,
          }),
        }),
        titles.websiteWeak
      );

      expect(recommendation?.description).toContain("43/100");
    });
  });

  describe("rakip website skor karşılaştırması", () => {
    it("rakip ortalaması markadan on puandan fazla yüksekse öneri üretir", () => {
      const recommendation = findRecommendation(
        buildRecommendations({
          brandWebsiteSnapshot: brandSnapshot({
            content_score: 60,
          }),
          competitorWebsiteSnapshots: [
            competitorSnapshot({ content_score: 71 }),
          ],
        }),
        titles.competitorScore
      );

      expect(recommendation?.description).toContain(
        "60/100"
      );
      expect(recommendation?.description).toContain(
        "71/100"
      );
    });

    it.each([60, 69, 70])(
      "%s rakip ortalamasında on puan eşiği aşılmadığı için öneri üretmez",
      (competitorScore) => {
        const recommendations = buildRecommendations({
          brandWebsiteSnapshot: brandSnapshot({
            content_score: 60,
          }),
          competitorWebsiteSnapshots: [
            competitorSnapshot({
              content_score: competitorScore,
            }),
          ],
        });

        expect(
          findRecommendation(
            recommendations,
            titles.competitorScore
          )
        ).toBeUndefined();
      }
    );

    it("rakip skorlarının aritmetik ortalamasını yuvarlayarak kullanır", () => {
      const recommendation = findRecommendation(
        buildRecommendations({
          brandWebsiteSnapshot: brandSnapshot({
            content_score: 50,
          }),
          competitorWebsiteSnapshots: [
            competitorSnapshot({ content_score: 70 }),
            competitorSnapshot({
              competitor_name: "Rakip B",
              content_score: 75,
            }),
          ],
        }),
        titles.competitorScore
      );

      expect(recommendation?.description).toContain(
        "73/100"
      );
    });

    it.each([
      null,
      -1,
      101,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ])(
      "geçersiz %s rakip skorunu ortalamaya katmaz",
      (invalidScore) => {
        const recommendation = findRecommendation(
          buildRecommendations({
            brandWebsiteSnapshot: brandSnapshot({
              content_score: 60,
            }),
            competitorWebsiteSnapshots: [
              competitorSnapshot({
                content_score: invalidScore,
              }),
              competitorSnapshot({
                competitor_name: "Rakip B",
                content_score: 80,
              }),
            ],
          }),
          titles.competitorScore
        );

        expect(recommendation?.description).toContain(
          "80/100"
        );
      }
    );

    it("marka website skoru ölçülmemişse rakip skor iddiası üretmez", () => {
      const recommendations = buildRecommendations({
        brandWebsiteSnapshot: brandSnapshot({
          content_score: null,
        }),
        competitorWebsiteSnapshots: [
          competitorSnapshot({ content_score: 90 }),
        ],
      });

      expect(
        findRecommendation(
          recommendations,
          titles.competitorScore
        )
      ).toBeUndefined();
    });

    it("marka website analizi yoksa rakip skor iddiası üretmez", () => {
      const recommendations = buildRecommendations({
        brandWebsiteSnapshot: null,
        competitorWebsiteSnapshots: [
          competitorSnapshot({ content_score: 90 }),
        ],
      });

      expect(
        findRecommendation(
          recommendations,
          titles.competitorScore
        )
      ).toBeUndefined();
    });
  });

  describe("rakip içerik türü boşlukları", () => {
    it("markada olmayan fakat rakipte bulunan içerik türünü raporlar", () => {
      const recommendation = findRecommendation(
        buildRecommendations({
          brandWebsiteSnapshot: brandSnapshot({
            technical_signals_json: {
              contentTypesFound: ["service", "about", "contact"],
            },
          }),
          competitorWebsiteSnapshots: [
            competitorSnapshot({
              technical_signals_json: {
                contentTypesFound: [
                  "service",
                  "about",
                  "contact",
                  "faq",
                  "guide",
                ],
              },
            }),
          ],
        }),
        titles.contentGap
      );

      expect(recommendation?.description).toContain(
        "Sık sorulan sorular (1/1 rakipte)"
      );
      expect(recommendation?.description).toContain(
        "Rehber (1/1 rakipte)"
      );
    });

    it("boşlukları önce rakip yaygınlığına göre sıralar", () => {
      const recommendation = findRecommendation(
        buildRecommendations({
          brandWebsiteSnapshot: brandSnapshot({
            technical_signals_json: {
              contentTypesFound: ["service"],
            },
          }),
          competitorWebsiteSnapshots: [
            competitorSnapshot({
              technical_signals_json: {
                contentTypesFound: ["about", "pricing"],
              },
            }),
            competitorSnapshot({
              competitor_name: "Rakip B",
              technical_signals_json: {
                contentTypesFound: ["pricing"],
              },
            }),
          ],
        }),
        titles.contentGap
      );

      expect(recommendation?.description.indexOf("Fiyatlandırma"))
        .toBeLessThan(
          recommendation?.description.indexOf("Kurumsal") ??
            Number.POSITIVE_INFINITY
        );
    });

    it("eşit yaygınlıktaki boşlukları iş önceliğine göre sıralar", () => {
      const recommendation = findRecommendation(
        buildRecommendations({
          brandWebsiteSnapshot: brandSnapshot({
            technical_signals_json: {
              contentTypesFound: ["service"],
            },
          }),
          competitorWebsiteSnapshots: [
            competitorSnapshot({
              technical_signals_json: {
                contentTypesFound: [
                  "about",
                  "pricing",
                  "comparison",
                  "guide",
                  "faq",
                ],
              },
            }),
          ],
        }),
        titles.contentGap
      );

      expect(recommendation?.description).toContain(
        "Sık sorulan sorular (1/1 rakipte), Rehber (1/1 rakipte), Karşılaştırma (1/1 rakipte)"
      );
      expect(recommendation?.description).not.toContain(
        "Fiyatlandırma"
      );
    });

    it("özetlenecek içerik boşluğunu en fazla üç türle sınırlar", () => {
      const recommendation = findRecommendation(
        buildRecommendations({
          brandWebsiteSnapshot: brandSnapshot({
            technical_signals_json: {
              contentTypesFound: [],
            },
          }),
          competitorWebsiteSnapshots: [
            competitorSnapshot(),
          ],
        }),
        titles.contentGap
      );

      expect(
        recommendation?.description.match(/\(\d+\/\d+ rakipte\)/gu)
      ).toHaveLength(3);
    });

    it("markanın içerik türü ölçülmemişse boşluk iddiası üretmez", () => {
      const recommendations = buildRecommendations({
        brandWebsiteSnapshot: brandSnapshot({
          technical_signals_json: {},
        }),
        competitorWebsiteSnapshots: [
          competitorSnapshot(),
        ],
      });

      expect(
        findRecommendation(
          recommendations,
          titles.contentGap
        )
      ).toBeUndefined();
    });

    it("rakibin içerik türü ölçülmemişse paydaya katmaz", () => {
      const recommendation = findRecommendation(
        buildRecommendations({
          brandWebsiteSnapshot: brandSnapshot({
            technical_signals_json: {
              contentTypesFound: [],
            },
          }),
          competitorWebsiteSnapshots: [
            competitorSnapshot({
              technical_signals_json: {},
            }),
            competitorSnapshot({
              competitor_name: "Rakip B",
              technical_signals_json: {
                contentTypesFound: ["faq"],
              },
            }),
          ],
        }),
        titles.contentGap
      );

      expect(recommendation?.description).toContain(
        "Sık sorulan sorular (1/1 rakipte)"
      );
    });

    it("hasAboutLink ve hasContactLink sinyallerini mevcut içerik sayar", () => {
      const recommendations = buildRecommendations({
        brandWebsiteSnapshot: brandSnapshot({
          technical_signals_json: {
            contentTypesFound: [],
            hasAboutLink: true,
            hasContactLink: true,
          },
        }),
        competitorWebsiteSnapshots: [
          competitorSnapshot({
            technical_signals_json: {
              contentTypesFound: ["about", "contact"],
            },
          }),
        ],
      });

      expect(
        findRecommendation(
          recommendations,
          titles.contentGap
        )
      ).toBeUndefined();
    });

    it("bilinmeyen ve bozuk içerik türlerini yok sayar", () => {
      const recommendations = buildRecommendations({
        brandWebsiteSnapshot: brandSnapshot({
          technical_signals_json: {
            contentTypesFound: [],
          },
        }),
        competitorWebsiteSnapshots: [
          competitorSnapshot({
            technical_signals_json: {
              contentTypesFound: [
                "unknown",
                "",
                null,
                false,
                7,
              ],
            },
          }),
        ],
      });

      expect(
        findRecommendation(
          recommendations,
          titles.contentGap
        )
      ).toBeUndefined();
    });

    it("içerik türü dış boşluklarını ve harf büyüklüğünü normalleştirir", () => {
      const recommendations = buildRecommendations({
        brandWebsiteSnapshot: brandSnapshot({
          technical_signals_json: {
            contentTypesFound: [" FAQ ", "ABOUT"],
          },
        }),
        competitorWebsiteSnapshots: [
          competitorSnapshot({
            technical_signals_json: {
              contentTypesFound: ["faq", "about"],
            },
          }),
        ],
      });

      expect(
        findRecommendation(
          recommendations,
          titles.contentGap
        )
      ).toBeUndefined();
    });
  });

  describe("hizmet ve güven sinyallerinin normalizasyonu", () => {
    it("rakipte olup markada olmayan hizmet sinyalini raporlar", () => {
      const recommendation = findRecommendation(
        buildRecommendations({
          competitorWebsiteSnapshots: [
            competitorSnapshot({
              service_signals_json: [
                {
                  keyword: "teknik destek",
                  found: true,
                  count: 2,
                },
              ],
            }),
          ],
        }),
        titles.competitorService
      );

      expect(recommendation?.description).toContain(
        "teknik destek"
      );
    });

    it("rakipte olup markada olmayan güven sinyalini raporlar", () => {
      const recommendation = findRecommendation(
        buildRecommendations({
          competitorWebsiteSnapshots: [
            competitorSnapshot({
              trust_signals_json: [
                {
                  keyword: "sertifika",
                  found: true,
                  count: 1,
                },
              ],
            }),
          ],
        }),
        titles.competitorTrust
      );

      expect(recommendation?.description).toContain(
        "sertifika"
      );
    });

    it("aynı sinyalin harf ve boşluk varyasyonlarını rakip farkı saymaz", () => {
      const recommendations = buildRecommendations({
        brandWebsiteSnapshot: brandSnapshot({
          service_signals_json: [
            {
              keyword: "Teknik Destek",
              found: true,
              count: 1,
            },
          ],
        }),
        competitorWebsiteSnapshots: [
          competitorSnapshot({
            service_signals_json: [
              {
                keyword: "  TEKNİK   DESTEK ",
                found: true,
                count: 2,
              },
            ],
          }),
        ],
      });

      expect(
        findRecommendation(
          recommendations,
          titles.competitorService
        )
      ).toBeUndefined();
    });

    it("aynı rakip sinyalini açıklamada bir kez gösterir", () => {
      const recommendation = findRecommendation(
        buildRecommendations({
          competitorWebsiteSnapshots: [
            competitorSnapshot({
              service_signals_json: [
                {
                  keyword: "Teknik destek",
                  found: true,
                  count: 1,
                },
                {
                  keyword: " teknik   destek ",
                  found: true,
                  count: 3,
                },
              ],
            }),
          ],
        }),
        titles.competitorService
      );

      expect(
        recommendation?.description.match(/Teknik destek/giu)
      ).toHaveLength(1);
    });

    it.each(["", " ", "\n\t"])(
      "boş %j anahtar kelimeyi sinyal saymaz",
      (keyword) => {
        const recommendations = buildRecommendations({
          competitorWebsiteSnapshots: [
            competitorSnapshot({
              service_signals_json: [
                { keyword, found: true, count: 3 },
              ],
            }),
          ],
        });

        expect(
          findRecommendation(
            recommendations,
            titles.competitorService
          )
        ).toBeUndefined();
      }
    );

    it("pozitif sayımlı sinyali found false olsa bile bulunmuş kabul eder", () => {
      const recommendation = findRecommendation(
        buildRecommendations({
          competitorWebsiteSnapshots: [
            competitorSnapshot({
              service_signals_json: [
                {
                  keyword: "saha hizmeti",
                  found: false,
                  count: 4,
                },
              ],
            }),
          ],
        }),
        titles.competitorService
      );

      expect(recommendation?.description).toContain(
        "saha hizmeti"
      );
    });

    it("string false değerini gerçek found sinyali saymaz", () => {
      const recommendations = buildRecommendations({
        competitorWebsiteSnapshots: [
          competitorSnapshot({
            service_signals_json: [
              {
                keyword: "saha hizmeti",
                found: "false",
                count: 0,
              },
            ],
          }),
        ],
      } as Partial<BuildInput>);

      expect(
        findRecommendation(
          recommendations,
          titles.competitorService
        )
      ).toBeUndefined();
    });

    it("marka hizmet sinyalleri ölçülmemişse rakip farkı iddiası üretmez", () => {
      const recommendations = buildRecommendations({
        brandWebsiteSnapshot: brandSnapshot({
          service_signals_json: null,
        }),
        competitorWebsiteSnapshots: [
          competitorSnapshot({
            service_signals_json: [
              {
                keyword: "teknik destek",
                found: true,
                count: 1,
              },
            ],
          }),
        ],
      });

      expect(
        findRecommendation(
          recommendations,
          titles.competitorService
        )
      ).toBeUndefined();
    });

    it("marka güven sinyalleri ölçülmemişse rakip farkı iddiası üretmez", () => {
      const recommendations = buildRecommendations({
        brandWebsiteSnapshot: brandSnapshot({
          trust_signals_json: null,
        }),
        competitorWebsiteSnapshots: [
          competitorSnapshot({
            trust_signals_json: [
              {
                keyword: "referans",
                found: true,
                count: 1,
              },
            ],
          }),
        ],
      });

      expect(
        findRecommendation(
          recommendations,
          titles.competitorTrust
        )
      ).toBeUndefined();
    });

    it("rakip sinyal listesini açıklamada en fazla sekiz kelimeyle sınırlar", () => {
      const recommendation = findRecommendation(
        buildRecommendations({
          competitorWebsiteSnapshots: [
            competitorSnapshot({
              service_signals_json: Array.from(
                { length: 12 },
                (_, index) => ({
                  keyword: `sinyal-${index}`,
                  found: true,
                  count: 1,
                })
              ),
            }),
          ],
        }),
        titles.competitorService
      );

      expect(recommendation?.description).toContain("sinyal-7");
      expect(recommendation?.description).not.toContain(
        "sinyal-8"
      );
    });
  });

  describe("markanın eksik hizmet ve güven sinyalleri", () => {
    it("düşük görünürlük ve eksik hizmet sinyalinde içerik önerir", () => {
      const recommendation = findRecommendation(
        buildRecommendations({
          score: score({ visibility_score: 49 }),
          brandWebsiteSnapshot: brandSnapshot({
            service_signals_json: [
              {
                keyword: "online başvuru",
                found: false,
                count: 0,
              },
            ],
          }),
        }),
        titles.missingService
      );

      expect(recommendation?.description).toContain(
        "online başvuru"
      );
    });

    it.each([50, 50.1, 80, 100])(
      "%s görünürlük skorunda düşük görünürlük önerisi üretmez",
      (visibilityScore) => {
        const recommendations = buildRecommendations({
          score: score({
            visibility_score: visibilityScore,
          }),
          brandWebsiteSnapshot: brandSnapshot({
            service_signals_json: [
              {
                keyword: "online başvuru",
                found: false,
                count: 0,
              },
            ],
          }),
        });

        expect(
          findRecommendation(
            recommendations,
            titles.missingService
          )
        ).toBeUndefined();
      }
    );

    it.each([
      null,
      -1,
      101,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ])(
      "ölçülemeyen %s görünürlük skorunu düşük kabul etmez",
      (visibilityScore) => {
        const recommendations = buildRecommendations({
          score: score({
            visibility_score: visibilityScore,
          }),
          brandWebsiteSnapshot: brandSnapshot({
            service_signals_json: [
              {
                keyword: "online başvuru",
                found: false,
                count: 0,
              },
            ],
          }),
        });

        expect(
          findRecommendation(
            recommendations,
            titles.missingService
          )
        ).toBeUndefined();
      }
    );

    it("düşük olumlu ton ve eksik güven sinyalinde güven önerir", () => {
      const recommendation = findRecommendation(
        buildRecommendations({
          score: score({ positive_sentiment_rate: 69 }),
          brandWebsiteSnapshot: brandSnapshot({
            trust_signals_json: [
              {
                keyword: "referans",
                found: false,
                count: 0,
              },
            ],
          }),
        }),
        titles.missingTrust
      );

      expect(recommendation?.description).toContain("referans");
    });

    it.each([70, 70.1, 90, 100])(
      "%s olumlu ton oranında eksik güven önerisi üretmez",
      (positiveSentimentRate) => {
        const recommendations = buildRecommendations({
          score: score({
            positive_sentiment_rate: positiveSentimentRate,
          }),
          brandWebsiteSnapshot: brandSnapshot({
            trust_signals_json: [
              {
                keyword: "referans",
                found: false,
                count: 0,
              },
            ],
          }),
        });

        expect(
          findRecommendation(
            recommendations,
            titles.missingTrust
          )
        ).toBeUndefined();
      }
    );

    it.each([
      null,
      -1,
      101,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ])(
      "ölçülemeyen %s olumlu ton oranını düşük kabul etmez",
      (positiveSentimentRate) => {
        const recommendations = buildRecommendations({
          score: score({
            positive_sentiment_rate: positiveSentimentRate,
          }),
          brandWebsiteSnapshot: brandSnapshot({
            trust_signals_json: [
              {
                keyword: "referans",
                found: false,
                count: 0,
              },
            ],
          }),
        });

        expect(
          findRecommendation(
            recommendations,
            titles.missingTrust
          )
        ).toBeUndefined();
      }
    );

    it("pozitif sayımı bulunan kelimeyi eksik sinyal saymaz", () => {
      const recommendations = buildRecommendations({
        score: score({ visibility_score: 10 }),
        brandWebsiteSnapshot: brandSnapshot({
          service_signals_json: [
            {
              keyword: "online başvuru",
              found: false,
              count: 2,
            },
          ],
        }),
      });

      expect(
        findRecommendation(
          recommendations,
          titles.missingService
        )
      ).toBeUndefined();
    });
  });

  describe("görünmeyen soru niyeti", () => {
    const intentCases = [
      ["buying_intent", "Satın alma kararını destekleyen içerik hazırla"],
      ["comparison", "Karşılaştırma sorularına özel içerik hazırla"],
      ["local_recommendation", "Yerel aramalara özel sayfalar oluştur"],
      ["problem_solution", "Müşteri sorunlarını yanıtlayan rehberler oluştur"],
      ["alternative_search", "Alternatif arayan kullanıcılar için içerik hazırla"],
      ["budget_friendly", "Fiyat ve değer avantajını görünür hâle getir"],
      ["premium_choice", "Kalite ve uzmanlık kanıtlarını güçlendir"],
      ["trust_reputation", "Güven ve marka itibarı içeriği oluştur"],
    ] as const;

    it.each(intentCases)(
      "%s niyetindeki görünmeme için doğru içerik planını kullanır",
      (intent, expectedTitle) => {
        const recommendations = buildRecommendations({
          analyses: [
            analysis({
              brand_mentioned: false,
              audit_runs: {
                prompt_intent_snapshot: intent,
              },
            }),
          ],
        });

        expect(
          findRecommendation(
            recommendations,
            expectedTitle
          )
        ).toBeDefined();
      }
    );

    it("audit_runs dizi biçimindeyse ilk kayıt niyetini okur", () => {
      const recommendations = buildRecommendations({
        analyses: [
          analysis({
            brand_mentioned: false,
            audit_runs: [
              {
                prompt_intent_snapshot: "comparison",
              },
            ],
          }),
        ],
      });

      expect(
        findRecommendation(
          recommendations,
          "Karşılaştırma sorularına özel içerik hazırla"
        )
      ).toBeDefined();
    });

    it("en sık görünmeyen niyeti ana içerik planı seçer", () => {
      const recommendations = buildRecommendations({
        analyses: [
          analysis({
            brand_mentioned: false,
            audit_runs: {
              prompt_intent_snapshot: "comparison",
            },
          }),
          analysis({
            brand_mentioned: false,
            audit_runs: {
              prompt_intent_snapshot: "buying_intent",
            },
          }),
          analysis({
            brand_mentioned: false,
            audit_runs: {
              prompt_intent_snapshot: "comparison",
            },
          }),
        ],
      });

      expect(
        findRecommendation(
          recommendations,
          "Karşılaştırma sorularına özel içerik hazırla"
        )
      ).toBeDefined();
    });

    it("niyet tekrarlarında dış boşluk ve harf büyüklüğünü normalleştirir", () => {
      const recommendations = buildRecommendations({
        analyses: [
          analysis({
            brand_mentioned: false,
            audit_runs: {
              prompt_intent_snapshot: " comparison ",
            },
          }),
          analysis({
            brand_mentioned: false,
            audit_runs: {
              prompt_intent_snapshot: "COMPARISON",
            },
          }),
        ],
      });

      expect(
        findRecommendation(
          recommendations,
          "Karşılaştırma sorularına özel içerik hazırla"
        )
      ).toBeDefined();
    });

    it("eşit niyet sayısında ilk karşılaşılan niyeti deterministik seçer", () => {
      const recommendations = buildRecommendations({
        analyses: [
          analysis({
            brand_mentioned: false,
            audit_runs: {
              prompt_intent_snapshot: "trust_reputation",
            },
          }),
          analysis({
            brand_mentioned: false,
            audit_runs: {
              prompt_intent_snapshot: "comparison",
            },
          }),
        ],
      });

      expect(
        findRecommendation(
          recommendations,
          "Güven ve marka itibarı içeriği oluştur"
        )
      ).toBeDefined();
    });

    it("bilinmeyen niyette güvenli genel görünmeme önerisine döner", () => {
      const recommendation = findRecommendation(
        buildRecommendations({
          analyses: [
            analysis({
              brand_mentioned: false,
              audit_runs: {
                prompt_intent_snapshot: "unknown_intent",
              },
            }),
          ],
        }),
        titles.invisibleGeneric
      );

      expect(recommendation?.description).toContain(
        "1 test sorusunda görünmedi"
      );
    });

    it("brand_mentioned null olan ölçümü görünmeme saymaz", () => {
      const recommendations = buildRecommendations({
        analyses: [
          analysis({
            brand_mentioned: null,
            audit_runs: {
              prompt_intent_snapshot: "comparison",
            },
          }),
        ],
      });

      expect(
        findRecommendation(
          recommendations,
          "Karşılaştırma sorularına özel içerik hazırla"
        )
      ).toBeUndefined();
      expect(
        findRecommendation(
          recommendations,
          titles.invisibleGeneric
        )
      ).toBeUndefined();
    });
  });

  describe("rakip görünürlük kanıtı", () => {
    it("rakip markadan daha çok görünmüşse karşılaştırma önerisi üretir", () => {
      const recommendation = findRecommendation(
        buildRecommendations({
          analyses: [
            analysis({
              brand_mentioned: true,
              competitors_json: [
                { name: "Rakip A", mentioned: true, rank: 1 },
              ],
            }),
            analysis({
              brand_mentioned: false,
              competitors_json: [
                { name: "Rakip A", mentioned: true, rank: 1 },
              ],
            }),
          ],
        }),
        titles.strongestCompetitor
      );

      expect(recommendation?.description).toContain(
        "Rakip A, AI cevaplarında 2 kez"
      );
      expect(recommendation?.description).toContain(
        "ASPEQO 1 kez"
      );
    });

    it("rakip marka ile eşit görünmüşse karşılaştırma önerisi üretmez", () => {
      const recommendations = buildRecommendations({
        analyses: [
          analysis({
            brand_mentioned: true,
            competitors_json: [
              { name: "Rakip A", mentioned: true, rank: 1 },
            ],
          }),
        ],
      });

      expect(
        findRecommendation(
          recommendations,
          titles.strongestCompetitor
        )
      ).toBeUndefined();
    });

    it("aynı cevaptaki mükerrer rakibi yalnızca bir görünüm sayar", () => {
      const recommendations = buildRecommendations({
        analyses: [
          analysis({
            brand_mentioned: true,
            competitors_json: [
              { name: "Rakip A", mentioned: true, rank: 1 },
              { name: " rakip a ", mentioned: true, rank: 2 },
            ],
          }),
        ],
      });

      expect(
        findRecommendation(
          recommendations,
          titles.strongestCompetitor
        )
      ).toBeUndefined();
    });

    it("rakip adının harf ve boşluk varyasyonlarını ölçümler arasında birleştirir", () => {
      const recommendation = findRecommendation(
        buildRecommendations({
          analyses: [
            analysis({
              brand_mentioned: true,
              competitors_json: [
                {
                  name: "Penta Otomasyon",
                  mentioned: true,
                  rank: 1,
                },
              ],
            }),
            analysis({
              brand_mentioned: false,
              competitors_json: [
                {
                  name: " PENTA   OTOMASYON ",
                  mentioned: true,
                  rank: 2,
                },
              ],
            }),
          ],
        }),
        titles.strongestCompetitor
      );

      expect(recommendation?.description).toContain(
        "Penta Otomasyon, AI cevaplarında 2 kez"
      );
    });

    it.each(["", " ", "\n\t"])(
      "adı boş rakibi görünürlük kanıtına katmaz: %j",
      (name) => {
        const recommendations = buildRecommendations({
          analyses: [
            analysis({
              brand_mentioned: false,
              competitors_json: [
                { name, mentioned: true, rank: 1 },
              ],
            }),
          ],
        });

        expect(
          findRecommendation(
            recommendations,
            titles.strongestCompetitor
          )
        ).toBeUndefined();
      }
    );

    it("mentioned değeri true olmayan rakibi saymaz", () => {
      const recommendations = buildRecommendations({
        analyses: [
          analysis({
            brand_mentioned: false,
            competitors_json: [
              {
                name: "Rakip A",
                mentioned: "true",
                rank: 1,
              },
              {
                name: "Rakip B",
                mentioned: false,
                rank: 2,
              },
            ],
          }),
        ],
      } as Partial<BuildInput>);

      expect(
        findRecommendation(
          recommendations,
          titles.strongestCompetitor
        )
      ).toBeUndefined();
    });

    it("sonucu ölçülmemiş analizdeki rakibi görünürlük kanıtına katmaz", () => {
      const recommendations = buildRecommendations({
        analyses: [
          analysis({
            brand_mentioned: null,
            competitors_json: [
              {
                name: "Rakip A",
                mentioned: true,
                rank: 1,
              },
            ],
          }),
        ],
      });

      expect(
        findRecommendation(
          recommendations,
          titles.strongestCompetitor
        )
      ).toBeUndefined();
    });

    it.each([null, {}, "bozuk", 7, false])(
      "dizi olmayan rakip verisini güvenle yok sayar: %j",
      (competitorsJson) => {
        expect(() =>
          buildRecommendations({
            analyses: [
              analysis({
                competitors_json: competitorsJson,
              }),
            ],
          })
        ).not.toThrow();
      }
    );
  });

  describe("ortalama marka sırası", () => {
    it.each([2.01, 2.5, 3, 9])(
      "%s ortalama sırada kategori otoritesi önerisi üretir",
      (averageRank) => {
        const recommendations = buildRecommendations({
          score: score({ average_rank: averageRank }),
        });

        expect(
          findRecommendation(
            recommendations,
            titles.averageRank
          )
        ).toBeDefined();
      }
    );

    it.each([0, 1, 2])(
      "%s ortalama sırada kategori otoritesi önerisi üretmez",
      (averageRank) => {
        const recommendations = buildRecommendations({
          score: score({ average_rank: averageRank }),
        });

        expect(
          findRecommendation(
            recommendations,
            titles.averageRank
          )
        ).toBeUndefined();
      }
    );

    it.each([
      null,
      -1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ])(
      "geçersiz %s ortalama sırayı öneri nedeni yapmaz",
      (averageRank) => {
        const recommendations = buildRecommendations({
          score: score({ average_rank: averageRank }),
        });

        expect(
          findRecommendation(
            recommendations,
            titles.averageRank
          )
        ).toBeUndefined();
      }
    );
  });

  describe("sektör bağımsızlığı", () => {
    it.each([
      ["SaaS", "CRM"],
      ["E-ticaret", "ürün"],
      ["Sağlık", "klinik"],
      ["Lojistik", "kargo"],
      ["Eğitim", "kurs"],
      ["Konaklama", "otel"],
      ["Finans", "yatırım"],
      ["Endüstriyel kalibrasyon", "kalibratör"],
    ])(
      "%s bağlamındaki %s markasında aynı kanıt kurallarını uygular",
      (_sector, offer) => {
        const brandName = `${offer} markası`;
        const recommendation = findRecommendation(
          buildRecommendations({
            brandName,
            analyses: [
              analysis({
                brand_mentioned: false,
                audit_runs: {
                  prompt_intent_snapshot:
                    "trust_reputation",
                },
              }),
            ],
          }),
          "Güven ve marka itibarı içeriği oluştur"
        );

        expect(recommendation?.description).toContain(
          brandName
        );
      }
    );
  });

  describe("yan etkisizlik, ölçek ve deterministik sonuç", () => {
    it("analiz, skor ve website snapshot girdilerini değiştirmez", () => {
      const input: BuildInput = {
        brandName: "ASPEQO",
        score: score({ visibility_score: 20 }),
        analyses: [
          analysis({
            brand_mentioned: false,
            competitors_json: [
              { name: "Rakip B", mentioned: true, rank: 2 },
              { name: "Rakip A", mentioned: true, rank: 1 },
            ],
          }),
        ],
        brandWebsiteSnapshot: brandSnapshot({
          service_signals_json: [
            { keyword: "fiyat", found: false, count: 0 },
          ],
        }),
        competitorWebsiteSnapshots: [
          competitorSnapshot(),
        ],
      };
      const snapshot = structuredClone(input);

      buildEvidenceBasedRecommendations(input);

      expect(input).toEqual(snapshot);
    });

    it("aynı girdide aynı sıralı öneri listesini üretir", () => {
      const input: BuildInput = {
        brandName: "ASPEQO",
        score: score({
          visibility_score: 20,
          average_rank: 5,
        }),
        analyses: [
          analysis({ brand_mentioned: false }),
        ],
        brandWebsiteSnapshot: brandSnapshot({
          content_score: 30,
        }),
        competitorWebsiteSnapshots: [
          competitorSnapshot({ content_score: 80 }),
        ],
      };

      expect(
        buildEvidenceBasedRecommendations(input)
      ).toEqual(buildEvidenceBasedRecommendations(input));
    });

    it("bin analizde rakip sayımını ve sekiz öneri sınırını korur", () => {
      const analyses = Array.from(
        { length: 1_000 },
        (_, index) =>
          analysis({
            brand_mentioned: index % 4 === 0,
            competitors_json: [
              {
                name: "Rakip A",
                mentioned: true,
                rank: (index % 5) + 1,
              },
            ],
            audit_runs: {
              prompt_intent_snapshot:
                index % 2 === 0
                  ? "comparison"
                  : "buying_intent",
            },
          })
      );
      const recommendations = buildRecommendations({
        analyses,
      });

      expect(recommendations.length).toBeLessThanOrEqual(8);
      expect(
        findRecommendation(
          recommendations,
          titles.strongestCompetitor
        )
      ).toBeDefined();
    });
  });
});