import { describe, expect, it } from "vitest";

import type {
  CitationCompetitorInput,
  CitationRunInput,
  CitationSource,
} from "./citation-sources";

import {
  buildCitationIntelligence,
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
  {
    name: "Web Sitesiz Rakip",
    websiteUrl: null,
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

function buildIntelligence(
  runs: CitationRunInput[],
  options?: {
    websiteUrl?: string | null;
    competitorList?:
      CitationCompetitorInput[];
  }
) {
  return buildCitationIntelligence({
    runs,
    brandWebsiteUrl:
      options?.websiteUrl === undefined
        ? brandWebsiteUrl
        : options.websiteUrl,
    competitors:
      options?.competitorList ??
      competitors,
  });
}

describe("buildCitationIntelligence", () => {
  it("hiç çalışma yoksa tamamen boş ve ölçülmemiş sonuç döndürür", () => {
    const result =
      buildIntelligence([]);

    expect(result).toEqual({
      measured: false,
      groundedPromptCount: 0,
      sourcedPromptCount: 0,
      brandCitedPromptCount: 0,
      brandMentionedWithoutCitationCount: 0,
      sourceUsageRate: 0,
      brandCitationRate: 0,
      uniqueSourceCount: 0,
      topSources: [],
      citationGaps: [],
    });
  });

  it("groundingEnabled yalnızca gerçek boolean true olduğunda ölçüm yapar", () => {
    const result =
      buildIntelligence([
        createRun({
          id: "false-run",
          citationsValue:
            createCitationValue(
              [
                createSource(
                  "https://example.com/"
                ),
              ],
              false
            ),
        }),
        createRun({
          id: "string-true-run",
          citationsValue:
            createCitationValue(
              [
                createSource(
                  "https://example.com/"
                ),
              ],
              "true"
            ),
        }),
        createRun({
          id: "null-run",
          citationsValue: null,
        }),
        createRun({
          id: "array-run",
          citationsValue: [],
        }),
      ]);

    expect(result.measured).toBe(false);
    expect(
      result.groundedPromptCount
    ).toBe(0);
    expect(
      result.sourcedPromptCount
    ).toBe(0);
  });

  it("bozuk, boş, dizi ve string kaynak kayıtlarını filtreler", () => {
    const result =
      buildIntelligence([
        createRun({
          citationsValue:
            createCitationValue([
              null,
              "string kaynak",
              [],
              {},
              {
                uri: 123,
                title: true,
              },
              {
                uri: "geçersiz bir url",
                title:
                  "Domain içermeyen başlık",
              },
              {
                uri:
                  "https://valid-source.com/article",
                title:
                  "Geçerli kaynak",
              },
            ]),
        }),
      ]);

    expect(result.measured).toBe(true);
    expect(
      result.groundedPromptCount
    ).toBe(1);
    expect(
      result.sourcedPromptCount
    ).toBe(1);
    expect(
      result.uniqueSourceCount
    ).toBe(1);

    expect(
      result.topSources
    ).toHaveLength(1);

    expect(
      result.topSources[0]
    ).toMatchObject({
      hostname: "valid-source.com",
      usageCount: 1,
      promptCount: 1,
      coverageRate: 100,
    });
  });

  it("URI boş olsa bile başlığında geçerli domain bulunan kaynağı kabul eder", () => {
    const result =
      buildIntelligence([
        createRun({
          citationsValue:
            createCitationValue([
              {
                uri: "",
                title:
                  "Kaynak: docs.example.com",
              },
            ]),
        }),
      ]);

    expect(
      result.sourcedPromptCount
    ).toBe(1);

    expect(
      result.uniqueSourceCount
    ).toBe(1);

    expect(
      result.topSources[0]
    ).toMatchObject({
      hostname: "docs.example.com",
      sampleUri: "",
      displayName:
        "Kaynak: docs.example.com",
    });
  });

  it("sources alanı dizi değilse grounded çalışmayı kaynaksız sayar", () => {
    const result =
      buildIntelligence([
        createRun({
          citationsValue: {
            groundingEnabled: true,
            sources: {
              uri:
                "https://example.com/",
            },
          },
        }),
      ]);

    expect(result.measured).toBe(true);
    expect(
      result.groundedPromptCount
    ).toBe(1);
    expect(
      result.sourcedPromptCount
    ).toBe(0);
    expect(
      result.uniqueSourceCount
    ).toBe(0);
  });

  it("temel citation oranlarını ve citation gap sayılarını doğru hesaplar", () => {
    const result =
      buildIntelligence([
        createRun({
          id: "brand-cited",
          promptText:
            "Endüstriyel ürün sağlayıcıları hangileridir?",
          brandMentioned: true,
          citationsValue:
            createCitationValue([
              createSource(
                "https://brand.com/product-a"
              ),
              createSource(
                "https://www.brand.com/product-b"
              ),
              createSource(
                "https://penta.com.tr/solution"
              ),
              createSource(
                "https://industry-source.com/article"
              ),
            ]),
        }),
        createRun({
          id: "mentioned-not-cited",
          promptText:
            "Güvenilir teknik firmalar hangileridir?",
          brandMentioned: true,
          citationsValue:
            createCitationValue([
              createSource(
                "https://news-source.com/article"
              ),
            ]),
        }),
        createRun({
          id: "mentioned-no-source",
          promptText:
            "Kalibrasyon firması önerir misin?",
          brandMentioned: true,
          citationsValue:
            createCitationValue([]),
        }),
      ]);

    expect(result.measured).toBe(true);

    expect(
      result.groundedPromptCount
    ).toBe(3);

    expect(
      result.sourcedPromptCount
    ).toBe(2);

    expect(
      result.brandCitedPromptCount
    ).toBe(1);

    expect(
      result.brandMentionedWithoutCitationCount
    ).toBe(2);

    expect(
      result.sourceUsageRate
    ).toBe(67);

    expect(
      result.brandCitationRate
    ).toBe(33);

    expect(
      result.uniqueSourceCount
    ).toBe(4);

    expect(
      result.citationGaps
    ).toHaveLength(1);

    expect(
      result.citationGaps[0]
    ).toMatchObject({
      id: "mentioned-not-cited",
      brandMentioned: true,
      sourceHostnames: [
        "news-source.com",
      ],
    });
  });

  it("kaynakları marka, rakip ve harici olarak doğru sınıflandırır", () => {
    const result =
      buildIntelligence([
        createRun({
          citationsValue:
            createCitationValue([
              createSource(
                "https://docs.brand.com/guide"
              ),
              createSource(
                "https://blog.penta.com.tr/article"
              ),
              createSource(
                "https://independent-source.com/report"
              ),
            ]),
        }),
      ]);

    const brandSource =
      result.topSources.find(
        (source) =>
          source.hostname ===
          "docs.brand.com"
      );

    const competitorSource =
      result.topSources.find(
        (source) =>
          source.hostname ===
          "blog.penta.com.tr"
      );

    const externalSource =
      result.topSources.find(
        (source) =>
          source.hostname ===
          "independent-source.com"
      );

    expect(brandSource).toMatchObject({
      category: "brand",
      competitorName: null,
    });

    expect(
      competitorSource
    ).toMatchObject({
      category: "competitor",
      competitorName:
        "Penta Otomasyon",
    });

    expect(
      externalSource
    ).toMatchObject({
      category: "external",
      competitorName: null,
    });
  });

  it("aynı domaini aynı promptta tekrar kullanınca usageCount artar ama promptCount bir kez artar", () => {
    const result =
      buildIntelligence([
        createRun({
          id: "first-prompt",
          citationsValue:
            createCitationValue([
              createSource(
                "https://source.com/a"
              ),
              createSource(
                "https://www.source.com/b"
              ),
            ]),
        }),
        createRun({
          id: "second-prompt",
          citationsValue:
            createCitationValue([
              createSource(
                "https://source.com/c"
              ),
            ]),
        }),
      ]);

    const source =
      result.topSources.find(
        (item) =>
          item.hostname ===
          "source.com"
      );

    expect(source).toMatchObject({
      usageCount: 3,
      promptCount: 2,
      coverageRate: 100,
    });
  });

  it("kaynakları önce promptCount sonra usageCount değerine göre sıralar", () => {
    const result =
      buildIntelligence([
        createRun({
          id: "first",
          citationsValue:
            createCitationValue([
              createSource(
                "https://source-b.com/1"
              ),
              createSource(
                "https://source-b.com/2"
              ),
              createSource(
                "https://source-a.com/1"
              ),
              createSource(
                "https://source-c.com/1"
              ),
              createSource(
                "https://source-c.com/2"
              ),
              createSource(
                "https://source-c.com/3"
              ),
              createSource(
                "https://source-c.com/4"
              ),
            ]),
        }),
        createRun({
          id: "second",
          citationsValue:
            createCitationValue([
              createSource(
                "https://source-a.com/2"
              ),
              createSource(
                "https://source-b.com/3"
              ),
            ]),
        }),
      ]);

    expect(
      result.topSources.map(
        (source) =>
          source.hostname
      )
    ).toEqual([
      "source-b.com",
      "source-a.com",
      "source-c.com",
    ]);

    expect(
      result.topSources[0]
    ).toMatchObject({
      promptCount: 2,
      usageCount: 3,
    });

    expect(
      result.topSources[1]
    ).toMatchObject({
      promptCount: 2,
      usageCount: 2,
    });

    expect(
      result.topSources[2]
    ).toMatchObject({
      promptCount: 1,
      usageCount: 4,
    });
  });

  it("benzersiz kaynak sayısını korurken topSources listesini sekiz kayıtla sınırlar", () => {
    const sources = Array.from(
      { length: 10 },
      (_, index) =>
        createSource(
          `https://source-${index}.example.com/article`
        )
    );

    const result =
      buildIntelligence([
        createRun({
          citationsValue:
            createCitationValue(
              sources
            ),
        }),
      ]);

    expect(
      result.uniqueSourceCount
    ).toBe(10);

    expect(
      result.topSources
    ).toHaveLength(8);
  });

  it("citation gap listesini beş, her gap içindeki domainleri dört kayıtla sınırlar", () => {
    const runs = Array.from(
      { length: 6 },
      (_, runIndex) =>
        createRun({
          id: `gap-${runIndex}`,
          promptText:
            `Kaynak boşluğu sorusu ${runIndex}`,
          citationsValue:
            createCitationValue(
              Array.from(
                { length: 6 },
                (_, sourceIndex) =>
                  createSource(
                    `https://gap-${runIndex}-${sourceIndex}.example.com/article`
                  )
              )
            ),
        })
    );

    const result =
      buildIntelligence(runs);

    expect(
      result.citationGaps
    ).toHaveLength(5);

    expect(
      result.citationGaps[0]
        .sourceHostnames
    ).toHaveLength(4);

    expect(
      result.citationGaps[0]
        .sourceHostnames
    ).toEqual([
      "gap-0-0.example.com",
      "gap-0-1.example.com",
      "gap-0-2.example.com",
      "gap-0-3.example.com",
    ]);
  });

  it("marka web sitesi bilinmiyorsa hiçbir kaynağı marka kaynağı saymaz", () => {
    const result =
      buildIntelligence(
        [
          createRun({
            brandMentioned: true,
            citationsValue:
              createCitationValue([
                createSource(
                  "https://brand.com/article"
                ),
              ]),
          }),
        ],
        {
          websiteUrl: null,
        }
      );

    expect(
      result.brandCitedPromptCount
    ).toBe(0);

    expect(
      result.brandCitationRate
    ).toBe(0);

    expect(
      result.brandMentionedWithoutCitationCount
    ).toBe(1);

    expect(
      result.topSources[0]
    ).toMatchObject({
      category: "external",
      competitorName: null,
    });
  });

  it("Gemini yönlendirme kaynağını başlıktaki marka domaininden tanır", () => {
    const result =
      buildIntelligence([
        createRun({
          brandMentioned: true,
          citationsValue:
            createCitationValue([
              {
                uri:
                  "https://vertexaisearch.cloud.google.com/grounding-api-redirect/source",
                title:
                  "Brand resmi sitesi | www.brand.com",
              },
            ]),
        }),
      ]);

    expect(
      result.brandCitedPromptCount
    ).toBe(1);

    expect(
      result.brandCitationRate
    ).toBe(100);

    expect(
      result.brandMentionedWithoutCitationCount
    ).toBe(0);

    expect(
      result.topSources[0]
    ).toMatchObject({
      hostname: "brand.com",
      category: "brand",
    });
  });

  it("marka cevapta geçmediyse kaynaksız marka anımı sayısını artırmaz", () => {
    const result =
      buildIntelligence([
        createRun({
          brandMentioned: false,
          citationsValue:
            createCitationValue([
              createSource(
                "https://external.com/article"
              ),
            ]),
        }),
      ]);

    expect(
      result.brandMentionedWithoutCitationCount
    ).toBe(0);

    expect(
      result.citationGaps
    ).toHaveLength(1);
  });

  it("kaynak kullanım ve coverage oranlarını en yakın tam sayıya yuvarlar", () => {
    const result =
      buildIntelligence([
        createRun({
          id: "sourced",
          citationsValue:
            createCitationValue([
              createSource(
                "https://one-source.com/article"
              ),
            ]),
        }),
        createRun({
          id: "not-sourced-1",
          citationsValue:
            createCitationValue([]),
        }),
        createRun({
          id: "not-sourced-2",
          citationsValue:
            createCitationValue([]),
        }),
      ]);

    expect(
      result.sourceUsageRate
    ).toBe(33);

    expect(
      result.topSources[0]
        .coverageRate
    ).toBe(33);
  });

  it("web sitesi olmayan rakibi domain benzerliğiyle yanlış sınıflandırmaz", () => {
    const result =
      buildIntelligence(
        [
          createRun({
            citationsValue:
              createCitationValue([
                createSource(
                  "https://websitesiz-rakip.com/article"
                ),
              ]),
          }),
        ],
        {
          competitorList: [
            {
              name:
                "Web Sitesiz Rakip",
              websiteUrl: null,
            },
          ],
        }
      );

    expect(
      result.topSources[0]
    ).toMatchObject({
      category: "external",
      competitorName: null,
    });
  });
});