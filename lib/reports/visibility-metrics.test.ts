import { describe, expect, it } from "vitest";
import {
  buildVisibilityMetrics,
  prepareCompletedUniqueRuns,
  type VisibilityCompetitorInput,
} from "./visibility-metrics";

type TestRun = {
  id: string;
  promptText: string | null | undefined;
  runStatus: string | null | undefined;
  runCreatedAt: string | null | undefined;
  brandMentioned: boolean;
  brandRank: number | null;
  competitors: VisibilityCompetitorInput[];
};

function createRun(overrides: Partial<TestRun> = {}): TestRun {
  return {
    id: "run-1",
    promptText: "Hangi çözüm sağlayıcıları öne çıkıyor?",
    runStatus: "completed",
    runCreatedAt: "2026-07-29T10:00:00.000Z",
    brandMentioned: false,
    brandRank: null,
    competitors: [],
    ...overrides,
  };
}

describe("prepareCompletedUniqueRuns", () => {
  it("boş girişte boş liste döndürür", () => {
    expect(prepareCompletedUniqueRuns([])).toEqual([]);
  });

  it("tamamlanan ve anlamlı sorusu bulunan kaydı korur", () => {
    const run = createRun();

    expect(prepareCompletedUniqueRuns([run])).toEqual([run]);
  });

  it.each([
    "pending",
    "running",
    "failed",
    "cancelled",
    "skipped",
    "",
    null,
    undefined,
  ])("%s durumundaki kaydı rapora almaz", (runStatus) => {
    expect(
      prepareCompletedUniqueRuns([
        createRun({ runStatus }),
      ])
    ).toEqual([]);
  });

  it("completed durumundaki harf ve dış boşluk farklarını tolere eder", () => {
    const run = createRun({ runStatus: "  Completed  " });

    expect(prepareCompletedUniqueRuns([run])).toEqual([run]);
  });

  it.each(["", "   ", "\n\t"])(
    "boş veya yalnızca boşluk içeren soru metnini atar: %j",
    (promptText) => {
      expect(
        prepareCompletedUniqueRuns([
          createRun({ promptText }),
        ])
      ).toEqual([]);
    }
  );

  it.each([null, undefined])(
    "null veya undefined soru metnini güvenle atar: %s",
    (promptText) => {
      expect(
        prepareCompletedUniqueRuns([
          createRun({ promptText }),
        ])
      ).toEqual([]);
    }
  );

  it("aynı sorunun büyük-küçük harf ve fazla boşluk varyasyonlarını tekilleştirir", () => {
    const first = createRun({
      id: "first",
      promptText:
        "Türkiye'de   güvenilir  sağlayıcılar hangileridir?",
    });
    const duplicate = createRun({
      id: "duplicate",
      promptText:
        "  TÜRKİYE'DE güvenilir sağlayıcılar hangileridir?  ",
      runCreatedAt: "2026-07-29T09:00:00.000Z",
    });

    expect(
      prepareCompletedUniqueRuns([first, duplicate]).map(
        (run) => run.id
      )
    ).toEqual(["first"]);
  });

  it("Unicode olarak eşdeğer soru metinlerini tekilleştirir", () => {
    const composed = createRun({
      id: "composed",
      promptText: "Ölçüm çözümü önerir misin?",
    });
    const decomposed = createRun({
      id: "decomposed",
      promptText: "O\u0308lc\u0327u\u0308m çözümü önerir misin?",
      runCreatedAt: "2026-07-29T09:00:00.000Z",
    });

    expect(
      prepareCompletedUniqueRuns([composed, decomposed])
    ).toHaveLength(1);
  });

  it("aynı sorunun en yeni tamamlanan kaydını seçer", () => {
    const oldRun = createRun({
      id: "old",
      brandMentioned: true,
      runCreatedAt: "2026-07-29T09:00:00.000Z",
    });
    const newRun = createRun({
      id: "new",
      brandMentioned: false,
      runCreatedAt: "2026-07-29T11:00:00.000Z",
    });

    expect(
      prepareCompletedUniqueRuns([oldRun, newRun]).map(
        (run) => run.id
      )
    ).toEqual(["new"]);
  });

  it("markanın göründüğü kaydı seçerek sonucu yapay biçimde yükseltmez", () => {
    const visibleOldRun = createRun({
      id: "visible-old",
      brandMentioned: true,
      runCreatedAt: "2026-07-29T09:00:00.000Z",
    });
    const hiddenNewRun = createRun({
      id: "hidden-new",
      brandMentioned: false,
      runCreatedAt: "2026-07-29T11:00:00.000Z",
    });

    expect(
      prepareCompletedUniqueRuns([
        visibleOldRun,
        hiddenNewRun,
      ])[0]?.brandMentioned
    ).toBe(false);
  });

  it("geçerli tarihli tekrar kaydını geçersiz tarihli kayda tercih eder", () => {
    const invalidDate = createRun({
      id: "invalid",
      runCreatedAt: "geçersiz-tarih",
    });
    const validDate = createRun({
      id: "valid",
      runCreatedAt: "2026-07-29T11:00:00.000Z",
    });

    expect(
      prepareCompletedUniqueRuns([invalidDate, validDate])[0]
        ?.id
    ).toBe("valid");
  });

  it("iki tarih de geçersizse ilk kaydı deterministik biçimde korur", () => {
    const first = createRun({
      id: "first",
      runCreatedAt: null,
    });
    const second = createRun({
      id: "second",
      runCreatedAt: "geçersiz",
    });

    expect(
      prepareCompletedUniqueRuns([first, second])[0]?.id
    ).toBe("first");
  });

  it.each([
    "bozuk-1",
    "bozuk-2",
    "2",
    "March 4, 2026",
    "2026-02-30T10:00:00.000Z",
    "2026-07-29T10:00:00",
  ])(
    "Date.parse tarafından gevşek yorumlanabilen geçersiz tarihi reddeder: %s",
    (runCreatedAt) => {
      const first = createRun({
        id: "first",
        runCreatedAt: null,
      });
      const invalidDuplicate = createRun({
        id: "invalid-duplicate",
        runCreatedAt,
      });

      expect(
        prepareCompletedUniqueRuns([
          first,
          invalidDuplicate,
        ])[0]?.id
      ).toBe("first");
    }
  );

  it("Supabase'in boşluklu ve saat dilimi kısa ISO tarihini kabul eder", () => {
    const oldRun = createRun({
      id: "old",
      runCreatedAt: "2026-07-28 19:42:23.117412+00",
    });
    const newRun = createRun({
      id: "new",
      runCreatedAt: "2026-07-28 19:42:23.117413+00",
    });

    expect(
      prepareCompletedUniqueRuns([oldRun, newRun])[0]?.id
    ).toBe("new");
  });

  it("aynı milisaniyedeki mikrosaniye farkını kaybetmez", () => {
    const oldRun = createRun({
      id: "old",
      runCreatedAt: "2026-07-29T10:00:00.123456Z",
    });
    const newRun = createRun({
      id: "new",
      runCreatedAt: "2026-07-29T10:00:00.123457Z",
    });

    expect(
      prepareCompletedUniqueRuns([oldRun, newRun])[0]?.id
    ).toBe("new");
  });

  it("iki farklı saat dilimindeki eşit anlarda ilk kaydı korur", () => {
    const first = createRun({
      id: "first",
      runCreatedAt: "2026-07-29T10:00:00.000Z",
    });
    const sameInstant = createRun({
      id: "same-instant",
      runCreatedAt: "2026-07-29T13:00:00.000+03:00",
    });

    expect(
      prepareCompletedUniqueRuns([first, sameInstant])[0]?.id
    ).toBe("first");
  });

  it("iki eşit ISO zaman damgasında ilk kaydı deterministik biçimde korur", () => {
    const first = createRun({
      id: "first",
      runCreatedAt: "2026-07-29T10:00:00.000Z",
    });
    const second = createRun({
      id: "second",
      runCreatedAt: "2026-07-29T10:00:00.000Z",
    });

    expect(
      prepareCompletedUniqueRuns([first, second])[0]?.id
    ).toBe("first");
  });

  it("seçilen kayıt yenilense bile soruların ilk görülme sırasını korur", () => {
    const firstQuestionOld = createRun({
      id: "first-old",
      promptText: "Birinci soru?",
      runCreatedAt: "2026-07-29T08:00:00.000Z",
    });
    const secondQuestion = createRun({
      id: "second",
      promptText: "İkinci soru?",
    });
    const firstQuestionNew = createRun({
      id: "first-new",
      promptText: "BİRİNCİ SORU?",
      runCreatedAt: "2026-07-29T12:00:00.000Z",
    });

    expect(
      prepareCompletedUniqueRuns([
        firstQuestionOld,
        secondQuestion,
        firstQuestionNew,
      ]).map((run) => run.id)
    ).toEqual(["first-new", "second"]);
  });

  it("yalnızca benzer olan fakat aynı olmayan iki soruyu birleştirmez", () => {
    const first = createRun({
      id: "first",
      promptText: "En iyi kalibrasyon firmaları hangileri?",
    });
    const second = createRun({
      id: "second",
      promptText:
        "En iyi sıcaklık kalibrasyon firmaları hangileri?",
    });

    expect(
      prepareCompletedUniqueRuns([first, second])
    ).toHaveLength(2);
  });

  it("girdi dizisini değiştirmez", () => {
    const runs = [
      createRun({ id: "first" }),
      createRun({
        id: "second",
        promptText: "İkinci soru?",
      }),
    ];
    const snapshot = structuredClone(runs);

    prepareCompletedUniqueRuns(runs);

    expect(runs).toEqual(snapshot);
  });
});

describe("buildVisibilityMetrics", () => {
  it("boş ölçüm seti için güvenli sıfır değerleri döndürür", () => {
    expect(buildVisibilityMetrics([])).toEqual({
      promptCount: 0,
      visibleRuns: [],
      visibleCount: 0,
      visibilityScore: 0,
      competitorMentionCount: 0,
      totalMentions: 0,
      shareOfVoice: 0,
      averageRank: null,
      competitorStats: [],
    });
  });

  it("görünürlük oranını en yakın tam sayıya yuvarlar", () => {
    const runs = [
      createRun({ id: "one", brandMentioned: true }),
      createRun({ id: "two", brandMentioned: true }),
      createRun({ id: "three", brandMentioned: false }),
    ];

    const result = buildVisibilityMetrics(runs);

    expect(result.promptCount).toBe(3);
    expect(result.visibleCount).toBe(2);
    expect(result.visibilityScore).toBe(67);
  });

  it("görünmeyen markanın sıra değerini ortalamaya katmaz", () => {
    const result = buildVisibilityMetrics([
      createRun({
        brandMentioned: false,
        brandRank: 1,
      }),
      createRun({
        id: "visible",
        brandMentioned: true,
        brandRank: 3,
      }),
    ]);

    expect(result.averageRank).toBe(3);
  });

  it.each([
    0,
    -1,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ])("geçersiz marka sırasını ortalamaya katmaz: %s", (brandRank) => {
    const result = buildVisibilityMetrics([
      createRun({
        brandMentioned: true,
        brandRank,
      }),
    ]);

    expect(result.averageRank).toBeNull();
  });

  it("geçerli marka sıralarının ortalamasını bir ondalığa yuvarlar", () => {
    const result = buildVisibilityMetrics([
      createRun({
        brandMentioned: true,
        brandRank: 1,
      }),
      createRun({
        id: "two",
        brandMentioned: true,
        brandRank: 2,
      }),
      createRun({
        id: "three",
        brandMentioned: true,
        brandRank: 2,
      }),
    ]);

    expect(result.averageRank).toBe(1.7);
  });

  it("görünürlük payını marka ve rakip görünüm toplamından hesaplar", () => {
    const result = buildVisibilityMetrics([
      createRun({
        id: "one",
        brandMentioned: true,
        competitors: [
          { name: "Rakip A", mentioned: true, rank: 2 },
          { name: "Rakip B", mentioned: true, rank: 3 },
        ],
      }),
      createRun({
        id: "two",
        brandMentioned: true,
        competitors: [
          { name: "Rakip A", mentioned: true, rank: 1 },
        ],
      }),
    ]);

    expect(result.visibleCount).toBe(2);
    expect(result.competitorMentionCount).toBe(3);
    expect(result.totalMentions).toBe(5);
    expect(result.shareOfVoice).toBe(40);
  });

  it("aynı rakibin tek cevap içindeki tekrarlarını bir kez sayar", () => {
    const result = buildVisibilityMetrics([
      createRun({
        competitors: [
          { name: "Penta Otomasyon", mentioned: true, rank: 4 },
          { name: "  PENTA   OTOMASYON ", mentioned: true, rank: 2 },
        ],
      }),
    ]);

    expect(result.competitorMentionCount).toBe(1);
    expect(result.competitorStats).toEqual([
      {
        name: "Penta Otomasyon",
        mentionCount: 1,
        averageRank: 2,
      },
    ]);
  });

  it("aynı rakibin farklı cevaplarda görünmesini ayrı görünüm olarak sayar", () => {
    const result = buildVisibilityMetrics([
      createRun({
        competitors: [
          { name: "Rakip A", mentioned: true, rank: 2 },
        ],
      }),
      createRun({
        id: "two",
        competitors: [
          { name: "rakip a", mentioned: true, rank: 3 },
        ],
      }),
    ]);

    expect(result.competitorMentionCount).toBe(2);
    expect(result.competitorStats[0]).toEqual({
      name: "Rakip A",
      mentionCount: 2,
      averageRank: 2.5,
    });
  });

  it("mentioned false olan rakibi saymaz", () => {
    const result = buildVisibilityMetrics([
      createRun({
        competitors: [
          { name: "Rakip A", mentioned: false, rank: 1 },
        ],
      }),
    ]);

    expect(result.competitorMentionCount).toBe(0);
    expect(result.competitorStats).toEqual([]);
  });

  it.each(["", "   ", "\n\t"])(
    "adı boş olan rakibi saymaz: %j",
    (name) => {
      const result = buildVisibilityMetrics([
        createRun({
          competitors: [
            { name, mentioned: true, rank: 1 },
          ],
        }),
      ]);

      expect(result.competitorMentionCount).toBe(0);
    }
  );

  it("rakip sıralamasında yalnızca pozitif tam sayıları kullanır", () => {
    const result = buildVisibilityMetrics([
      createRun({
        id: "one",
        competitors: [
          { name: "Rakip A", mentioned: true, rank: 2 },
          { name: "Rakip B", mentioned: true, rank: 0 },
          { name: "Rakip C", mentioned: true, rank: 1.5 },
        ],
      }),
    ]);

    expect(result.competitorStats).toEqual([
      {
        name: "Rakip A",
        mentionCount: 1,
        averageRank: 2,
      },
      {
        name: "Rakip B",
        mentionCount: 1,
        averageRank: null,
      },
      {
        name: "Rakip C",
        mentionCount: 1,
        averageRank: null,
      },
    ]);
  });

  it("rakipleri önce görünüm sayısına sonra iyi ortalama sıraya göre sıralar", () => {
    const result = buildVisibilityMetrics([
      createRun({
        id: "one",
        competitors: [
          { name: "Az Görünen", mentioned: true, rank: 1 },
          { name: "Sık ve Geride", mentioned: true, rank: 4 },
          { name: "Sık ve Önde", mentioned: true, rank: 2 },
        ],
      }),
      createRun({
        id: "two",
        competitors: [
          { name: "Sık ve Geride", mentioned: true, rank: 4 },
          { name: "Sık ve Önde", mentioned: true, rank: 2 },
        ],
      }),
    ]);

    expect(
      result.competitorStats.map((competitor) => competitor.name)
    ).toEqual(["Sık ve Önde", "Sık ve Geride", "Az Görünen"]);
  });

  it("marka ve rakip hiç görünmediyse görünürlük payını sıfır döndürür", () => {
    const result = buildVisibilityMetrics([
      createRun(),
      createRun({ id: "two" }),
    ]);

    expect(result.totalMentions).toBe(0);
    expect(result.shareOfVoice).toBe(0);
  });

  it("girdi kayıtlarını ve rakip dizilerini değiştirmez", () => {
    const runs = [
      createRun({
        competitors: [
          { name: "Rakip A", mentioned: true, rank: 2 },
          { name: "rakip a", mentioned: true, rank: 1 },
        ],
      }),
    ];
    const snapshot = structuredClone(runs);

    buildVisibilityMetrics(runs);

    expect(runs).toEqual(snapshot);
  });
});