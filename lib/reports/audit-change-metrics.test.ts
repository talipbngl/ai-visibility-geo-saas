import { describe, expect, it } from "vitest";

import {
  buildAuditChangeOverview,
  formatAuditComparisonDate,
  parseAverageRankValue,
  parsePercentageValue,
  type AuditScoreSnapshot,
} from "./audit-change-metrics";

function createScore(
  overrides: Partial<AuditScoreSnapshot> = {}
): AuditScoreSnapshot {
  return {
    visibility_score: 60,
    share_of_voice: 40,
    average_rank: 3,
    positive_sentiment_rate: 70,
    ...overrides,
  };
}

function createPromptSet(count: number) {
  return Array.from(
    { length: count },
    (_, index) => `Karar sorusu ${index + 1}`
  );
}

function createOverview({
  currentScore = createScore(),
  previousScore = createScore({
    visibility_score: 50,
    share_of_voice: 30,
    average_rank: 4,
    positive_sentiment_rate: 60,
  }),
  currentPromptTexts = createPromptSet(5),
  previousPromptTexts = createPromptSet(5),
}: {
  currentScore?: AuditScoreSnapshot;
  previousScore?: AuditScoreSnapshot | null;
  currentPromptTexts?: (
    | string
    | null
    | undefined
  )[];
  previousPromptTexts?: (
    | string
    | null
    | undefined
  )[];
} = {}) {
  return buildAuditChangeOverview({
    currentScore,
    previousScore,
    currentPromptTexts,
    previousPromptTexts,
  });
}

describe("parsePercentageValue", () => {
  it.each([
    [0, 0],
    [100, 100],
    [42.5, 42.5],
    ["42.5", 42.5],
    [" 25 ", 25],
    [".5", 0.5],
    ["+20", 20],
    ["-0", 0],
    [33.333, 33.3],
  ])("%j değerini %j olarak kabul eder", (value, expected) => {
    expect(parsePercentageValue(value)).toBe(expected);
  });

  it.each([
    null,
    undefined,
    "",
    "   ",
    "abc",
    "42,5",
    "0x10",
    "1e2",
    -0.1,
    100.1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    {},
    [],
  ])("geçersiz yüzde değerini reddeder: %j", (value) => {
    expect(parsePercentageValue(value)).toBeNull();
  });
});

describe("parseAverageRankValue", () => {
  it.each([
    [1, 1],
    [2.5, 2.5],
    ["3", 3],
    [" 4.25 ", 4.3],
    [0.1, 0.1],
    ["+2", 2],
  ])("%j sıra değerini %j olarak kabul eder", (value, expected) => {
    expect(parseAverageRankValue(value)).toBe(expected);
  });

  it.each([
    null,
    undefined,
    "",
    "   ",
    0,
    -1,
    "-0.5",
    "1,5",
    "0x10",
    "1e2",
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    {},
    [],
  ])("geçersiz sıra değerini reddeder: %j", (value) => {
    expect(parseAverageRankValue(value)).toBeNull();
  });
});

describe("formatAuditComparisonDate", () => {
  it("geçerli ISO tarihini sabit İstanbul saat diliminde biçimlendirir", () => {
    expect(
      formatAuditComparisonDate(
        "2026-07-28T22:30:00.000Z"
      )
    ).toBe("29 Tem 2026");
  });

  it.each([
    null,
    undefined,
    "",
    "   ",
    "geçersiz tarih",
    "2026-99-99",
    12345,
    {},
  ])("geçersiz tarihte güvenli tire döndürür: %j", (value) => {
    expect(formatAuditComparisonDate(value)).toBe("-");
  });
});

describe("buildAuditChangeOverview", () => {
  describe("ortak soru kapsamı", () => {
    it("aynı beş benzersiz soruda yüksek güven üretir", () => {
      const result = createOverview();

      expect(result).toMatchObject({
        currentUniquePromptCount: 5,
        previousUniquePromptCount: 5,
        largestPromptSetSize: 5,
        comparablePromptCount: 5,
        coverageRate: 100,
        reliability: {
          level: "high",
          label: "Yüksek",
        },
        promptSetsAreIdentical: true,
      });
    });

    it("mükerrer soruları karşılaştırma kapsamına iki kez katmaz", () => {
      const prompts = [
        "Hangi firma iyi?",
        " HANGİ FİRMA İYİ? ",
        "Başka soru",
      ];
      const result = createOverview({
        currentPromptTexts: prompts,
        previousPromptTexts: prompts,
      });

      expect(result.currentUniquePromptCount).toBe(2);
      expect(result.previousUniquePromptCount).toBe(2);
      expect(result.comparablePromptCount).toBe(2);
    });

    it("Türkçe harf ve Unicode farklarını ortak soru olarak eşleştirir", () => {
      const result = createOverview({
        currentPromptTexts: [
          "Ölçüm çözümü önerir misin?",
        ],
        previousPromptTexts: [
          "O\u0308LC\u0327U\u0308M ÇÖZÜMÜ ÖNERİR MİSİN?",
        ],
      });

      expect(result.comparablePromptCount).toBe(1);
      expect(result.coverageRate).toBe(100);
    });

    it("boş ve bozuk soru metinlerini saymaz", () => {
      const result = createOverview({
        currentPromptTexts: [
          "",
          "   ",
          null,
          undefined,
        ],
        previousPromptTexts: ["", null],
      });

      expect(result.currentUniquePromptCount).toBe(0);
      expect(result.previousUniquePromptCount).toBe(0);
      expect(result.comparablePromptCount).toBe(0);
      expect(result.promptSetsAreIdentical).toBe(true);
    });

    it("ortak soru yoksa düşük güven üretir", () => {
      const result = createOverview({
        currentPromptTexts: ["Yeni soru"],
        previousPromptTexts: ["Eski soru"],
      });

      expect(result.comparablePromptCount).toBe(0);
      expect(result.coverageRate).toBe(0);
      expect(result.reliability.level).toBe("low");
      expect(result.promptSetsAreIdentical).toBe(false);
    });

    it("üç ortak soruda ve yüzde 50 kapsamda orta güven üretir", () => {
      const result = createOverview({
        currentPromptTexts: createPromptSet(3),
        previousPromptTexts: [
          ...createPromptSet(3),
          "Eski 1",
          "Eski 2",
          "Eski 3",
        ],
      });

      expect(result.comparablePromptCount).toBe(3);
      expect(result.coverageRate).toBe(50);
      expect(result.reliability.level).toBe("medium");
    });

    it("aynı büyüklükte fakat farklı soru setlerini özdeş saymaz", () => {
      const result = createOverview({
        currentPromptTexts: [
          "Ortak soru",
          "Yeni soru",
        ],
        previousPromptTexts: [
          "Ortak soru",
          "Eski soru",
        ],
      });

      expect(result.currentUniquePromptCount).toBe(2);
      expect(result.previousUniquePromptCount).toBe(2);
      expect(result.comparablePromptCount).toBe(1);
      expect(result.promptSetsAreIdentical).toBe(false);
    });
  });

  describe("metrik değerleri ve değişim yönü", () => {
    it("dört rapor metriğini sabit sırayla üretir", () => {
      const result = createOverview();

      expect(
        result.metrics.map((metric) => metric.id)
      ).toEqual([
        "visibility",
        "share_of_voice",
        "average_rank",
        "positive_sentiment",
      ]);
    });

    it("görünürlük artışını gelişme olarak işaretler", () => {
      const metric = createOverview().metrics[0];

      expect(metric).toMatchObject({
        currentValue: 60,
        previousValue: 50,
        difference: 10,
        status: "improved",
      });
    });

    it("görünürlük düşüşünü gerileme olarak işaretler", () => {
      const metric = createOverview({
        currentScore: createScore({
          visibility_score: 40,
        }),
        previousScore: createScore({
          visibility_score: 50,
        }),
      }).metrics[0];

      expect(metric).toMatchObject({
        difference: -10,
        status: "declined",
      });
    });

    it("değişmeyen değeri değişmedi olarak işaretler", () => {
      const metric = createOverview({
        currentScore: createScore({
          visibility_score: 50,
        }),
        previousScore: createScore({
          visibility_score: 50,
        }),
      }).metrics[0];

      expect(metric).toMatchObject({
        difference: 0,
        status: "unchanged",
      });
    });

    it("ortalama sıra küçüldüğünde gelişme olarak işaretler", () => {
      const metric = createOverview({
        currentScore: createScore({
          average_rank: 2,
        }),
        previousScore: createScore({
          average_rank: 4,
        }),
      }).metrics[2];

      expect(metric).toMatchObject({
        difference: -2,
        status: "improved",
      });
    });

    it("ortalama sıra büyüdüğünde gerileme olarak işaretler", () => {
      const metric = createOverview({
        currentScore: createScore({
          average_rank: 5,
        }),
        previousScore: createScore({
          average_rank: 2,
        }),
      }).metrics[2];

      expect(metric).toMatchObject({
        difference: 3,
        status: "declined",
      });
    });

    it("ondalıklı farkı bir basamağa yuvarlar", () => {
      const metric = createOverview({
        currentScore: createScore({
          visibility_score: 66.66,
        }),
        previousScore: createScore({
          visibility_score: 33.33,
        }),
      }).metrics[0];

      expect(metric.currentValue).toBe(66.7);
      expect(metric.previousValue).toBe(33.3);
      expect(metric.difference).toBe(33.4);
    });

    it("düşük karşılaştırma güveninde gelişme iddiası üretmez", () => {
      const result = createOverview({
        currentPromptTexts: ["Tek soru"],
        previousPromptTexts: ["Tek soru"],
      });

      expect(result.reliability.level).toBe("low");
      expect(
        result.metrics.map((metric) => metric.status)
      ).toEqual([
        "limited",
        "limited",
        "limited",
        "limited",
      ]);
    });

    it("geçersiz güncel değer varsa değişimi hesaplamaz", () => {
      const metric = createOverview({
        currentScore: createScore({
          visibility_score: Number.NaN,
        }),
      }).metrics[0];

      expect(metric).toMatchObject({
        currentValue: null,
        difference: null,
        status: "unavailable",
      });
    });

    it("geçersiz önceki değer varsa değişimi hesaplamaz", () => {
      const metric = createOverview({
        previousScore: createScore({
          share_of_voice: "bozuk",
        }),
      }).metrics[1];

      expect(metric).toMatchObject({
        previousValue: null,
        difference: null,
        status: "unavailable",
      });
    });

    it("önceki skor yoksa bütün değişimleri hesaplanamaz bırakır", () => {
      const result = createOverview({
        previousScore: null,
      });

      expect(
        result.metrics.every(
          (metric) =>
            metric.previousValue === null &&
            metric.difference === null &&
            metric.status === "unavailable"
        )
      ).toBe(true);
    });

    it("boş metni sıfır skor olarak yorumlamaz", () => {
      const metric = createOverview({
        currentScore: createScore({
          visibility_score: "   ",
        }),
      }).metrics[0];

      expect(metric.currentValue).toBeNull();
      expect(metric.status).toBe("unavailable");
    });

    it("yüzlük ölçek dışındaki skorları rapora sokmaz", () => {
      const result = createOverview({
        currentScore: createScore({
          visibility_score: 101,
          share_of_voice: -1,
          positive_sentiment_rate: Infinity,
        }),
      });

      expect(result.metrics[0]?.currentValue).toBeNull();
      expect(result.metrics[1]?.currentValue).toBeNull();
      expect(result.metrics[3]?.currentValue).toBeNull();
    });

    it("sıfır ve negatif ortalama sırayı rapora sokmaz", () => {
      const zeroRank = createOverview({
        currentScore: createScore({
          average_rank: 0,
        }),
      }).metrics[2];
      const negativeRank = createOverview({
        currentScore: createScore({
          average_rank: -2,
        }),
      }).metrics[2];

      expect(zeroRank.currentValue).toBeNull();
      expect(negativeRank.currentValue).toBeNull();
    });
  });

  describe("sektör bağımsızlığı ve dayanıklılık", () => {
    it.each([
      "Hangi e-ticaret altyapıları uygundur?",
      "Hangi CRM yazılımları öne çıkıyor?",
      "İstanbul'daki diş klinikleri hangileridir?",
      "Hangi kestirimci bakım firmaları iyidir?",
      "Hangi kalibrasyon cihazları tercih edilir?",
      "Aileler için uygun oteller hangileridir?",
      "Hangi lojistik sağlayıcıları güvenilirdir?",
      "KOBİ kredisi sunan bankalar hangileridir?",
    ])(
      "sektörden bağımsız ortak soruyu işler: %s",
      (promptText) => {
        const result = createOverview({
          currentPromptTexts: [promptText],
          previousPromptTexts: [
            `  ${promptText.toLocaleUpperCase(
              "tr-TR"
            )}  `,
          ],
        });

        expect(result.comparablePromptCount).toBe(1);
        expect(result.coverageRate).toBe(100);
      }
    );

    it("bin soruluk iki seti doğru karşılaştırır", () => {
      const prompts = Array.from(
        { length: 1000 },
        (_, index) => `Sektör sorusu ${index}`
      );
      const result = createOverview({
        currentPromptTexts: prompts,
        previousPromptTexts: prompts.map((prompt) =>
          prompt.toLocaleUpperCase("tr-TR")
        ),
      });

      expect(result.currentUniquePromptCount).toBe(1000);
      expect(result.previousUniquePromptCount).toBe(1000);
      expect(result.comparablePromptCount).toBe(1000);
      expect(result.coverageRate).toBe(100);
      expect(result.reliability.level).toBe("high");
      expect(result.promptSetsAreIdentical).toBe(true);
    });

    it("skorları ve soru dizilerini değiştirmez", () => {
      const currentScore = createScore();
      const previousScore = createScore();
      const currentPromptTexts = [
        "  Güncel   soru ",
      ];
      const previousPromptTexts = ["GÜNCEL SORU"];
      const snapshots = {
        currentScore: structuredClone(currentScore),
        previousScore: structuredClone(previousScore),
        currentPromptTexts: structuredClone(
          currentPromptTexts
        ),
        previousPromptTexts: structuredClone(
          previousPromptTexts
        ),
      };

      buildAuditChangeOverview({
        currentScore,
        previousScore,
        currentPromptTexts,
        previousPromptTexts,
      });

      expect(currentScore).toEqual(
        snapshots.currentScore
      );
      expect(previousScore).toEqual(
        snapshots.previousScore
      );
      expect(currentPromptTexts).toEqual(
        snapshots.currentPromptTexts
      );
      expect(previousPromptTexts).toEqual(
        snapshots.previousPromptTexts
      );
    });
  });
});