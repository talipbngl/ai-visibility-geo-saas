import { describe, expect, it } from "vitest";

import {
  buildIntentPerformance,
  type IntentAnalysisInput,
} from "./intent-performance";

function createAnalysis(
  overrides: Partial<IntentAnalysisInput> = {}
): IntentAnalysisInput {
  return {
    intent: "buying_intent",
    brandMentioned: false,
    brandRank: null,
    ...overrides,
  };
}

describe("buildIntentPerformance", () => {
  describe("boş ve temel girişler", () => {
    it("boş analiz dizisinde boş sonuç döndürür", () => {
      expect(buildIntentPerformance([])).toEqual([]);
    });

    it("tek görünmeyen analiz için güvenli sıfır değerleri üretir", () => {
      expect(
        buildIntentPerformance([
          createAnalysis(),
        ])
      ).toEqual([
        {
          intent: "buying_intent",
          total: 1,
          mentionCount: 0,
          visibilityRate: 0,
          averageRank: null,
        },
      ]);
    });

    it("tek görünen analiz için yüzde 100 görünürlük üretir", () => {
      expect(
        buildIntentPerformance([
          createAnalysis({
            brandMentioned: true,
            brandRank: 1,
          }),
        ])
      ).toEqual([
        {
          intent: "buying_intent",
          total: 1,
          mentionCount: 1,
          visibilityRate: 100,
          averageRank: 1,
        },
      ]);
    });
  });

  describe("niyet normalizasyonu", () => {
    it.each([null, undefined, "", "   ", "\n\t"])(
      "%j niyetini other grubuna dahil eder",
      (intent) => {
        const result = buildIntentPerformance([
          createAnalysis({ intent }),
        ]);

        expect(result).toEqual([
          {
            intent: "other",
            total: 1,
            mentionCount: 0,
            visibilityRate: 0,
            averageRank: null,
          },
        ]);
      }
    );

    it("null, undefined ve boş niyetleri aynı other grubunda birleştirir", () => {
      const result = buildIntentPerformance([
        createAnalysis({ intent: null }),
        createAnalysis({ intent: undefined }),
        createAnalysis({ intent: "" }),
        createAnalysis({ intent: "   " }),
      ]);

      expect(result).toEqual([
        {
          intent: "other",
          total: 4,
          mentionCount: 0,
          visibilityRate: 0,
          averageRank: null,
        },
      ]);
    });

    it("harf büyüklüğü ve dış boşluk farklarını aynı grupta birleştirir", () => {
      const result = buildIntentPerformance([
        createAnalysis({
          intent: "comparison",
          brandMentioned: true,
          brandRank: 1,
        }),
        createAnalysis({
          intent: "  COMPARISON  ",
          brandMentioned: false,
        }),
        createAnalysis({
          intent: "Comparison",
          brandMentioned: true,
          brandRank: 3,
        }),
      ]);

      expect(result).toEqual([
        {
          intent: "comparison",
          total: 3,
          mentionCount: 2,
          visibilityRate: 67,
          averageRank: 2,
        },
      ]);
    });

    it("niyet içindeki tekrarlı boşlukları tek boşluğa indirir", () => {
      const result = buildIntentPerformance([
        createAnalysis({ intent: "özel   karar alanı" }),
        createAnalysis({ intent: "ÖZEL KARAR ALANI" }),
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]?.intent).toBe("özel karar alanı");
      expect(result[0]?.total).toBe(2);
    });

    it("Unicode olarak eşdeğer niyetleri aynı grupta birleştirir", () => {
      const result = buildIntentPerformance([
        createAnalysis({ intent: "ölçüm" }),
        createAnalysis({ intent: "o\u0308lc\u0327u\u0308m" }),
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]?.total).toBe(2);
    });

    it("gerçekten farklı niyetleri yanlışlıkla birleştirmez", () => {
      const result = buildIntentPerformance([
        createAnalysis({ intent: "buying_intent" }),
        createAnalysis({ intent: "premium_choice" }),
      ]);

      expect(result).toHaveLength(2);
      expect(result.map((item) => item.intent).sort()).toEqual([
        "buying_intent",
        "premium_choice",
      ]);
    });
  });

  describe("tüm karar niyetleri", () => {
    it.each([
      "buying_intent",
      "comparison",
      "local_recommendation",
      "problem_solution",
      "alternative_search",
      "budget_friendly",
      "premium_choice",
      "trust_reputation",
    ])("%s niyetini kaybetmeden raporlar", (intent) => {
      const result = buildIntentPerformance([
        createAnalysis({
          intent,
          brandMentioned: true,
          brandRank: 2,
        }),
      ]);

      expect(result).toEqual([
        {
          intent,
          total: 1,
          mentionCount: 1,
          visibilityRate: 100,
          averageRank: 2,
        },
      ]);
    });
  });

  describe("görünürlük oranı", () => {
    it("bir görünüm ve iki görünmeme için yüzde 33 hesaplar", () => {
      const result = buildIntentPerformance([
        createAnalysis({ brandMentioned: true }),
        createAnalysis({ brandMentioned: false }),
        createAnalysis({ brandMentioned: false }),
      ]);

      expect(result[0]?.visibilityRate).toBe(33);
    });

    it("iki görünüm ve bir görünmeme için yüzde 67 hesaplar", () => {
      const result = buildIntentPerformance([
        createAnalysis({ brandMentioned: true }),
        createAnalysis({ brandMentioned: true }),
        createAnalysis({ brandMentioned: false }),
      ]);

      expect(result[0]?.visibilityRate).toBe(67);
    });

    it("bir görünüm ve üç görünmeme için yüzde 25 hesaplar", () => {
      const result = buildIntentPerformance([
        createAnalysis({ brandMentioned: true }),
        createAnalysis({ brandMentioned: false }),
        createAnalysis({ brandMentioned: false }),
        createAnalysis({ brandMentioned: false }),
      ]);

      expect(result[0]?.visibilityRate).toBe(25);
    });

    it("niyetlerin görünürlük oranlarını birbirinden bağımsız hesaplar", () => {
      const result = buildIntentPerformance([
        createAnalysis({
          intent: "buying_intent",
          brandMentioned: true,
        }),
        createAnalysis({
          intent: "buying_intent",
          brandMentioned: false,
        }),
        createAnalysis({
          intent: "comparison",
          brandMentioned: true,
        }),
      ]);

      const byIntent = new Map(
        result.map((item) => [item.intent, item])
      );

      expect(
        byIntent.get("buying_intent")?.visibilityRate
      ).toBe(50);
      expect(
        byIntent.get("comparison")?.visibilityRate
      ).toBe(100);
    });
  });

  describe("ortalama sıra", () => {
    it("marka görünmediyse sıra değerini ortalamaya katmaz", () => {
      const result = buildIntentPerformance([
        createAnalysis({
          brandMentioned: false,
          brandRank: 1,
        }),
        createAnalysis({
          brandMentioned: true,
          brandRank: 3,
        }),
      ]);

      expect(result[0]?.averageRank).toBe(3);
    });

    it.each([
      0,
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ])(
      "geçersiz marka sırasını ortalamaya katmaz: %s",
      (brandRank) => {
        const result = buildIntentPerformance([
          createAnalysis({
            brandMentioned: true,
            brandRank,
          }),
        ]);

        expect(result[0]?.averageRank).toBeNull();
      }
    );

    it("geçerli sıraların ortalamasını bir ondalığa yuvarlar", () => {
      const result = buildIntentPerformance([
        createAnalysis({
          brandMentioned: true,
          brandRank: 1,
        }),
        createAnalysis({
          brandMentioned: true,
          brandRank: 2,
        }),
        createAnalysis({
          brandMentioned: true,
          brandRank: 2,
        }),
      ]);

      expect(result[0]?.averageRank).toBe(1.7);
    });

    it("geçerli ve geçersiz sıraları birlikte doğru işler", () => {
      const result = buildIntentPerformance([
        createAnalysis({
          brandMentioned: true,
          brandRank: 1,
        }),
        createAnalysis({
          brandMentioned: true,
          brandRank: 0,
        }),
        createAnalysis({
          brandMentioned: true,
          brandRank: 3,
        }),
        createAnalysis({
          brandMentioned: false,
          brandRank: 2,
        }),
      ]);

      expect(result[0]?.mentionCount).toBe(3);
      expect(result[0]?.averageRank).toBe(2);
    });

    it("marka görünse fakat geçerli sıra bulunmasa null döndürür", () => {
      const result = buildIntentPerformance([
        createAnalysis({
          brandMentioned: true,
          brandRank: null,
        }),
        createAnalysis({
          brandMentioned: true,
          brandRank: 0,
        }),
      ]);

      expect(result[0]?.mentionCount).toBe(2);
      expect(result[0]?.averageRank).toBeNull();
    });
  });

  describe("çıktı sıralaması", () => {
    it("önce toplam soru sayısı yüksek niyeti getirir", () => {
      const result = buildIntentPerformance([
        createAnalysis({ intent: "comparison" }),
        createAnalysis({ intent: "buying_intent" }),
        createAnalysis({ intent: "buying_intent" }),
      ]);

      expect(result.map((item) => item.intent)).toEqual([
        "buying_intent",
        "comparison",
      ]);
    });

    it("toplamlar eşitse görünürlük oranı yüksek niyeti getirir", () => {
      const result = buildIntentPerformance([
        createAnalysis({
          intent: "comparison",
          brandMentioned: false,
        }),
        createAnalysis({
          intent: "buying_intent",
          brandMentioned: true,
        }),
      ]);

      expect(result.map((item) => item.intent)).toEqual([
        "buying_intent",
        "comparison",
      ]);
    });

    it("toplam ve görünürlük eşitse niyet adına göre deterministik sıralar", () => {
      const result = buildIntentPerformance([
        createAnalysis({ intent: "trust_reputation" }),
        createAnalysis({ intent: "comparison" }),
        createAnalysis({ intent: "buying_intent" }),
      ]);

      expect(result.map((item) => item.intent)).toEqual([
        "buying_intent",
        "comparison",
        "trust_reputation",
      ]);
    });

    it("ortalama sıra değerini toplam ve görünürlükten daha önemli saymaz", () => {
      const result = buildIntentPerformance([
        createAnalysis({
          intent: "comparison",
          brandMentioned: true,
          brandRank: 5,
        }),
        createAnalysis({
          intent: "comparison",
          brandMentioned: true,
          brandRank: 5,
        }),
        createAnalysis({
          intent: "buying_intent",
          brandMentioned: true,
          brandRank: 1,
        }),
      ]);

      expect(result[0]?.intent).toBe("comparison");
    });
  });

  describe("sektör bağımsızlığı ve sınırlar", () => {
    it.each([
      ["E-ticaret", "buying_intent"],
      ["SaaS", "comparison"],
      ["Sağlık", "local_recommendation"],
      ["Endüstriyel bakım", "problem_solution"],
      ["Eğitim", "alternative_search"],
      ["Konaklama", "budget_friendly"],
      ["Elektronik", "premium_choice"],
      ["Finans", "trust_reputation"],
    ])(
      "%s sektöründen gelen %s niyetini aynı matematikle işler",
      (_sector, intent) => {
        const result = buildIntentPerformance([
          createAnalysis({
            intent,
            brandMentioned: true,
            brandRank: 2,
          }),
          createAnalysis({
            intent,
            brandMentioned: false,
            brandRank: null,
          }),
        ]);

        expect(result[0]).toEqual({
          intent,
          total: 2,
          mentionCount: 1,
          visibilityRate: 50,
          averageRank: 2,
        });
      }
    );

    it("bin analizde sayım ve oran doğruluğunu korur", () => {
      const analyses = Array.from(
        { length: 1000 },
        (_, index) =>
          createAnalysis({
            intent:
              index % 2 === 0
                ? "comparison"
                : "buying_intent",
            brandMentioned: index % 4 === 0,
            brandRank: index % 4 === 0 ? 1 : null,
          })
      );

      const result = buildIntentPerformance(analyses);
      const byIntent = new Map(
        result.map((item) => [item.intent, item])
      );

      expect(byIntent.get("comparison")).toEqual({
        intent: "comparison",
        total: 500,
        mentionCount: 250,
        visibilityRate: 50,
        averageRank: 1,
      });

      expect(byIntent.get("buying_intent")).toEqual({
        intent: "buying_intent",
        total: 500,
        mentionCount: 0,
        visibilityRate: 0,
        averageRank: null,
      });
    });

    it("girdi dizisini ve analiz nesnelerini değiştirmez", () => {
      const analyses = [
        createAnalysis({
          intent: "  COMPARISON ",
          brandMentioned: true,
          brandRank: 2,
        }),
        createAnalysis({
          intent: null,
          brandMentioned: false,
        }),
      ];
      const snapshot = structuredClone(analyses);

      buildIntentPerformance(analyses);

      expect(analyses).toEqual(snapshot);
    });
  });
});