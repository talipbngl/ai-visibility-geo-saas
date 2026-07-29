import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { EvidenceRecommendation } from "@/lib/recommendations/evidence-based-recommendations";

const {
  buildEvidenceBasedRecommendationsMock,
  createClientMock,
} = vi.hoisted(() => ({
  buildEvidenceBasedRecommendationsMock: vi.fn(),
  createClientMock: vi.fn(),
}));

vi.mock(
  "@/lib/recommendations/evidence-based-recommendations",
  () => ({
    buildEvidenceBasedRecommendations:
      buildEvidenceBasedRecommendationsMock,
  })
);

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

import { replaceAuditRecommendations } from "@/lib/recommendations/replace-audit-recommendations";

type QueryError = {
  message: string;
};

type QueryResult<T> = {
  data: T;
  error: QueryError | null;
};

type Scenario = {
  scoreResult: QueryResult<unknown>;
  analysesResult: QueryResult<unknown[] | null>;
  brandSnapshotsResult: QueryResult<unknown[] | null>;
  competitorSnapshotsResult: QueryResult<unknown[] | null>;
  rpcResult: QueryResult<unknown>;
  recommendations: EvidenceRecommendation[];
};

const defaultRecommendation: EvidenceRecommendation = {
  category: "content",
  title: "Karar içeriği hazırla",
  description:
    "Satın alma kararını destekleyen, kanıt ve uygulama ayrıntıları içeren içerik hazırla.",
  priority: "high",
  effort: "medium",
  impact: "high",
  status: "open",
};

function makeThenableBuilder<T>(result: QueryResult<T>) {
  const select = vi.fn();
  const eq = vi.fn();
  const order = vi.fn();
  const limit = vi.fn();
  const maybeSingle = vi.fn(() => Promise.resolve(result));
  const then = (
    onFulfilled?: (
      value: QueryResult<T>
    ) => unknown,
    onRejected?: (reason: unknown) => unknown
  ) =>
    Promise.resolve(result).then(
      onFulfilled,
      onRejected
    );

  const builder = {
    select,
    eq,
    order,
    limit,
    maybeSingle,
    then,
  };

  select.mockReturnValue(builder);
  eq.mockReturnValue(builder);
  order.mockReturnValue(builder);
  limit.mockImplementation(() => Promise.resolve(result));

  return builder;
}

function setupScenario(
  overrides: Partial<Scenario> = {}
) {
  const scenario: Scenario = {
    scoreResult: {
      data: {
        visibility_score: 42,
        share_of_voice: 30,
        average_rank: 2,
        positive_sentiment_rate: 80,
        opportunity_score: 58,
      },
      error: null,
    },
    analysesResult: {
      data: [
        {
          id: "analysis-1",
          audit_run_id: "run-1",
          brand_mentioned: true,
          brand_rank: 2,
          brand_sentiment: "positive",
          competitors_json: [],
          summary: "Ölçüm özeti",
          audit_runs: {
            id: "run-1",
            audit_id: "audit-1",
            prompt_text_snapshot: "Hangi çözüm öne çıkıyor?",
            prompt_intent_snapshot: "buying_intent",
          },
        },
      ],
      error: null,
    },
    brandSnapshotsResult: {
      data: [
        {
          id: "brand-snapshot-1",
          content_score: 57,
          service_signals_json: [],
          trust_signals_json: [],
          technical_signals_json: {},
          created_at: "2026-07-29T12:00:00Z",
        },
      ],
      error: null,
    },
    competitorSnapshotsResult: {
      data: [
        {
          id: "competitor-snapshot-1",
          competitor_id: "competitor-1",
          content_score: 72,
          service_signals_json: [],
          trust_signals_json: [],
          technical_signals_json: {},
          created_at: "2026-07-29T12:00:00Z",
          competitors: {
            id: "competitor-1",
            name: "Rakip A",
          },
        },
      ],
      error: null,
    },
    rpcResult: {
      data: 1,
      error: null,
    },
    recommendations: [defaultRecommendation],
    ...overrides,
  };

  const scoreBuilder = makeThenableBuilder(
    scenario.scoreResult
  );
  const analysesBuilder = makeThenableBuilder(
    scenario.analysesResult
  );
  const brandSnapshotsBuilder = makeThenableBuilder(
    scenario.brandSnapshotsResult
  );
  const competitorSnapshotsBuilder = makeThenableBuilder(
    scenario.competitorSnapshotsResult
  );
  const fromMock = vi.fn((table: string) => {
    switch (table) {
      case "audit_scores":
        return scoreBuilder;
      case "analyses":
        return analysesBuilder;
      case "brand_website_snapshots":
        return brandSnapshotsBuilder;
      case "competitor_website_snapshots":
        return competitorSnapshotsBuilder;
      default:
        throw new Error(`Beklenmeyen tablo: ${table}`);
    }
  });
  const rpcMock = vi.fn(() =>
    Promise.resolve(scenario.rpcResult)
  );
  const supabase = {
    from: fromMock,
    rpc: rpcMock,
  };

  createClientMock.mockResolvedValue(supabase);
  buildEvidenceBasedRecommendationsMock.mockReturnValue(
    scenario.recommendations
  );

  return {
    analysesBuilder,
    brandSnapshotsBuilder,
    competitorSnapshotsBuilder,
    fromMock,
    rpcMock,
    scenario,
    scoreBuilder,
  };
}

function runReplacement(
  input: {
    auditId?: string;
    brandId?: string;
    brandName?: string;
  } = {}
) {
  return replaceAuditRecommendations({
    auditId: input.auditId ?? "audit-1",
    brandId: input.brandId ?? "brand-1",
    brandName: input.brandName ?? "ASPEQO",
  });
}

describe("replaceAuditRecommendations", () => {
  beforeEach(() => {
    createClientMock.mockReset();
    buildEvidenceBasedRecommendationsMock.mockReset();
  });

  describe("girdi doğrulaması", () => {
    it.each([
      "",
      " ",
      "   ",
      "\n",
      "\t\r\n",
      "\u00A0",
    ])(
      "boş ölçüm kimliğini Supabase bağlantısı kurmadan reddeder: %j",
      async (auditId) => {
        const result = await runReplacement({
          auditId,
        });

        expect(result).toEqual({
          success: false,
          error: "Ölçüm kimliği gereklidir.",
        });
        expect(createClientMock).not.toHaveBeenCalled();
      }
    );

    it.each([
      "",
      " ",
      "   ",
      "\n",
      "\t\r\n",
      "\u3000",
    ])(
      "boş marka kimliğini Supabase bağlantısı kurmadan reddeder: %j",
      async (brandId) => {
        const result = await runReplacement({
          brandId,
        });

        expect(result).toEqual({
          success: false,
          error: "Marka kimliği gereklidir.",
        });
        expect(createClientMock).not.toHaveBeenCalled();
      }
    );

    it.each([
      "",
      " ",
      "   ",
      "\n",
      "\t\r\n",
      "\u00A0",
      "\u3000",
    ])(
      "boş marka adını Supabase bağlantısı kurmadan reddeder: %j",
      async (brandName) => {
        const result = await runReplacement({
          brandName,
        });

        expect(result).toEqual({
          success: false,
          error: "Marka adı gereklidir.",
        });
        expect(createClientMock).not.toHaveBeenCalled();
      }
    );

    it("kimliklerin dış boşluklarını sorgulardan önce temizler", async () => {
      const context = setupScenario();

      await runReplacement({
        auditId: "  audit-1 \n",
        brandId: "\t brand-1  ",
      });

      expect(context.scoreBuilder.eq).toHaveBeenCalledWith(
        "audit_id",
        "audit-1"
      );
      expect(
        context.analysesBuilder.eq
      ).toHaveBeenCalledWith(
        "audit_runs.audit_id",
        "audit-1"
      );
      expect(
        context.brandSnapshotsBuilder.eq
      ).toHaveBeenCalledWith("brand_id", "brand-1");
      expect(
        context.competitorSnapshotsBuilder.eq
      ).toHaveBeenCalledWith("brand_id", "brand-1");
    });

    it("marka adını Unicode ve tekrarlı boşluklardan arındırır", async () => {
      setupScenario();

      await runReplacement({
        brandName: "  TKS\u00A0\u00A0Test　Sistemleri  ",
      });

      expect(
        buildEvidenceBasedRecommendationsMock
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          brandName: "TKS Test Sistemleri",
        })
      );
    });
  });

  describe("veri sorgusu sözleşmesi", () => {
    it("tabloları doğru sırayla ve yalnızca birer kez sorgular", async () => {
      const context = setupScenario();

      await runReplacement();

      expect(context.fromMock.mock.calls).toEqual([
        ["audit_scores"],
        ["analyses"],
        ["brand_website_snapshots"],
        ["competitor_website_snapshots"],
      ]);
    });

    it("ölçüm skoru sorgusunda gerekli beş metriği ister", async () => {
      const context = setupScenario();

      await runReplacement();

      expect(context.scoreBuilder.select).toHaveBeenCalledWith(
        "visibility_score, share_of_voice, average_rank, positive_sentiment_rate, opportunity_score"
      );
    });

    it("ölçüm skoru sorgusunu tek kayıt beklentisiyle bitirir", async () => {
      const context = setupScenario();

      await runReplacement();

      expect(
        context.scoreBuilder.maybeSingle
      ).toHaveBeenCalledTimes(1);
    });

    it("analiz sorgusunda audit run ilişkisini inner join ile ister", async () => {
      const context = setupScenario();

      await runReplacement();

      expect(
        context.analysesBuilder.select
      ).toHaveBeenCalledWith(
        expect.stringContaining("audit_runs!inner")
      );
    });

    it.each([
      "brand_mentioned",
      "brand_rank",
      "brand_sentiment",
      "competitors_json",
      "summary",
      "prompt_text_snapshot",
      "prompt_intent_snapshot",
    ])(
      "analiz sorgusunda öneri motorunun ihtiyaç duyduğu %s alanını ister",
      async (field) => {
        const context = setupScenario();

        await runReplacement();

        expect(
          context.analysesBuilder.select
        ).toHaveBeenCalledWith(
          expect.stringContaining(field)
        );
      }
    );

    it("marka snapshot sorgusunda yalnızca tamamlanan kayıtları ister", async () => {
      const context = setupScenario();

      await runReplacement();

      expect(
        context.brandSnapshotsBuilder.eq
      ).toHaveBeenCalledWith("status", "completed");
    });

    it("marka snapshot sorgusunu en yeni kayıt önce olacak şekilde sıralar", async () => {
      const context = setupScenario();

      await runReplacement();

      expect(
        context.brandSnapshotsBuilder.order
      ).toHaveBeenCalledWith("created_at", {
        ascending: false,
      });
    });

    it("marka snapshot sorgusunu bir kayıtla sınırlar", async () => {
      const context = setupScenario();

      await runReplacement();

      expect(
        context.brandSnapshotsBuilder.limit
      ).toHaveBeenCalledWith(1);
    });

    it("rakip snapshot sorgusunda rakip kimliği ve adını ister", async () => {
      const context = setupScenario();

      await runReplacement();

      expect(
        context.competitorSnapshotsBuilder.select
      ).toHaveBeenCalledWith(
        expect.stringContaining("competitors (")
      );
      expect(
        context.competitorSnapshotsBuilder.select
      ).toHaveBeenCalledWith(
        expect.stringContaining("competitor_id")
      );
    });

    it("rakip snapshot sorgusunda yalnızca tamamlanan kayıtları ister", async () => {
      const context = setupScenario();

      await runReplacement();

      expect(
        context.competitorSnapshotsBuilder.eq
      ).toHaveBeenCalledWith("status", "completed");
    });

    it("rakip snapshot sorgusunu en yeni kayıt önce olacak şekilde sıralar", async () => {
      const context = setupScenario();

      await runReplacement();

      expect(
        context.competitorSnapshotsBuilder.order
      ).toHaveBeenCalledWith("created_at", {
        ascending: false,
      });
    });
  });

  describe("sorgu hata dalları", () => {
    it.each([
      "Skor servisi kapalı",
      "RLS skoru engelledi",
      "Bağlantı zaman aşımına uğradı",
    ])(
      "skor sorgusu hatasını bağlamıyla döndürür: %s",
      async (message) => {
        const context = setupScenario({
          scoreResult: {
            data: null,
            error: { message },
          },
        });

        const result = await runReplacement();

        expect(result).toEqual({
          success: false,
          error: `Ölçüm skorları alınamadı: ${message}`,
        });
        expect(
          context.analysesBuilder.select
        ).not.toHaveBeenCalled();
        expect(
          buildEvidenceBasedRecommendationsMock
        ).not.toHaveBeenCalled();
        expect(context.rpcMock).not.toHaveBeenCalled();
      }
    );

    it.each([
      "Analiz sorgusu başarısız",
      "audit_runs ilişkisi bulunamadı",
      "Analiz okuma yetkisi yok",
    ])(
      "analiz sorgusu hatasını bağlamıyla döndürür: %s",
      async (message) => {
        const context = setupScenario({
          analysesResult: {
            data: null,
            error: { message },
          },
        });

        const result = await runReplacement();

        expect(result).toEqual({
          success: false,
          error: `Ölçüm analizleri alınamadı: ${message}`,
        });
        expect(
          context.brandSnapshotsBuilder.select
        ).not.toHaveBeenCalled();
        expect(
          buildEvidenceBasedRecommendationsMock
        ).not.toHaveBeenCalled();
        expect(context.rpcMock).not.toHaveBeenCalled();
      }
    );

    it.each([
      "Marka snapshot sorgusu başarısız",
      "Website analizi yetkisi yok",
      "Snapshot bağlantısı kesildi",
    ])(
      "marka website snapshot hatasını bağlamıyla döndürür: %s",
      async (message) => {
        const context = setupScenario({
          brandSnapshotsResult: {
            data: null,
            error: { message },
          },
        });

        const result = await runReplacement();

        expect(result).toEqual({
          success: false,
          error: `Marka web sitesi analizi alınamadı: ${message}`,
        });
        expect(
          context.competitorSnapshotsBuilder.select
        ).not.toHaveBeenCalled();
        expect(
          buildEvidenceBasedRecommendationsMock
        ).not.toHaveBeenCalled();
        expect(context.rpcMock).not.toHaveBeenCalled();
      }
    );

    it.each([
      "Rakip snapshot sorgusu başarısız",
      "Rakip website analizi yetkisi yok",
      "Rakip snapshot bağlantısı kesildi",
    ])(
      "rakip website snapshot hatasını bağlamıyla döndürür: %s",
      async (message) => {
        const context = setupScenario({
          competitorSnapshotsResult: {
            data: null,
            error: { message },
          },
        });

        const result = await runReplacement();

        expect(result).toEqual({
          success: false,
          error: `Rakip web sitesi analizleri alınamadı: ${message}`,
        });
        expect(
          buildEvidenceBasedRecommendationsMock
        ).not.toHaveBeenCalled();
        expect(context.rpcMock).not.toHaveBeenCalled();
      }
    );

    it.each([
      "Atomik işlem reddedildi",
      "Ölçüm satırı kilitlenemedi",
      "Öneri verisi geçersiz",
    ])(
      "atomik RPC hatasını bağlamıyla döndürür: %s",
      async (message) => {
        const context = setupScenario({
          rpcResult: {
            data: null,
            error: { message },
          },
        });

        const result = await runReplacement();

        expect(result).toEqual({
          success: false,
          error: `Öneriler atomik olarak yenilenemedi: ${message}`,
        });
        expect(context.rpcMock).toHaveBeenCalledTimes(1);
      }
    );
  });

  describe("beklenmeyen hata güvenliği", () => {
    it("Supabase istemcisi oluşturulamazsa hata fırlatmak yerine güvenli sonuç döndürür", async () => {
      createClientMock.mockRejectedValue(
        new Error("Cookie erişimi başarısız")
      );

      const result = await runReplacement();

      expect(result).toEqual({
        success: false,
        error:
          "Öneriler yenilenirken beklenmeyen bir hata oluştu: Cookie erişimi başarısız",
      });
    });

    it("öneri motoru hata fırlatırsa RPC çağırmaz", async () => {
      const context = setupScenario();
      buildEvidenceBasedRecommendationsMock.mockImplementation(
        () => {
          throw new Error("Öneri üretilemedi");
        }
      );

      const result = await runReplacement();

      expect(result).toEqual({
        success: false,
        error:
          "Öneriler yenilenirken beklenmeyen bir hata oluştu: Öneri üretilemedi",
      });
      expect(context.rpcMock).not.toHaveBeenCalled();
    });

    it("Error olmayan message nesnesini okunabilir biçimde döndürür", async () => {
      createClientMock.mockRejectedValue({
        message: "Yapılandırma eksik",
      });

      const result = await runReplacement();

      expect(result).toEqual({
        success: false,
        error:
          "Öneriler yenilenirken beklenmeyen bir hata oluştu: Yapılandırma eksik",
      });
    });

    it.each([
      "düz metin hata",
      42,
      null,
      undefined,
      { code: "UNKNOWN" },
    ])(
      "mesajsız hata değerinde iç ayrıntıyı sızdırmadan genel hata döndürür: %j",
      async (thrownValue) => {
        createClientMock.mockRejectedValue(thrownValue);

        const result = await runReplacement();

        expect(result).toEqual({
          success: false,
          error:
            "Öneriler yenilenirken beklenmeyen bir hata oluştu: Bilinmeyen hata.",
        });
      }
    );
  });

  describe("öneri motoruna veri aktarımı", () => {
    it("skor nesnesini değiştirmeden öneri motoruna aktarır", async () => {
      const score = {
        visibility_score: 11,
        share_of_voice: 22,
        average_rank: 3,
        positive_sentiment_rate: 44,
        opportunity_score: 55,
      };
      setupScenario({
        scoreResult: {
          data: score,
          error: null,
        },
      });

      await runReplacement();

      expect(
        buildEvidenceBasedRecommendationsMock
      ).toHaveBeenCalledWith(
        expect.objectContaining({ score })
      );
    });

    it("skor kaydı yoksa null değerini öneri motoruna aktarır", async () => {
      setupScenario({
        scoreResult: {
          data: null,
          error: null,
        },
      });

      await runReplacement();

      expect(
        buildEvidenceBasedRecommendationsMock
      ).toHaveBeenCalledWith(
        expect.objectContaining({ score: null })
      );
    });

    it("analiz verisini değiştirmeden öneri motoruna aktarır", async () => {
      const analyses = [
        {
          brand_mentioned: false,
          summary: "Görünmedi",
        },
        {
          brand_mentioned: true,
          summary: "Göründü",
        },
      ];
      setupScenario({
        analysesResult: {
          data: analyses,
          error: null,
        },
      });

      await runReplacement();

      expect(
        buildEvidenceBasedRecommendationsMock
      ).toHaveBeenCalledWith(
        expect.objectContaining({ analyses })
      );
    });

    it.each([null, []])(
      "analiz sonucu %j olduğunda boş dizi aktarır",
      async (analyses) => {
        setupScenario({
          analysesResult: {
            data: analyses,
            error: null,
          },
        });

        await runReplacement();

        expect(
          buildEvidenceBasedRecommendationsMock
        ).toHaveBeenCalledWith(
          expect.objectContaining({ analyses: [] })
        );
      }
    );

    it("en güncel marka website snapshot kaydını aktarır", async () => {
      const latest = {
        id: "latest",
        content_score: 90,
      };
      setupScenario({
        brandSnapshotsResult: {
          data: [
            latest,
            {
              id: "older",
              content_score: 10,
            },
          ],
          error: null,
        },
      });

      await runReplacement();

      expect(
        buildEvidenceBasedRecommendationsMock
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          brandWebsiteSnapshot: latest,
        })
      );
    });

    it.each([null, []])(
      "marka website snapshot sonucu %j olduğunda null aktarır",
      async (snapshots) => {
        setupScenario({
          brandSnapshotsResult: {
            data: snapshots,
            error: null,
          },
        });

        await runReplacement();

        expect(
          buildEvidenceBasedRecommendationsMock
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            brandWebsiteSnapshot: null,
          })
        );
      }
    );

    it("aynı rakibin yalnızca sıralamadaki ilk snapshot kaydını kullanır", async () => {
      setupScenario({
        competitorSnapshotsResult: {
          data: [
            {
              id: "new",
              competitor_id: "competitor-1",
              content_score: 90,
              service_signals_json: ["new-service"],
              trust_signals_json: ["new-trust"],
              technical_signals_json: {
                marker: "new",
              },
              competitors: {
                name: "Yeni Rakip",
              },
            },
            {
              id: "old",
              competitor_id: "competitor-1",
              content_score: 10,
              service_signals_json: ["old-service"],
              trust_signals_json: ["old-trust"],
              technical_signals_json: {
                marker: "old",
              },
              competitors: {
                name: "Eski Rakip",
              },
            },
          ],
          error: null,
        },
      });

      await runReplacement();

      expect(
        buildEvidenceBasedRecommendationsMock
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          competitorWebsiteSnapshots: [
            {
              competitor_name: "Yeni Rakip",
              content_score: 90,
              service_signals_json: ["new-service"],
              trust_signals_json: ["new-trust"],
              technical_signals_json: {
                marker: "new",
              },
            },
          ],
        })
      );
    });

    it("farklı rakiplerin en güncel snapshot kayıtlarını giriş sırasıyla korur", async () => {
      setupScenario({
        competitorSnapshotsResult: {
          data: [
            {
              id: "b-new",
              competitor_id: "competitor-b",
              content_score: 80,
              service_signals_json: [],
              trust_signals_json: [],
              technical_signals_json: {},
              competitors: { name: "Rakip B" },
            },
            {
              id: "a-new",
              competitor_id: "competitor-a",
              content_score: 70,
              service_signals_json: [],
              trust_signals_json: [],
              technical_signals_json: {},
              competitors: { name: "Rakip A" },
            },
            {
              id: "b-old",
              competitor_id: "competitor-b",
              content_score: 20,
              service_signals_json: [],
              trust_signals_json: [],
              technical_signals_json: {},
              competitors: { name: "Eski B" },
            },
          ],
          error: null,
        },
      });

      await runReplacement();

      const input =
        buildEvidenceBasedRecommendationsMock.mock
          .calls[0]?.[0];

      expect(
        input.competitorWebsiteSnapshots.map(
          (snapshot: { competitor_name: string }) =>
            snapshot.competitor_name
        )
      ).toEqual(["Rakip B", "Rakip A"]);
    });

    it("Supabase ilişkiyi dizi döndürdüğünde ilk rakip adını kullanır", async () => {
      setupScenario({
        competitorSnapshotsResult: {
          data: [
            {
              competitor_id: "competitor-1",
              content_score: 75,
              service_signals_json: [],
              trust_signals_json: [],
              technical_signals_json: {},
              competitors: [
                { name: "Birincil Rakip" },
                { name: "İkincil Rakip" },
              ],
            },
          ],
          error: null,
        },
      });

      await runReplacement();

      expect(
        buildEvidenceBasedRecommendationsMock
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          competitorWebsiteSnapshots: [
            expect.objectContaining({
              competitor_name: "Birincil Rakip",
            }),
          ],
        })
      );
    });

    it.each([
      null,
      [],
      {},
      { name: null },
      { name: "" },
      { name: "   " },
      [{ name: "" }],
    ])(
      "eksik veya boş rakip ilişkisinde güvenli Rakip adını kullanır: %j",
      async (competitors) => {
        setupScenario({
          competitorSnapshotsResult: {
            data: [
              {
                competitor_id: "competitor-1",
                content_score: 75,
                service_signals_json: [],
                trust_signals_json: [],
                technical_signals_json: {},
                competitors,
              },
            ],
            error: null,
          },
        });

        await runReplacement();

        expect(
          buildEvidenceBasedRecommendationsMock
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            competitorWebsiteSnapshots: [
              expect.objectContaining({
                competitor_name: "Rakip",
              }),
            ],
          })
        );
      }
    );

    it("rakip adındaki Unicode ve tekrarlı boşlukları normalize eder", async () => {
      setupScenario({
        competitorSnapshotsResult: {
          data: [
            {
              competitor_id: "competitor-1",
              content_score: 75,
              service_signals_json: [],
              trust_signals_json: [],
              technical_signals_json: {},
              competitors: {
                name: "  Rakip\u00A0\u00A0Test　A  ",
              },
            },
          ],
          error: null,
        },
      });

      await runReplacement();

      expect(
        buildEvidenceBasedRecommendationsMock
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          competitorWebsiteSnapshots: [
            expect.objectContaining({
              competitor_name: "Rakip Test A",
            }),
          ],
        })
      );
    });

    it.each([null, []])(
      "rakip snapshot sonucu %j olduğunda boş dizi aktarır",
      async (snapshots) => {
        setupScenario({
          competitorSnapshotsResult: {
            data: snapshots,
            error: null,
          },
        });

        await runReplacement();

        expect(
          buildEvidenceBasedRecommendationsMock
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            competitorWebsiteSnapshots: [],
          })
        );
      }
    );
  });

  describe("atomik kayıt sözleşmesi", () => {
    it("önerileri audit kimliğiyle atomik RPC fonksiyonuna gönderir", async () => {
      const recommendations = [
        defaultRecommendation,
        {
          ...defaultRecommendation,
          category: "trust",
          title: "Güven kanıtı ekle",
        },
      ];
      const context = setupScenario({
        recommendations,
        rpcResult: {
          data: 2,
          error: null,
        },
      });

      await runReplacement();

      expect(context.rpcMock).toHaveBeenCalledWith(
        "replace_audit_recommendations",
        {
          p_audit_id: "audit-1",
          p_recommendations: recommendations,
        }
      );
    });

    it("eski delete-then-insert tablo akışını artık kullanmaz", async () => {
      const context = setupScenario();

      await runReplacement();

      expect(context.fromMock).not.toHaveBeenCalledWith(
        "recommendations"
      );
      expect(context.rpcMock).toHaveBeenCalledTimes(1);
    });

    it("sıfır öneriyi atomik RPC üzerinden boş diziyle yeniler", async () => {
      const context = setupScenario({
        recommendations: [],
        rpcResult: {
          data: 0,
          error: null,
        },
      });

      const result = await runReplacement();

      expect(context.rpcMock).toHaveBeenCalledWith(
        "replace_audit_recommendations",
        {
          p_audit_id: "audit-1",
          p_recommendations: [],
        }
      );
      expect(result).toEqual({
        success: true,
        recommendationCount: 0,
      });
    });

    it.each([0, 1, 2, 8, 50])(
      "RPC geçerli %i kayıt sayısını döndürdüğünde sonucu aynen raporlar",
      async (count) => {
        setupScenario({
          rpcResult: {
            data: count,
            error: null,
          },
        });

        const result = await runReplacement();

        expect(result).toEqual({
          success: true,
          recommendationCount: count,
        });
      }
    );

    it.each([
      null,
      undefined,
      "1",
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ])(
      "RPC geçersiz kayıt sayısı %j döndürdüğünde yerel öneri sayısını kullanır",
      async (count) => {
        setupScenario({
          recommendations: [
            defaultRecommendation,
            {
              ...defaultRecommendation,
              title: "İkinci öneri",
            },
          ],
          rpcResult: {
            data: count,
            error: null,
          },
        });

        const result = await runReplacement();

        expect(result).toEqual({
          success: true,
          recommendationCount: 2,
        });
      }
    );

    it("öneri dizisini RPC öncesinde değiştirmez", async () => {
      const recommendations = [
        {
          ...defaultRecommendation,
        },
      ];
      const original = structuredClone(recommendations);
      setupScenario({ recommendations });

      await runReplacement();

      expect(recommendations).toEqual(original);
    });
  });
});

describe("atomik öneri yenileme SQL sözleşmesi", () => {
      function normalizeSqlLineEndings(sql: string) {
    return sql.replace(/\r\n?/gu, "\n").trim();
  }
  const migrationSql = readFileSync(
    resolve(
      process.cwd(),
      "database/migrations/202607290001_atomic_recommendation_refresh.sql"
    ),
    "utf8"
  );
  const refreshSql = readFileSync(
    resolve(
      process.cwd(),
      "database/recommendations-refresh.sql"
    ),
    "utf8"
  );
  const functionStart =
    refreshSql.indexOf(
      "create or replace function public.replace_audit_recommendations"
    );
  const canonicalFunctionSql =
    normalizeSqlLineEndings(
      refreshSql.slice(functionStart)
    );

  it("migration atomik yenileme fonksiyonunu tanımlar", () => {
    expect(migrationSql).toContain(
      "function public.replace_audit_recommendations"
    );
  });

  it("fonksiyon ayrıcalıklı çalışırken arama yolunu sabitler", () => {
    expect(migrationSql).toContain("security definer");
    expect(migrationSql).toContain("set search_path = ''");
  });

  it("oturum açmamış çağrıları reddeder", () => {
    expect(migrationSql).toContain(
      "if auth.uid() is null"
    );
  });

  it("workspace rolünü açıkça doğrular", () => {
    expect(migrationSql).toContain(
      "public.has_workspace_role"
    );
    expect(migrationSql).toContain(
      "array['owner', 'admin', 'member']"
    );
  });

  it("eşzamanlı yenilemeleri audit satırı kilidiyle sıraya alır", () => {
    expect(migrationSql).toMatch(
      /from public\.audits[\s\S]+for update;/u
    );
  });

  it("öneri girdisinin JSON dizisi olmasını zorunlu tutar", () => {
    expect(migrationSql).toContain(
      "jsonb_typeof(p_recommendations) is distinct from 'array'"
    );
  });

  it("tek çağrıdaki öneri sayısını sınırlar", () => {
    expect(migrationSql).toContain(
      "jsonb_array_length(p_recommendations) > 50"
    );
  });

  it.each([
    "category",
    "title",
    "description",
  ])(
    "zorunlu %s alanının boş olmasını reddeder",
    (field) => {
      expect(migrationSql).toContain(
        `nullif(btrim(item->>'${field}'), '') is null`
      );
    }
  );

  it.each(["priority", "effort", "impact"])(
    "%s alanını low, medium ve high değerleriyle sınırlar",
    (field) => {
      expect(migrationSql).toContain(
        `item->>'${field}' not in ('low', 'medium', 'high')`
      );
    }
  );

  it("eski kayıtları ve yeni eklemeyi aynı fonksiyon gövdesinde yapar", () => {
    const deletePosition = migrationSql.indexOf(
      "delete from public.recommendations"
    );
    const insertPosition = migrationSql.indexOf(
      "insert into public.recommendations"
    );

    expect(deletePosition).toBeGreaterThan(-1);
    expect(insertPosition).toBeGreaterThan(
      deletePosition
    );
  });

  it("istemciden gelen status değerini kullanmayıp open değerini zorunlu tutar", () => {
    expect(migrationSql).toMatch(
      /impact,\s+status[\s\S]+coalesce[\s\S]+'open'/u
    );
  });

  it("public rolünün fonksiyon erişimini kaldırır", () => {
    expect(migrationSql).toMatch(
      /revoke all[\s\S]+from public;/u
    );
  });

  it("yalnızca authenticated role çalıştırma izni verir", () => {
    expect(migrationSql).toMatch(
      /grant execute[\s\S]+to authenticated;/u
    );
  });

  it("kurulum betiğiyle migration aynı fonksiyon sözleşmesini taşır", () => {
    expect(functionStart).toBeGreaterThan(-1);
        expect(canonicalFunctionSql).toBe(
      normalizeSqlLineEndings(migrationSql)
    );
  });
});