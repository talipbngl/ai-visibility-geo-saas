import { describe, expect, it } from "vitest";

import {
  buildPromptVisibilityComparison,
  normalizePromptText,
  type PromptVisibilityInput,
} from "./prompt-comparison";

function createResult(
  overrides: Partial<PromptVisibilityInput> = {}
): PromptVisibilityInput {
  return {
    promptText: "Hangi çözüm sağlayıcıları öne çıkıyor?",
    mentioned: false,
    rank: null,
    ...overrides,
  };
}

describe("normalizePromptText", () => {
  it.each([null, undefined, "", "   ", "\n\t"])(
    "%j değerini boş anahtara dönüştürür",
    (value) => {
      expect(normalizePromptText(value)).toBe("");
    }
  );

  it("baş ve sondaki boşlukları kaldırır", () => {
    expect(
      normalizePromptText("  Hangi firma iyi?  ")
    ).toBe("hangi firma iyi?");
  });

  it("tekrarlı boşluk, satır sonu ve tab karakterlerini tek boşluğa indirir", () => {
    expect(
      normalizePromptText(
        "Hangi   firma\nteknik\t destek sunuyor?"
      )
    ).toBe("hangi firma teknik destek sunuyor?");
  });

  it("Türkçe büyük harfleri doğru küçültür", () => {
    expect(
      normalizePromptText(
        "İSTANBUL'DA ÇALIŞMAK İÇİN HANGİ KAFE?"
      )
    ).toBe(
      "istanbul'da çalışmak için hangi kafe?"
    );
  });

  it("Unicode olarak eşdeğer metinleri aynı anahtara dönüştürür", () => {
    expect(
      normalizePromptText("Ölçüm çözümü")
    ).toBe(
      normalizePromptText(
        "O\u0308lc\u0327u\u0308m çözümü"
      )
    );
  });
});

describe("buildPromptVisibilityComparison", () => {
  describe("boş ve bozuk girdiler", () => {
    it("iki taraf da boşsa güvenli boş sonuç döndürür", () => {
      expect(
        buildPromptVisibilityComparison([], [])
      ).toEqual({
        currentUniqueCount: 0,
        previousUniqueCount: 0,
        largestPromptSetSize: 0,
        comparablePromptCount: 0,
        coverageRate: 0,
        reliability: {
          level: "low",
          label: "Düşük",
        },
        comparableResults: [],
        gainedVisibility: [],
        lostVisibility: [],
        unchangedVisibility: [],
      });
    });

    it("boş soru metinlerini karşılaştırmaya almaz", () => {
      const result = buildPromptVisibilityComparison(
        [
          createResult({ promptText: "" }),
          createResult({ promptText: "   " }),
          createResult({ promptText: null }),
        ],
        [
          createResult({ promptText: "" }),
          createResult({ promptText: undefined }),
        ]
      );

      expect(result.currentUniqueCount).toBe(0);
      expect(result.previousUniqueCount).toBe(0);
      expect(result.comparablePromptCount).toBe(0);
    });

    it("yalnızca güncel sonuç varsa ortak soru üretmez", () => {
      const result = buildPromptVisibilityComparison(
        [createResult()],
        []
      );

      expect(result.currentUniqueCount).toBe(1);
      expect(result.previousUniqueCount).toBe(0);
      expect(result.comparableResults).toEqual([]);
    });

    it("yalnızca geçmiş sonuç varsa ortak soru üretmez", () => {
      const result = buildPromptVisibilityComparison(
        [],
        [createResult()]
      );

      expect(result.currentUniqueCount).toBe(0);
      expect(result.previousUniqueCount).toBe(1);
      expect(result.comparableResults).toEqual([]);
    });
  });

  describe("soru eşleştirme ve tekilleştirme", () => {
    it("aynı soru metnini eşleştirir", () => {
      const result = buildPromptVisibilityComparison(
        [createResult({ mentioned: true, rank: 2 })],
        [createResult({ mentioned: false })]
      );

      expect(result.comparablePromptCount).toBe(1);
      expect(result.gainedVisibility).toHaveLength(1);
    });

    it("Türkçe harf, büyük-küçük harf ve boşluk farklarını tolere eder", () => {
      const result = buildPromptVisibilityComparison(
        [
          createResult({
            promptText:
              "  İstanbul'da   çalışmak için hangi kafe? ",
            mentioned: true,
            rank: 1,
          }),
        ],
        [
          createResult({
            promptText:
              "İSTANBUL'DA ÇALIŞMAK İÇİN HANGİ KAFE?",
            mentioned: false,
          }),
        ]
      );

      expect(result.comparablePromptCount).toBe(1);
      expect(result.gainedVisibility).toHaveLength(1);
    });

    it("Unicode olarak eşdeğer soruları eşleştirir", () => {
      const result = buildPromptVisibilityComparison(
        [
          createResult({
            promptText: "Ölçüm çözümü önerir misin?",
          }),
        ],
        [
          createResult({
            promptText:
              "O\u0308lc\u0327u\u0308m çözümü önerir misin?",
          }),
        ]
      );

      expect(result.comparablePromptCount).toBe(1);
    });

    it("benzer fakat farklı soruları yanlışlıkla eşleştirmez", () => {
      const result = buildPromptVisibilityComparison(
        [
          createResult({
            promptText:
              "En iyi kalibrasyon firmaları hangileri?",
          }),
        ],
        [
          createResult({
            promptText:
              "En iyi sıcaklık kalibrasyon firmaları hangileri?",
          }),
        ]
      );

      expect(result.comparablePromptCount).toBe(0);
    });

    it("güncel ölçümdeki mükerrer soruyu bir kez sayar", () => {
      const result = buildPromptVisibilityComparison(
        [
          createResult({
            promptText: "Hangi firma iyi?",
            mentioned: false,
          }),
          createResult({
            promptText: " HANGİ FİRMA İYİ? ",
            mentioned: true,
            rank: 1,
          }),
        ],
        [
          createResult({
            promptText: "Hangi firma iyi?",
            mentioned: false,
          }),
        ]
      );

      expect(result.currentUniqueCount).toBe(1);
      expect(result.comparablePromptCount).toBe(1);
      expect(result.gainedVisibility).toHaveLength(0);
    });

    it("önceki ölçümdeki mükerrer soruyu bir kez sayar", () => {
      const result = buildPromptVisibilityComparison(
        [
          createResult({
            promptText: "Hangi firma iyi?",
            mentioned: true,
          }),
        ],
        [
          createResult({
            promptText: "Hangi firma iyi?",
            mentioned: false,
          }),
          createResult({
            promptText: " HANGİ FİRMA İYİ? ",
            mentioned: true,
          }),
        ]
      );

      expect(result.previousUniqueCount).toBe(1);
      expect(result.gainedVisibility).toHaveLength(1);
    });

    it("mükerrer sonuçlarda görünür olan kaydı özellikle seçerek metriği yükseltmez", () => {
      const result = buildPromptVisibilityComparison(
        [
          createResult({
            promptText: "Ortak soru?",
            mentioned: false,
          }),
          createResult({
            promptText: "ORTAK SORU?",
            mentioned: true,
            rank: 1,
          }),
        ],
        [
          createResult({
            promptText: "Ortak soru?",
            mentioned: false,
          }),
        ]
      );

      expect(
        result.comparableResults[0]?.currentMentioned
      ).toBe(false);
    });

    it("çıktıda güncel sorunun temizlenmiş yazımını korur", () => {
      const result = buildPromptVisibilityComparison(
        [
          createResult({
            promptText: "  Hangi   firma iyi? ",
          }),
        ],
        [
          createResult({
            promptText: "hangi firma iyi?",
          }),
        ]
      );

      expect(
        result.comparableResults[0]?.promptText
      ).toBe("Hangi firma iyi?");
    });
  });

  describe("görünürlük değişimleri", () => {
    it("önceden görünmeyip şimdi görünen soruyu kazanılan olarak işaretler", () => {
      const result = buildPromptVisibilityComparison(
        [createResult({ mentioned: true, rank: 2 })],
        [createResult({ mentioned: false })]
      );

      expect(result.gainedVisibility).toHaveLength(1);
      expect(result.lostVisibility).toHaveLength(0);
      expect(result.unchangedVisibility).toHaveLength(0);
    });

    it("önceden görünüp şimdi görünmeyen soruyu kaybedilen olarak işaretler", () => {
      const result = buildPromptVisibilityComparison(
        [createResult({ mentioned: false })],
        [createResult({ mentioned: true, rank: 2 })]
      );

      expect(result.gainedVisibility).toHaveLength(0);
      expect(result.lostVisibility).toHaveLength(1);
      expect(result.unchangedVisibility).toHaveLength(0);
    });

    it("iki ölçümde de görünen soruyu değişmedi olarak işaretler", () => {
      const result = buildPromptVisibilityComparison(
        [createResult({ mentioned: true, rank: 1 })],
        [createResult({ mentioned: true, rank: 3 })]
      );

      expect(result.unchangedVisibility).toHaveLength(1);
      expect(result.gainedVisibility).toHaveLength(0);
      expect(result.lostVisibility).toHaveLength(0);
    });

    it("iki ölçümde de görünmeyen soruyu değişmedi olarak işaretler", () => {
      const result = buildPromptVisibilityComparison(
        [createResult({ mentioned: false })],
        [createResult({ mentioned: false })]
      );

      expect(result.unchangedVisibility).toHaveLength(1);
    });

    it("kazanılan, kaybedilen ve değişmeyen soruları birlikte doğru ayırır", () => {
      const current = [
        createResult({
          promptText: "Kazanılan",
          mentioned: true,
        }),
        createResult({
          promptText: "Kaybedilen",
          mentioned: false,
        }),
        createResult({
          promptText: "Hâlâ görünür",
          mentioned: true,
        }),
        createResult({
          promptText: "Hâlâ görünmüyor",
          mentioned: false,
        }),
      ];
      const previous = [
        createResult({
          promptText: "Kazanılan",
          mentioned: false,
        }),
        createResult({
          promptText: "Kaybedilen",
          mentioned: true,
        }),
        createResult({
          promptText: "Hâlâ görünür",
          mentioned: true,
        }),
        createResult({
          promptText: "Hâlâ görünmüyor",
          mentioned: false,
        }),
      ];

      const result = buildPromptVisibilityComparison(
        current,
        previous
      );

      expect(result.comparablePromptCount).toBe(4);
      expect(result.gainedVisibility).toHaveLength(1);
      expect(result.lostVisibility).toHaveLength(1);
      expect(result.unchangedVisibility).toHaveLength(2);
    });
  });

  describe("sıra doğrulama", () => {
    it("geçerli güncel ve önceki sıraları korur", () => {
      const result = buildPromptVisibilityComparison(
        [createResult({ mentioned: true, rank: 1 })],
        [createResult({ mentioned: true, rank: 3 })]
      );

      expect(result.comparableResults[0]).toMatchObject({
        currentRank: 1,
        previousRank: 3,
      });
    });

    it.each([
      0,
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ])("geçersiz güncel sırayı reddeder: %s", (rank) => {
      const result = buildPromptVisibilityComparison(
        [createResult({ mentioned: true, rank })],
        [createResult({ mentioned: false })]
      );

      expect(
        result.comparableResults[0]?.currentRank
      ).toBeNull();
    });

    it.each([
      0,
      -1,
      2.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ])("geçersiz önceki sırayı reddeder: %s", (rank) => {
      const result = buildPromptVisibilityComparison(
        [createResult({ mentioned: false })],
        [createResult({ mentioned: true, rank })]
      );

      expect(
        result.comparableResults[0]?.previousRank
      ).toBeNull();
    });

    it("marka görünmüyorsa yanlışlıkla bulunan sırayı kaldırır", () => {
      const result = buildPromptVisibilityComparison(
        [
          createResult({
            mentioned: false,
            rank: 1,
          }),
        ],
        [
          createResult({
            mentioned: false,
            rank: 2,
          }),
        ]
      );

      expect(result.comparableResults[0]).toMatchObject({
        currentRank: null,
        previousRank: null,
      });
    });
  });

  describe("kapsam ve karşılaştırma güveni", () => {
    function createQuestionSet(
      count: number,
      prefix = "Soru"
    ) {
      return Array.from({ length: count }, (_, index) =>
        createResult({
          promptText: `${prefix} ${index + 1}`,
        })
      );
    }

    it("beş ortak soru ve yüzde 100 kapsamda yüksek güven verir", () => {
      const questions = createQuestionSet(5);
      const result = buildPromptVisibilityComparison(
        questions,
        questions
      );

      expect(result.coverageRate).toBe(100);
      expect(result.reliability).toEqual({
        level: "high",
        label: "Yüksek",
      });
    });

    it("beş ortak soru ve yüzde 80 kapsamda yüksek güven verir", () => {
      const current = createQuestionSet(5);
      const previous = [
        ...createQuestionSet(5),
        createResult({ promptText: "Eski özel soru" }),
      ];

      const result = buildPromptVisibilityComparison(
        current,
        previous
      );

      expect(result.coverageRate).toBe(83);
      expect(result.reliability.level).toBe("high");
    });

    it("beş ortak soru fakat yüzde 79 altında kapsamda yüksek güven vermez", () => {
      const current = createQuestionSet(5);
      const previous = [
        ...createQuestionSet(5),
        createResult({ promptText: "Eski 1" }),
        createResult({ promptText: "Eski 2" }),
      ];

      const result = buildPromptVisibilityComparison(
        current,
        previous
      );

      expect(result.coverageRate).toBe(71);
      expect(result.reliability.level).toBe("medium");
    });

    it("üç ortak soru ve yüzde 50 kapsamda orta güven verir", () => {
      const current = createQuestionSet(3);
      const previous = [
        ...createQuestionSet(3),
        createResult({ promptText: "Eski 1" }),
        createResult({ promptText: "Eski 2" }),
        createResult({ promptText: "Eski 3" }),
      ];

      const result = buildPromptVisibilityComparison(
        current,
        previous
      );

      expect(result.coverageRate).toBe(50);
      expect(result.reliability).toEqual({
        level: "medium",
        label: "Orta",
      });
    });

    it("üçten az ortak soruda kapsam yüzde 100 olsa bile düşük güven verir", () => {
      const questions = createQuestionSet(2);
      const result = buildPromptVisibilityComparison(
        questions,
        questions
      );

      expect(result.coverageRate).toBe(100);
      expect(result.reliability.level).toBe("low");
    });

    it("kapsam paydasında büyük olan benzersiz soru setini kullanır", () => {
      const current = createQuestionSet(4);
      const previous = [
        ...createQuestionSet(3),
        createResult({ promptText: "Eski özel 1" }),
        createResult({ promptText: "Eski özel 2" }),
      ];

      const result = buildPromptVisibilityComparison(
        current,
        previous
      );

      expect(result.currentUniqueCount).toBe(4);
      expect(result.previousUniqueCount).toBe(5);
      expect(result.comparablePromptCount).toBe(3);
      expect(result.largestPromptSetSize).toBe(5);
      expect(result.coverageRate).toBe(60);
    });
  });

  describe("sektör bağımsızlığı ve dayanıklılık", () => {
    it.each([
      "Hangi e-ticaret altyapıları KOBİ'ler için uygundur?",
      "Hangi CRM yazılımları satış ekipleri için uygundur?",
      "İstanbul'daki güvenilir diş klinikleri hangileridir?",
      "Hangi kestirimci bakım firmaları öne çıkıyor?",
      "Hangi yabancı dil kursları yetişkinlere uygundur?",
      "Aileler için uygun oteller hangileridir?",
      "Profesyonel fotoğraf makinelerinde hangi markalar iyi?",
      "KOBİ kredisi sunan güvenilir bankalar hangileridir?",
    ])(
      "sektörden bağımsız soru değişimini hesaplar: %s",
      (promptText) => {
        const result = buildPromptVisibilityComparison(
          [
            createResult({
              promptText,
              mentioned: true,
              rank: 2,
            }),
          ],
          [
            createResult({
              promptText,
              mentioned: false,
            }),
          ]
        );

        expect(result.comparablePromptCount).toBe(1);
        expect(result.gainedVisibility).toHaveLength(1);
      }
    );

    it("bin soruluk iki ölçümü doğru ve tekrarsız karşılaştırır", () => {
      const current = Array.from(
        { length: 1000 },
        (_, index) =>
          createResult({
            promptText: `Karar sorusu ${index}`,
            mentioned: index % 2 === 0,
            rank: index % 2 === 0 ? 1 : null,
          })
      );
      const previous = Array.from(
        { length: 1000 },
        (_, index) =>
          createResult({
            promptText: `KARAR SORUSU ${index}`,
            mentioned: index % 3 === 0,
            rank: index % 3 === 0 ? 2 : null,
          })
      );

      const result = buildPromptVisibilityComparison(
        current,
        previous
      );

      expect(result.comparablePromptCount).toBe(1000);
      expect(result.coverageRate).toBe(100);
      expect(result.reliability.level).toBe("high");
      expect(
        result.gainedVisibility.length +
          result.lostVisibility.length +
          result.unchangedVisibility.length
      ).toBe(1000);
    });

    it("girdi dizilerini ve nesnelerini değiştirmez", () => {
      const current = [
        createResult({
          promptText: "  Güncel   soru ",
          mentioned: true,
          rank: 2,
        }),
      ];
      const previous = [
        createResult({
          promptText: "GÜNCEL SORU",
          mentioned: false,
        }),
      ];
      const currentSnapshot = structuredClone(current);
      const previousSnapshot = structuredClone(previous);

      buildPromptVisibilityComparison(
        current,
        previous
      );

      expect(current).toEqual(currentSnapshot);
      expect(previous).toEqual(previousSnapshot);
    });
  });
});