import { describe, expect, it } from "vitest";

import {
  getIntentContentPlan,
  type IntentContentPlan,
} from "@/lib/recommendations/intent-content-actions";

const expectedPlans: Array<{
  intent: string;
  label: string;
  title: string;
  actionIncludes: string[];
}> = [
  {
    intent: "buying_intent",
    label: "satın alma niyeti",
    title: "Satın alma kararını destekleyen içerik hazırla",
    actionIncludes: ["fiyat", "avantaj", "satın alma adımlarını"],
  },
  {
    intent: "comparison",
    label: "karşılaştırma",
    title: "Karşılaştırma sorularına özel içerik hazırla",
    actionIncludes: ["rakiplerden", "avantajları", "sınırlamaları"],
  },
  {
    intent: "local_recommendation",
    label: "yerel öneri",
    title: "Yerel aramalara özel sayfalar oluştur",
    actionIncludes: ["şehirler", "adresler", "çalışma saatleri"],
  },
  {
    intent: "problem_solution",
    label: "sorun ve çözüm",
    title: "Müşteri sorunlarını yanıtlayan rehberler oluştur",
    actionIncludes: ["olası nedenleri", "çözüm adımlarını", "sık sorulan"],
  },
  {
    intent: "alternative_search",
    label: "alternatif arama",
    title: "Alternatif arayan kullanıcılar için içerik hazırla",
    actionIncludes: ["farklı bir seçenek", "güçlü bir alternatif", "tarafsız"],
  },
  {
    intent: "budget_friendly",
    label: "uygun fiyat",
    title: "Fiyat ve değer avantajını görünür hâle getir",
    actionIncludes: ["paketler", "kampanyalar", "bütçeye"],
  },
  {
    intent: "premium_choice",
    label: "üst segment tercih",
    title: "Kalite ve uzmanlık kanıtlarını güçlendir",
    actionIncludes: ["ürün kalitesi", "uzmanlık", "üst segment"],
  },
  {
    intent: "trust_reputation",
    label: "güven ve itibar",
    title: "Güven ve marka itibarı içeriği oluştur",
    actionIncludes: ["yorumları", "referanslar", "sertifikalar"],
  },
];

describe("getIntentContentPlan", () => {
  describe("desteklenen karar niyetleri", () => {
    it.each(expectedPlans)(
      "$intent için doğru etiketi ve başlığı döndürür",
      ({ intent, label, title }) => {
        expect(getIntentContentPlan(intent)).toMatchObject({
          label,
          title,
        });
      }
    );

    it.each(expectedPlans)(
      "$intent aksiyonunda gerekli karar unsurlarını korur",
      ({ intent, actionIncludes }) => {
        const plan = getIntentContentPlan(intent);

        for (const expectedText of actionIncludes) {
          expect(
            plan?.action.toLocaleLowerCase("tr-TR")
          ).toContain(
            expectedText.toLocaleLowerCase("tr-TR")
          );
        }
      }
    );

    it.each(expectedPlans)(
      "$intent için eksiksiz ve boş olmayan plan üretir",
      ({ intent }) => {
        const plan = getIntentContentPlan(intent);

        expect(plan).toEqual({
          label: expect.any(String),
          title: expect.any(String),
          action: expect.any(String),
        });
        expect(plan?.label.trim().length).toBeGreaterThan(0);
        expect(plan?.title.trim().length).toBeGreaterThan(0);
        expect(plan?.action.trim().length).toBeGreaterThan(40);
      }
    );
  });

  describe("normalizasyon ve güvenli geri dönüş", () => {
    it.each([
      ["BUYING_INTENT", "buying_intent"],
      ["Comparison", "comparison"],
      ["LOCAL_RECOMMENDATION", "local_recommendation"],
      ["Problem_Solution", "problem_solution"],
      [" alternative_search ", "alternative_search"],
      ["\tBUDGET_FRIENDLY\n", "budget_friendly"],
      ["  premium_choice  ", "premium_choice"],
      ["TRUST_REPUTATION", "trust_reputation"],
    ])(
      "%j yazımını %s planına normalleştirir",
      (input, canonicalIntent) => {
        expect(getIntentContentPlan(input)).toEqual(
          getIntentContentPlan(canonicalIntent)
        );
      }
    );

    it.each([
      null,
      undefined,
      "",
      " ",
      "\n\t",
      "other",
      "bilgilendirme",
      "satın alma niyeti",
      "unknown_intent",
    ])(
      "desteklenmeyen veya boş niyette null döndürür: %j",
      (intent) => {
        expect(getIntentContentPlan(intent)).toBeNull();
      }
    );

    it.each([
      "constructor",
      "__proto__",
      "prototype",
      "toString",
      "hasOwnProperty",
      "valueOf",
    ])(
      "nesne prototipi anahtarını plan gibi döndürmez: %s",
      (intent) => {
        expect(getIntentContentPlan(intent)).toBeNull();
      }
    );
  });

  describe("yan etkisizlik ve deterministik davranış", () => {
    it("çağrılar arasında paylaşılan değiştirilebilir nesne döndürmez", () => {
      const first = getIntentContentPlan("comparison");
      const second = getIntentContentPlan("comparison");

      expect(first).toEqual(second);
      expect(first).not.toBe(second);
    });

    it("dışarıda değiştirilen sonuç sonraki çağrıyı bozmaz", () => {
      const first = getIntentContentPlan(
        "buying_intent"
      ) as IntentContentPlan;
      const originalTitle = first.title;

      first.title = "Dışarıdan değiştirilmiş başlık";

      expect(
        getIntentContentPlan("buying_intent")?.title
      ).toBe(originalTitle);
    });

    it("farklı niyetlerin plan nesnelerini birbirine karıştırmaz", () => {
      const buying = getIntentContentPlan("buying_intent");
      const trust = getIntentContentPlan("trust_reputation");

      expect(buying).not.toEqual(trust);
      expect(buying?.title).not.toBe(trust?.title);
    });

    it("bin çağrıda aynı plan içeriğini korur", () => {
      const expected = getIntentContentPlan("comparison");

      for (let index = 0; index < 1_000; index += 1) {
        expect(getIntentContentPlan("comparison")).toEqual(
          expected
        );
      }
    });
  });
});