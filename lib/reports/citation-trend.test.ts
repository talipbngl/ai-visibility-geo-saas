import { describe, expect, it } from "vitest";

import type {
  CitationCompetitorInput,
  CitationRunInput,
  CitationSource,
} from "./citation-sources";

import {
  buildCitationTrendComparison,
} from "./citation-sources";

const brandWebsiteUrl =
  "https://brand.com/";

const competitors: CitationCompetitorInput[] = [
  {
    name: "Penta Otomasyon",
    websiteUrl:
      "https://penta.com.tr/",
  },
  {
    name: "Nevatek",
    websiteUrl:
      "https://nevatek.com.tr/",
  },
];

function createSource(
  uri: string,
  title = uri
): CitationSource {
  return {
    uri,
    title,
  };
}

function createCitationValue(
  sources: unknown = [],
  groundingEnabled: unknown = true
) {
  return {
    groundingEnabled,
    sources,
  };
}

function createRun(
  overrides: Partial<CitationRunInput> = {}
): CitationRunInput {
  return {
    id: "run-1",
    promptText:
      "Hangi teknik çözüm sağlayıcıları önerilir?",
    promptIntent: "alternative_search",
    brandMentioned: false,
    citationsValue:
      createCitationValue(),
    ...overrides,
  };
}

function buildTrend(
  currentRuns: CitationRunInput[],
  previousRuns: CitationRunInput[],
  options?: {
    websiteUrl?: string | null;
    competitorList?:
      CitationCompetitorInput[];
  }
) {
  return buildCitationTrendComparison({
    currentRuns,
    previousRuns,
    brandWebsiteUrl:
      options?.websiteUrl === undefined
        ? brandWebsiteUrl
        : options.websiteUrl,
    competitors:
      options?.competitorList ??
      competitors,
  });
}

describe("buildCitationTrendComparison", () => {
  it("önceki ölçüm yoksa karşılaştırılamayan boş sonuç döndürür", () => {
    const result = buildTrend(
      [
        createRun({
          citationsValue:
            createCitationValue([
              createSource(
                "https://brand.com/article"
              ),
            ]),
        }),
      ],
      []
    );

    expect(result).toEqual({
      hasPreviousMeasurement: false,
      comparable: false,
      comparablePromptCount: 0,
      currentSourceUsageRate: 0,
      previousSourceUsageRate: 0,
      sourceUsageDelta: 0,
      currentBrandCitationRate: 0,
      previousBrandCitationRate: 0,
      brandCitationDelta: 0,
      gainedBrandCitations: [],
      lostBrandCitations: [],
      persistentCitationGaps: [],
      newSources: [],
      lostSources: [],
    });
  });

  it("önceki ölçüm var fakat güncel çalışma yoksa önceki ölçümü tanır ama karşılaştırma yapmaz", () => {
    const result = buildTrend(
      [],
      [
        createRun({
          citationsValue:
            createCitationValue([
              createSource(
                "https://brand.com/article"
              ),
            ]),
        }),
      ]
    );

    expect(
      result.hasPreviousMeasurement
    ).toBe(true);

    expect(
      result.comparable
    ).toBe(false);

    expect(
      result.comparablePromptCount
    ).toBe(0);
  });

  it("güncel ve önceki ölçümlerde ortak soru yoksa karşılaştırma yapmaz", () => {
    const result = buildTrend(
      [
        createRun({
          promptText:
            "Güncel ölçüme özel soru",
        }),
      ],
      [
        createRun({
          promptText:
            "Önceki ölçüme özel soru",
        }),
      ]
    );

    expect(
      result.hasPreviousMeasurement
    ).toBe(true);

    expect(
      result.comparable
    ).toBe(false);

    expect(
      result.comparablePromptCount
    ).toBe(0);
  });

  it("soru metinlerini Türkçe büyük-küçük harf, baş-son ve fazla boşluk farklarından bağımsız eşleştirir", () => {
    const result = buildTrend(
      [
        createRun({
          id: "current",
          promptText:
            "hangi kalibratör iyi?",
          citationsValue:
            createCitationValue([
              createSource(
                "https://external.com/current"
              ),
            ]),
        }),
      ],
      [
        createRun({
          id: "previous",
          promptText:
            "  HANGİ   KALİBRATÖR İYİ?  ",
          citationsValue:
            createCitationValue([
              createSource(
                "https://external.com/previous"
              ),
            ]),
        }),
      ]
    );

    expect(
      result.comparable
    ).toBe(true);

    expect(
      result.comparablePromptCount
    ).toBe(1);

    expect(
      result.currentSourceUsageRate
    ).toBe(100);

    expect(
      result.previousSourceUsageRate
    ).toBe(100);
  });

  it.each([
    {
      description:
        "güncel çalışmada grounding kapalıysa",
      currentGrounding: false,
      previousGrounding: true,
    },
    {
      description:
        "önceki çalışmada grounding kapalıysa",
      currentGrounding: true,
      previousGrounding: false,
    },
  ])(
    "$description ilgili soru çiftini karşılaştırmaya dahil etmez",
    ({
      currentGrounding,
      previousGrounding,
    }) => {
      const result = buildTrend(
        [
          createRun({
            promptText:
              "Ortak ölçüm sorusu",
            citationsValue:
              createCitationValue(
                [
                  createSource(
                    "https://brand.com/current"
                  ),
                ],
                currentGrounding
              ),
          }),
        ],
        [
          createRun({
            promptText:
              "Ortak ölçüm sorusu",
            citationsValue:
              createCitationValue(
                [
                  createSource(
                    "https://brand.com/previous"
                  ),
                ],
                previousGrounding
              ),
          }),
        ]
      );

      expect(
        result.hasPreviousMeasurement
      ).toBe(true);

      expect(
        result.comparable
      ).toBe(false);

      expect(
        result.comparablePromptCount
      ).toBe(0);
    }
  );

  it("kazanılan, kaybedilen ve kalıcı citation boşluklarını birlikte doğru hesaplar", () => {
    const currentRuns = [
      createRun({
        id: "current-gained",
        promptText:
          "Kazanılan citation sorusu",
        promptIntent:
          "buying_intent",
        citationsValue:
          createCitationValue([
            createSource(
              "https://brand.com/current"
            ),
          ]),
      }),
      createRun({
        id: "current-lost",
        promptText:
          "Kaybedilen citation sorusu",
        promptIntent:
          "comparison",
        citationsValue:
          createCitationValue([
            createSource(
              "https://penta.com.tr/current"
            ),
          ]),
      }),
      createRun({
        id: "current-persistent",
        promptText:
          "Kalıcı boşluk sorusu",
        promptIntent:
          "trust_reputation",
        citationsValue:
          createCitationValue([
            createSource(
              "https://stable-source.com/current"
            ),
          ]),
      }),
      createRun({
        id: "current-new-gap",
        promptText:
          "Yeni kaynaklı boşluk sorusu",
        promptIntent:
          "alternative_search",
        citationsValue:
          createCitationValue([
            createSource(
              "https://new-source.com/current"
            ),
          ]),
      }),
    ];

    const previousRuns = [
      createRun({
        id: "previous-gained",
        promptText:
          "Kazanılan citation sorusu",
        citationsValue:
          createCitationValue([
            createSource(
              "https://old-source.com/previous"
            ),
          ]),
      }),
      createRun({
        id: "previous-lost",
        promptText:
          "Kaybedilen citation sorusu",
        citationsValue:
          createCitationValue([
            createSource(
              "https://brand.com/previous"
            ),
          ]),
      }),
      createRun({
        id: "previous-persistent",
        promptText:
          "Kalıcı boşluk sorusu",
        citationsValue:
          createCitationValue([
            createSource(
              "https://stable-source.com/previous"
            ),
          ]),
      }),
      createRun({
        id: "previous-new-gap",
        promptText:
          "Yeni kaynaklı boşluk sorusu",
        citationsValue:
          createCitationValue([]),
      }),
    ];

    const result = buildTrend(
      currentRuns,
      previousRuns
    );

    expect(
      result.comparable
    ).toBe(true);

    expect(
      result.comparablePromptCount
    ).toBe(4);

    expect(
      result.currentSourceUsageRate
    ).toBe(100);

    expect(
      result.previousSourceUsageRate
    ).toBe(75);

    expect(
      result.sourceUsageDelta
    ).toBe(25);

    expect(
      result.currentBrandCitationRate
    ).toBe(25);

    expect(
      result.previousBrandCitationRate
    ).toBe(25);

    expect(
      result.brandCitationDelta
    ).toBe(0);

    expect(
      result.gainedBrandCitations
    ).toHaveLength(1);

    expect(
      result.gainedBrandCitations[0]
    ).toMatchObject({
      id: "current-gained",
      promptText:
        "Kazanılan citation sorusu",
      promptIntent:
        "buying_intent",
      previousSourceHostnames: [
        "old-source.com",
      ],
      currentSourceHostnames: [
        "brand.com",
      ],
    });

    expect(
      result.lostBrandCitations
    ).toHaveLength(1);

    expect(
      result.lostBrandCitations[0]
    ).toMatchObject({
      id: "current-lost",
      previousSourceHostnames: [
        "brand.com",
      ],
      currentSourceHostnames: [
        "penta.com.tr",
      ],
    });

    expect(
      result.persistentCitationGaps.map(
        (change) => change.id
      )
    ).toEqual([
      "current-persistent",
      "current-new-gap",
    ]);

    expect(
      result.newSources.map(
        (source) => source.hostname
      )
    ).toEqual([
      "penta.com.tr",
      "new-source.com",
    ]);

    expect(
      result.lostSources.map(
        (source) => source.hostname
      )
    ).toEqual([
      "old-source.com",
    ]);

    expect(
      result.newSources[0]
    ).toMatchObject({
      hostname: "penta.com.tr",
      category: "competitor",
      competitorName:
        "Penta Otomasyon",
    });

    expect(
      result.newSources[1]
    ).toMatchObject({
      hostname: "new-source.com",
      category: "external",
      competitorName: null,
    });
  });

  it("eşleşmeyen güncel ve önceki soruları oran hesaplarına dahil etmez", () => {
    const result = buildTrend(
      [
        createRun({
          id: "matched-current",
          promptText:
            "Eşleşen soru",
          citationsValue:
            createCitationValue([
              createSource(
                "https://brand.com/current"
              ),
            ]),
        }),
        createRun({
          id: "current-only",
          promptText:
            "Yalnızca güncel soru",
          citationsValue:
            createCitationValue([]),
        }),
      ],
      [
        createRun({
          id: "matched-previous",
          promptText:
            "Eşleşen soru",
          citationsValue:
            createCitationValue([
              createSource(
                "https://brand.com/previous"
              ),
            ]),
        }),
        createRun({
          id: "previous-only",
          promptText:
            "Yalnızca önceki soru",
          citationsValue:
            createCitationValue([]),
        }),
      ]
    );

    expect(
      result.comparablePromptCount
    ).toBe(1);

    expect(
      result.currentSourceUsageRate
    ).toBe(100);

    expect(
      result.previousSourceUsageRate
    ).toBe(100);

    expect(
      result.currentBrandCitationRate
    ).toBe(100);

    expect(
      result.previousBrandCitationRate
    ).toBe(100);
  });

  it("oranları yuvarlar ve yuvarlanmış oranlar üzerinden delta hesaplar", () => {
    const currentRuns = [
      createRun({
        id: "current-1",
        promptText: "Soru 1",
        citationsValue:
          createCitationValue([
            createSource(
              "https://external.com/1"
            ),
          ]),
      }),
      createRun({
        id: "current-2",
        promptText: "Soru 2",
        citationsValue:
          createCitationValue([
            createSource(
              "https://external.com/2"
            ),
          ]),
      }),
      createRun({
        id: "current-3",
        promptText: "Soru 3",
        citationsValue:
          createCitationValue([]),
      }),
    ];

    const previousRuns = [
      createRun({
        id: "previous-1",
        promptText: "Soru 1",
        citationsValue:
          createCitationValue([
            createSource(
              "https://external.com/1"
            ),
          ]),
      }),
      createRun({
        id: "previous-2",
        promptText: "Soru 2",
        citationsValue:
          createCitationValue([]),
      }),
      createRun({
        id: "previous-3",
        promptText: "Soru 3",
        citationsValue:
          createCitationValue([]),
      }),
    ];

    const result = buildTrend(
      currentRuns,
      previousRuns
    );

    expect(
      result.currentSourceUsageRate
    ).toBe(67);

    expect(
      result.previousSourceUsageRate
    ).toBe(33);

    expect(
      result.sourceUsageDelta
    ).toBe(34);
  });

  it("aynı domainin tekrarlanan URL'lerini yeni ve kaybolan kaynaklarda çoğaltmaz", () => {
    const result = buildTrend(
      [
        createRun({
          promptText:
            "Tekrarlı kaynak sorusu",
          citationsValue:
            createCitationValue([
              createSource(
                "https://stable.com/current-a"
              ),
              createSource(
                "https://www.stable.com/current-b"
              ),
              createSource(
                "https://new.com/current-a"
              ),
              createSource(
                "https://www.new.com/current-b"
              ),
            ]),
        }),
      ],
      [
        createRun({
          promptText:
            "Tekrarlı kaynak sorusu",
          citationsValue:
            createCitationValue([
              createSource(
                "https://stable.com/previous-a"
              ),
              createSource(
                "https://www.stable.com/previous-b"
              ),
            ]),
        }),
      ]
    );

    expect(
      result.newSources
    ).toHaveLength(1);

    expect(
      result.newSources[0].hostname
    ).toBe("new.com");

    expect(
      result.lostSources
    ).toEqual([]);
  });

  it("prompt değişiminde önceki ve güncel kaynak listelerini dört domainle sınırlar", () => {
    const currentSources =
      Array.from(
        { length: 6 },
        (_, index) =>
          createSource(
            `https://current-${index}.example.com/article`
          )
      );

    const previousSources =
      Array.from(
        { length: 6 },
        (_, index) =>
          createSource(
            `https://previous-${index}.example.com/article`
          )
      );

    const result = buildTrend(
      [
        createRun({
          id: "current-gap",
          promptText:
            "Çok kaynaklı boşluk sorusu",
          citationsValue:
            createCitationValue(
              currentSources
            ),
        }),
      ],
      [
        createRun({
          id: "previous-gap",
          promptText:
            "Çok kaynaklı boşluk sorusu",
          citationsValue:
            createCitationValue(
              previousSources
            ),
        }),
      ]
    );

    expect(
      result.persistentCitationGaps
    ).toHaveLength(1);

    expect(
      result.persistentCitationGaps[0]
        .currentSourceHostnames
    ).toHaveLength(4);

    expect(
      result.persistentCitationGaps[0]
        .previousSourceHostnames
    ).toHaveLength(4);

    expect(
      result.persistentCitationGaps[0]
        .currentSourceHostnames
    ).toEqual([
      "current-0.example.com",
      "current-1.example.com",
      "current-2.example.com",
      "current-3.example.com",
    ]);
  });

  it("kazanılan, kaybedilen ve kalıcı boşluk listelerini ayrı ayrı dört kayıtla sınırlar", () => {
    const currentRuns: CitationRunInput[] =
      [];

    const previousRuns: CitationRunInput[] =
      [];

    for (let index = 0; index < 5; index += 1) {
      currentRuns.push(
        createRun({
          id: `gained-current-${index}`,
          promptText:
            `Kazanılan soru ${index}`,
          citationsValue:
            createCitationValue([
              createSource(
                `https://brand.com/gained-${index}`
              ),
            ]),
        })
      );

      previousRuns.push(
        createRun({
          id: `gained-previous-${index}`,
          promptText:
            `Kazanılan soru ${index}`,
          citationsValue:
            createCitationValue([
              createSource(
                `https://old-gained-${index}.com/article`
              ),
            ]),
        })
      );

      currentRuns.push(
        createRun({
          id: `lost-current-${index}`,
          promptText:
            `Kaybedilen soru ${index}`,
          citationsValue:
            createCitationValue([
              createSource(
                `https://lost-current-${index}.com/article`
              ),
            ]),
        })
      );

      previousRuns.push(
        createRun({
          id: `lost-previous-${index}`,
          promptText:
            `Kaybedilen soru ${index}`,
          citationsValue:
            createCitationValue([
              createSource(
                `https://brand.com/lost-${index}`
              ),
            ]),
        })
      );

      currentRuns.push(
        createRun({
          id: `persistent-current-${index}`,
          promptText:
            `Kalıcı boşluk sorusu ${index}`,
          citationsValue:
            createCitationValue([
              createSource(
                `https://persistent-${index}.com/current`
              ),
            ]),
        })
      );

      previousRuns.push(
        createRun({
          id: `persistent-previous-${index}`,
          promptText:
            `Kalıcı boşluk sorusu ${index}`,
          citationsValue:
            createCitationValue([
              createSource(
                `https://persistent-${index}.com/previous`
              ),
            ]),
        })
      );
    }

    const result = buildTrend(
      currentRuns,
      previousRuns
    );

    expect(
      result.gainedBrandCitations
    ).toHaveLength(4);

    expect(
      result.lostBrandCitations
    ).toHaveLength(4);

    expect(
      result.persistentCitationGaps
    ).toHaveLength(4);
  });

  it("yeni ve kaybolan kaynak listelerini altı domainle sınırlar", () => {
    const currentRuns =
      Array.from(
        { length: 8 },
        (_, index) =>
          createRun({
            id: `current-${index}`,
            promptText:
              `Kaynak değişim sorusu ${index}`,
            citationsValue:
              createCitationValue([
                createSource(
                  `https://new-${index}.example.com/article`
                ),
              ]),
          })
      );

    const previousRuns =
      Array.from(
        { length: 8 },
        (_, index) =>
          createRun({
            id: `previous-${index}`,
            promptText:
              `Kaynak değişim sorusu ${index}`,
            citationsValue:
              createCitationValue([
                createSource(
                  `https://old-${index}.example.com/article`
                ),
              ]),
          })
      );

    const result = buildTrend(
      currentRuns,
      previousRuns
    );

    expect(
      result.newSources
    ).toHaveLength(6);

    expect(
      result.lostSources
    ).toHaveLength(6);

    expect(
      result.newSources.map(
        (source) => source.hostname
      )
    ).toEqual([
      "new-0.example.com",
      "new-1.example.com",
      "new-2.example.com",
      "new-3.example.com",
      "new-4.example.com",
      "new-5.example.com",
    ]);
  });

  it("Gemini yönlendirmesindeki marka domainini yeni kazanılmış citation olarak tanır", () => {
    const result = buildTrend(
      [
        createRun({
          id: "current",
          promptText:
            "Gemini yönlendirme sorusu",
          citationsValue:
            createCitationValue([
              {
                uri:
                  "https://vertexaisearch.cloud.google.com/grounding-api-redirect/current",
                title:
                  "Brand resmi sitesi | www.brand.com",
              },
            ]),
        }),
      ],
      [
        createRun({
          id: "previous",
          promptText:
            "Gemini yönlendirme sorusu",
          citationsValue:
            createCitationValue([
              createSource(
                "https://external.com/previous"
              ),
            ]),
        }),
      ]
    );

    expect(
      result.gainedBrandCitations
    ).toHaveLength(1);

    expect(
      result.currentBrandCitationRate
    ).toBe(100);

    expect(
      result.previousBrandCitationRate
    ).toBe(0);

    expect(
      result.brandCitationDelta
    ).toBe(100);

    expect(
      result.newSources[0]
    ).toMatchObject({
      hostname: "brand.com",
      category: "brand",
      competitorName: null,
    });
  });

  it("marka web sitesi bilinmiyorsa görünürde marka domaini olsa bile citation kazanımı üretmez", () => {
    const result = buildTrend(
      [
        createRun({
          id: "current",
          promptText:
            "Web sitesi bilinmeyen marka sorusu",
          citationsValue:
            createCitationValue([
              createSource(
                "https://brand.com/current"
              ),
            ]),
        }),
      ],
      [
        createRun({
          id: "previous",
          promptText:
            "Web sitesi bilinmeyen marka sorusu",
          citationsValue:
            createCitationValue([
              createSource(
                "https://external.com/previous"
              ),
            ]),
        }),
      ],
      {
        websiteUrl: null,
      }
    );

    expect(
      result.gainedBrandCitations
    ).toEqual([]);

    expect(
      result.currentBrandCitationRate
    ).toBe(0);

    expect(
      result.previousBrandCitationRate
    ).toBe(0);

    expect(
      result.persistentCitationGaps
    ).toHaveLength(1);

    expect(
      result.newSources[0]
    ).toMatchObject({
      hostname: "brand.com",
      category: "external",
      competitorName: null,
    });
  });
});