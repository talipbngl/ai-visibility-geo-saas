import { describe, expect, it } from "vitest";

import {
  buildAuditScoreCalculation,
  type AuditScoreCalculationRun,
} from "./audit-score-calculation";
import { buildVisibilityMetrics } from "./visibility-metrics";

function createRun(
  overrides: Partial<AuditScoreCalculationRun> = {}
): AuditScoreCalculationRun {
  return {
    id: "run-1",
    promptText:
      "Türkiye'de öne çıkan çözüm sağlayıcıları hangileridir?",
    runStatus: "completed",
    runCreatedAt: "2026-07-29T10:00:00.000Z",
    isSeededPrompt: false,
    brandMentioned: false,
    brandRank: null,
    brandSentiment: null,
    competitors: [],
    ...overrides,
  };
}

function createCompetitor(
  name: string,
  overrides: Partial<
    AuditScoreCalculationRun["competitors"][number]
  > = {}
) {
  return {
    name,
    mentioned: true,
    rank: 1,
    ...overrides,
  };
}

describe("buildAuditScoreCalculation", () => {
  describe("boş ve ölçülemeyen girdiler", () => {
    it("boş dizide güvenli sıfır skorları üretir", () => {
      const result = buildAuditScoreCalculation([]);

      expect(result).toMatchObject({
        inputRunCount: 0,
        uniqueCompletedRunCount: 0,
        excludedRunCount: 0,
        discoveryPromptCount: 0,
        seededPromptCount: 0,
        hasDiscoveryMeasurement: false,
        brandMentionCount: 0,
        competitorMentionCount: 0,
        visibilityScore: 0,
        shareOfVoice: 0,
        averageRank: null,
        positiveMentionCount: 0,
        positiveSentimentRate: 0,
        competitorOnlyOpportunityCount: 0,
        competitorGapScore: 0,
        opportunityScore: 0,
      });
      expect(result.uniqueCompletedRuns).toEqual([]);
      expect(result.discoveryRuns).toEqual([]);
      expect(result.seededRuns).toEqual([]);
    });

    it.each([
      null,
      undefined,
      "",
      "   ",
      "\n\t",
    ])(
      "boş soru metnini ölçüme dahil etmez: %j",
      (promptText) => {
        const result = buildAuditScoreCalculation([
          createRun({
            promptText:
              promptText as unknown as string,
          }),
        ]);

        expect(result.uniqueCompletedRunCount).toBe(0);
        expect(result.discoveryPromptCount).toBe(0);
        expect(result.excludedRunCount).toBe(1);
      }
    );

    it.each([
      null,
      undefined,
      "",
      "pending",
      "running",
      "failed",
      "cancelled",
      "complete",
    ])(
      "tamamlanmamış durumu ölçüme dahil etmez: %j",
      (runStatus) => {
        const result = buildAuditScoreCalculation([
          createRun({ runStatus }),
        ]);

        expect(result.uniqueCompletedRunCount).toBe(0);
        expect(result.discoveryPromptCount).toBe(0);
      }
    );

    it("completed durumundaki baş-son boşluklarını ve harf farkını kabul eder", () => {
      const result = buildAuditScoreCalculation([
        createRun({ runStatus: "  COMPLETED  " }),
      ]);

      expect(result.uniqueCompletedRunCount).toBe(1);
      expect(result.discoveryPromptCount).toBe(1);
    });
  });

  describe("mükerrer deneme ve yeniden çalıştırmalar", () => {
    it("aynı sorunun iki sonucunu bir kez sayar", () => {
      const result = buildAuditScoreCalculation([
        createRun({
          id: "old",
          brandMentioned: false,
        }),
        createRun({
          id: "new",
          brandMentioned: true,
          brandRank: 1,
        }),
      ]);

      expect(result.inputRunCount).toBe(2);
      expect(result.uniqueCompletedRunCount).toBe(1);
      expect(result.excludedRunCount).toBe(1);
      expect(result.discoveryPromptCount).toBe(1);
    });

    it("aynı soruda daha yeni tarihli sonucu seçer", () => {
      const result = buildAuditScoreCalculation([
        createRun({
          id: "old",
          runCreatedAt:
            "2026-07-29T10:00:00.000Z",
          brandMentioned: false,
        }),
        createRun({
          id: "new",
          runCreatedAt:
            "2026-07-29T11:00:00.000Z",
          brandMentioned: true,
          brandRank: 1,
        }),
      ]);

      expect(result.discoveryRuns[0]?.id).toBe("new");
      expect(result.visibilityScore).toBe(100);
    });

    it("daha eski kayıt sonradan gelse bile yeni sonucu korur", () => {
      const result = buildAuditScoreCalculation([
        createRun({
          id: "new",
          runCreatedAt:
            "2026-07-29T11:00:00.000Z",
          brandMentioned: true,
          brandRank: 1,
        }),
        createRun({
          id: "old",
          runCreatedAt:
            "2026-07-29T10:00:00.000Z",
          brandMentioned: false,
        }),
      ]);

      expect(result.discoveryRuns[0]?.id).toBe("new");
      expect(result.visibilityScore).toBe(100);
    });

    it("geçersiz tarihli tekrarın geçerli yeni kaydı ezmesine izin vermez", () => {
      const result = buildAuditScoreCalculation([
        createRun({
          id: "valid",
          runCreatedAt:
            "2026-07-29T11:00:00.000Z",
          brandMentioned: true,
          brandRank: 1,
        }),
        createRun({
          id: "invalid",
          runCreatedAt: "geçersiz",
          brandMentioned: false,
        }),
      ]);

      expect(result.discoveryRuns[0]?.id).toBe(
        "valid"
      );
      expect(result.visibilityScore).toBe(100);
    });

    it("iki geçersiz tarihli tekrarda ilk kaydı deterministik biçimde korur", () => {
      const result = buildAuditScoreCalculation([
        createRun({
          id: "first",
          runCreatedAt: "bozuk-1",
          brandMentioned: false,
        }),
        createRun({
          id: "second",
          runCreatedAt: "bozuk-2",
          brandMentioned: true,
          brandRank: 1,
        }),
      ]);

      expect(result.discoveryRuns[0]?.id).toBe(
        "first"
      );
      expect(result.visibilityScore).toBe(0);
    });

    it("Türkçe harf, Unicode ve boşluk farkı olan tekrarları birleştirir", () => {
      const result = buildAuditScoreCalculation([
        createRun({
          id: "first",
          promptText:
            "  Ölçüm   çözümü önerir misin? ",
        }),
        createRun({
          id: "second",
          promptText:
            "O\u0308LC\u0327U\u0308M ÇÖZÜMÜ ÖNERİR MİSİN?",
        }),
      ]);

      expect(result.uniqueCompletedRunCount).toBe(1);
      expect(result.excludedRunCount).toBe(1);
    });

    it("gerçekten farklı soruları yanlışlıkla birleştirmez", () => {
      const result = buildAuditScoreCalculation([
        createRun({
          id: "general",
          promptText:
            "Kalibrasyon firmaları hangileridir?",
        }),
        createRun({
          id: "temperature",
          promptText:
            "Sıcaklık kalibrasyon firmaları hangileridir?",
        }),
      ]);

      expect(result.uniqueCompletedRunCount).toBe(2);
      expect(result.discoveryPromptCount).toBe(2);
    });
  });

  describe("isim içeren kontrol sorularının ayrılması", () => {
    it("yalnızca kontrol sorusu varsa doğal görünürlük skoru üretmez", () => {
      const result = buildAuditScoreCalculation([
        createRun({
          isSeededPrompt: true,
          brandMentioned: true,
          brandRank: 1,
          brandSentiment: "positive",
        }),
      ]);

      expect(result.uniqueCompletedRunCount).toBe(1);
      expect(result.seededPromptCount).toBe(1);
      expect(result.discoveryPromptCount).toBe(0);
      expect(result.hasDiscoveryMeasurement).toBe(
        false
      );
      expect(result.visibilityScore).toBe(0);
      expect(result.positiveSentimentRate).toBe(0);
    });

    it("kontrol sorusunu benzersiz tamamlanan toplamında korur", () => {
      const result = buildAuditScoreCalculation([
        createRun({
          id: "seeded",
          promptText: "TKS Test güvenilir mi?",
          isSeededPrompt: true,
        }),
        createRun({
          id: "discovery",
          promptText:
            "Hangi kalibrasyon firmaları güvenilirdir?",
          isSeededPrompt: false,
        }),
      ]);

      expect(result.uniqueCompletedRunCount).toBe(2);
      expect(result.seededPromptCount).toBe(1);
      expect(result.discoveryPromptCount).toBe(1);
    });

    it("kontrol sorusundaki görünümü doğal görünürlük oranına katmaz", () => {
      const result = buildAuditScoreCalculation([
        createRun({
          id: "seeded",
          promptText: "TKS Test güvenilir mi?",
          isSeededPrompt: true,
          brandMentioned: true,
          brandRank: 1,
        }),
        createRun({
          id: "discovery",
          promptText:
            "Hangi kalibrasyon firmaları güvenilirdir?",
          isSeededPrompt: false,
          brandMentioned: false,
        }),
      ]);

      expect(result.brandMentionCount).toBe(0);
      expect(result.visibilityScore).toBe(0);
    });

    it("kontrol sorusundaki rakip görünümünü görünürlük payına katmaz", () => {
      const result = buildAuditScoreCalculation([
        createRun({
          id: "seeded",
          isSeededPrompt: true,
          competitors: [createCompetitor("Rakip")],
        }),
        createRun({
          id: "discovery",
          promptText: "Tarafsız soru",
          isSeededPrompt: false,
          brandMentioned: true,
          brandRank: 1,
        }),
      ]);

      expect(result.competitorMentionCount).toBe(0);
      expect(result.shareOfVoice).toBe(100);
    });
  });

  describe("görünürlük, pay ve sıra hesapları", () => {
    it("bir görünüm ve bir görünmeme için yüzde 50 görünürlük hesaplar", () => {
      const result = buildAuditScoreCalculation([
        createRun({
          id: "visible",
          promptText: "Soru 1",
          brandMentioned: true,
          brandRank: 2,
        }),
        createRun({
          id: "hidden",
          promptText: "Soru 2",
          brandMentioned: false,
        }),
      ]);

      expect(result.brandMentionCount).toBe(1);
      expect(result.discoveryPromptCount).toBe(2);
      expect(result.visibilityScore).toBe(50);
    });

    it("bir görünüm ve iki görünmeme için yüzde 33 hesaplar", () => {
      const result = buildAuditScoreCalculation([
        createRun({
          id: "one",
          promptText: "Soru 1",
          brandMentioned: true,
          brandRank: 1,
        }),
        createRun({
          id: "two",
          promptText: "Soru 2",
        }),
        createRun({
          id: "three",
          promptText: "Soru 3",
        }),
      ]);

      expect(result.visibilityScore).toBe(33);
    });

    it("marka ve bir rakip görünümünde yüzde 50 pay hesaplar", () => {
      const result = buildAuditScoreCalculation([
        createRun({
          brandMentioned: true,
          brandRank: 1,
          competitors: [
            createCompetitor("Rakip", { rank: 2 }),
          ],
        }),
      ]);

      expect(result.brandMentionCount).toBe(1);
      expect(result.competitorMentionCount).toBe(1);
      expect(result.shareOfVoice).toBe(50);
    });

    it("aynı rakibin mükerrer kaydını bir cevapta bir kez sayar", () => {
      const result = buildAuditScoreCalculation([
        createRun({
          brandMentioned: true,
          brandRank: 1,
          competitors: [
            createCompetitor("Federal"),
            createCompetitor(" FEDERAL "),
          ],
        }),
      ]);

      expect(result.competitorMentionCount).toBe(1);
      expect(result.shareOfVoice).toBe(50);
    });

    it("farklı rakipleri görünürlük payında ayrı sayar", () => {
      const result = buildAuditScoreCalculation([
        createRun({
          brandMentioned: true,
          brandRank: 1,
          competitors: [
            createCompetitor("Rakip A"),
            createCompetitor("Rakip B"),
          ],
        }),
      ]);

      expect(result.competitorMentionCount).toBe(2);
      expect(result.shareOfVoice).toBe(33);
    });

    it("geçerli marka sıralarının ortalamasını hesaplar", () => {
      const result = buildAuditScoreCalculation([
        createRun({
          id: "one",
          promptText: "Soru 1",
          brandMentioned: true,
          brandRank: 1,
        }),
        createRun({
          id: "two",
          promptText: "Soru 2",
          brandMentioned: true,
          brandRank: 4,
        }),
      ]);

      expect(result.averageRank).toBe(2.5);
    });

    it.each([
      0,
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ])("geçersiz marka sırasını reddeder: %s", (brandRank) => {
      const result = buildAuditScoreCalculation([
        createRun({
          brandMentioned: true,
          brandRank,
        }),
      ]);

      expect(result.averageRank).toBeNull();
    });

    it("marka görünmüyorsa yanlışlıkla gelen sırayı ortalamaya katmaz", () => {
      const result = buildAuditScoreCalculation([
        createRun({
          brandMentioned: false,
          brandRank: 1,
        }),
      ]);

      expect(result.averageRank).toBeNull();
    });

    it("marka ve rakip hiç görünmediyse görünürlük payını sıfır bırakır", () => {
      const result = buildAuditScoreCalculation([
        createRun(),
      ]);

      expect(result.shareOfVoice).toBe(0);
    });
  });

  describe("olumlu ton hesabı", () => {
    it("iki görünümün biri olumluysa yüzde 50 hesaplar", () => {
      const result = buildAuditScoreCalculation([
        createRun({
          id: "positive",
          promptText: "Soru 1",
          brandMentioned: true,
          brandRank: 1,
          brandSentiment: "positive",
        }),
        createRun({
          id: "neutral",
          promptText: "Soru 2",
          brandMentioned: true,
          brandRank: 2,
          brandSentiment: "neutral",
        }),
      ]);

      expect(result.positiveMentionCount).toBe(1);
      expect(result.positiveSentimentRate).toBe(50);
    });

    it("positive değerindeki boşluk ve harf farkını kabul eder", () => {
      const result = buildAuditScoreCalculation([
        createRun({
          brandMentioned: true,
          brandRank: 1,
          brandSentiment: "  POSITIVE  ",
        }),
      ]);

      expect(result.positiveSentimentRate).toBe(100);
    });

    it.each([
      null,
      undefined,
      "",
      "neutral",
      "negative",
      "olumlu",
      "positively",
    ])(
      "pozitif olmayan tonu olumlu saymaz: %j",
      (brandSentiment) => {
        const result = buildAuditScoreCalculation([
          createRun({
            brandMentioned: true,
            brandRank: 1,
            brandSentiment,
          }),
        ]);

        expect(result.positiveMentionCount).toBe(0);
        expect(result.positiveSentimentRate).toBe(0);
      }
    );

    it("marka görünmüyorsa hatalı positive tonunu saymaz", () => {
      const result = buildAuditScoreCalculation([
        createRun({
          brandMentioned: false,
          brandSentiment: "positive",
        }),
      ]);

      expect(result.positiveMentionCount).toBe(0);
      expect(result.positiveSentimentRate).toBe(0);
    });
  });

  describe("rakip boşluğu ve fırsat hesabı", () => {
    it("marka görünmezken rakip görünürse yüzde 100 fırsat hesaplar", () => {
      const result = buildAuditScoreCalculation([
        createRun({
          competitors: [createCompetitor("Rakip")],
        }),
      ]);

      expect(
        result.competitorOnlyOpportunityCount
      ).toBe(1);
      expect(result.opportunityScore).toBe(100);
      expect(result.competitorGapScore).toBe(0);
    });

    it("marka ve rakip birlikte görünüyorsa rakip boşluğu saymaz", () => {
      const result = buildAuditScoreCalculation([
        createRun({
          brandMentioned: true,
          brandRank: 1,
          competitors: [createCompetitor("Rakip")],
        }),
      ]);

      expect(
        result.competitorOnlyOpportunityCount
      ).toBe(0);
      expect(result.opportunityScore).toBe(0);
      expect(result.competitorGapScore).toBe(100);
    });

    it("dört sorunun birindeki rakip boşluğunda yüzde 25 fırsat hesaplar", () => {
      const runs = Array.from(
        { length: 4 },
        (_, index) =>
          createRun({
            id: `run-${index}`,
            promptText: `Soru ${index}`,
            competitors:
              index === 0
                ? [createCompetitor("Rakip")]
                : [],
          })
      );
      const result = buildAuditScoreCalculation(runs);

      expect(result.opportunityScore).toBe(25);
      expect(result.competitorGapScore).toBe(75);
    });

    it("ölçülebilir keşif sorusu yoksa boşluk skorunu başarı gibi 100 yapmaz", () => {
      const result = buildAuditScoreCalculation([
        createRun({ isSeededPrompt: true }),
      ]);

      expect(result.opportunityScore).toBe(0);
      expect(result.competitorGapScore).toBe(0);
    });
  });

  describe("rapor metrikleriyle matematiksel tutarlılık", () => {
    it("aynı keşif koşularında görünürlük motoruyla aynı temel skorları üretir", () => {
      const runs = [
        createRun({
          id: "one",
          promptText: "Soru 1",
          brandMentioned: true,
          brandRank: 2,
          competitors: [
            createCompetitor("Rakip A", { rank: 1 }),
          ],
        }),
        createRun({
          id: "two",
          promptText: "Soru 2",
          competitors: [
            createCompetitor("Rakip B", { rank: 1 }),
          ],
        }),
        createRun({
          id: "three",
          promptText: "Soru 3",
          brandMentioned: true,
          brandRank: 1,
        }),
      ];

      const score = buildAuditScoreCalculation(runs);
      const report = buildVisibilityMetrics(
        score.discoveryRuns
      );

      expect(score.discoveryPromptCount).toBe(
        report.promptCount
      );
      expect(score.brandMentionCount).toBe(
        report.visibleCount
      );
      expect(score.competitorMentionCount).toBe(
        report.competitorMentionCount
      );
      expect(score.visibilityScore).toBe(
        report.visibilityScore
      );
      expect(score.shareOfVoice).toBe(
        report.shareOfVoice
      );
      expect(score.averageRank).toBe(
        report.averageRank
      );
    });

    it("mükerrer ve kontrol soruları karışıkken de rapor matematiğiyle aynı kalır", () => {
      const runs = [
        createRun({
          id: "old",
          promptText: "Ortak soru",
          runCreatedAt:
            "2026-07-29T09:00:00.000Z",
        }),
        createRun({
          id: "new",
          promptText: " ORTAK SORU ",
          runCreatedAt:
            "2026-07-29T10:00:00.000Z",
          brandMentioned: true,
          brandRank: 1,
        }),
        createRun({
          id: "seeded",
          promptText: "Marka iyi mi?",
          isSeededPrompt: true,
          brandMentioned: true,
          brandRank: 1,
        }),
      ];

      const score = buildAuditScoreCalculation(runs);
      const report = buildVisibilityMetrics(
        score.discoveryRuns
      );

      expect(score.uniqueCompletedRunCount).toBe(2);
      expect(score.discoveryPromptCount).toBe(1);
      expect(score.seededPromptCount).toBe(1);
      expect(score.visibilityScore).toBe(
        report.visibilityScore
      );
      expect(score.visibilityScore).toBe(100);
    });
  });

  describe("sektör bağımsızlığı ve dayanıklılık", () => {
    it.each([
      "Hangi e-ticaret altyapıları KOBİ'ler için uygundur?",
      "Hangi CRM yazılımları satış ekipleri için uygundur?",
      "İstanbul'daki güvenilir diş klinikleri hangileridir?",
      "Hangi kestirimci bakım firmaları öne çıkıyor?",
      "Hangi kalibrasyon cihazları tercih edilmelidir?",
      "Aileler için uygun oteller hangileridir?",
      "Hangi lojistik sağlayıcıları güvenilirdir?",
      "KOBİ kredisi sunan bankalar hangileridir?",
    ])(
      "sektörden bağımsız keşif sorusunu ölçer: %s",
      (promptText) => {
        const result = buildAuditScoreCalculation([
          createRun({
            promptText,
            brandMentioned: true,
            brandRank: 1,
          }),
        ]);

        expect(result.discoveryPromptCount).toBe(1);
        expect(result.visibilityScore).toBe(100);
      }
    );

    it("bin benzersiz soruda oranları doğru hesaplar", () => {
      const runs = Array.from(
        { length: 1000 },
        (_, index) =>
          createRun({
            id: `run-${index}`,
            promptText: `Karar sorusu ${index}`,
            runCreatedAt: new Date(
              Date.UTC(2026, 6, 29, 10, 0, index)
            ).toISOString(),
            brandMentioned: index % 2 === 0,
            brandRank:
              index % 2 === 0 ? 1 : null,
            brandSentiment:
              index % 4 === 0
                ? "positive"
                : "neutral",
          })
      );
      const result = buildAuditScoreCalculation(runs);

      expect(result.uniqueCompletedRunCount).toBe(
        1000
      );
      expect(result.discoveryPromptCount).toBe(1000);
      expect(result.brandMentionCount).toBe(500);
      expect(result.visibilityScore).toBe(50);
      expect(result.positiveMentionCount).toBe(250);
      expect(result.positiveSentimentRate).toBe(50);
    });

    it("girdi dizisini ve koşu nesnelerini değiştirmez", () => {
      const runs = [
        createRun({
          competitors: [
            createCompetitor("Rakip", {
              rank: 2,
            }),
          ],
        }),
      ];
      const snapshot = structuredClone(runs);

      buildAuditScoreCalculation(runs);

      expect(runs).toEqual(snapshot);
    });
  });
});