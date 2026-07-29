import { describe, expect, it } from "vitest";

import {
  matchesStrategyTerm,
  resolveBusinessArchetype,
  resolveBusinessArchetypeWithEvidence,
  type BrandStrategyContext,
  type BusinessArchetype,
} from "@/lib/strategy/business-archetypes";

type ArchetypeCase = {
  name: string;
  context: BrandStrategyContext;
  expected: BusinessArchetype;
};

const archetypeCases: ArchetypeCase[] = [
  {
    name: "endüstriyel test ve kalibrasyon firması",
    context: {
      industry:
        "Endüstriyel test, ölçüm ve kalibrasyon sistemleri",
      primaryOffer:
        "Kuru blok kalibratör, sıcaklık kalibrasyon banyosu ve elektriksel test cihazları",
      description:
        "Laboratuvarlar için test ve ölçüm cihazları üreten teknik çözüm sağlayıcısı",
      targetAudience:
        "İlaç ve gıda üretim tesisleri ile kalibrasyon laboratuvarları",
    },
    expected: "industrial_instrumentation",
  },
  {
    name: "kestirimci bakım firması",
    context: {
      industry:
        "Kestirimci bakım ve vibrasyon analizi",
      primaryOffer:
        "Vibrasyon analizi, yerinde balans, lazerli kaplin ayarı ve durum izleme",
      description:
        "Fabrikalar için mühendislik ve saha hizmetleri",
    },
    expected: "industrial_b2b",
  },
  {
    name: "yenilenebilir enerji şirketi",
    context: {
      industry: "Yenilenebilir enerji",
    },
    expected: "energy_environment",
  },
  {
    name: "gıda üreticisi",
    context: {
      industry: "Gıda üretimi",
    },
    expected: "agriculture_food_production",
  },
  {
    name: "lojistik şirketi",
    context: {
      industry: "Lojistik",
    },
    expected: "logistics_transport",
  },
  {
    name: "otomotiv şirketi",
    context: {
      industry: "Otomotiv",
    },
    expected: "automotive",
  },
  {
    name: "gayrimenkul şirketi",
    context: {
      industry: "Gayrimenkul",
    },
    expected: "real_estate_construction",
  },
  {
    name: "hastane",
    context: {
      industry: "Hastane",
    },
    expected: "healthcare",
  },
  {
    name: "banka",
    context: {
      industry: "Bankacılık",
    },
    expected: "finance_insurance",
  },
  {
    name: "üniversite",
    context: {
      industry: "Üniversite",
    },
    expected: "education",
  },
  {
    name: "SaaS şirketi",
    context: {
      industry: "SaaS",
    },
    expected: "saas",
  },
  {
    name: "e-ticaret mağazası",
    context: {
      industry: "E-ticaret",
    },
    expected: "ecommerce",
  },
  {
    name: "pazaryeri",
    context: {
      industry: "Pazaryeri",
    },
    expected: "marketplace",
  },
  {
    name: "otel işletmesi",
    context: {
      industry: "Otel ve konaklama",
    },
    expected: "hospitality",
  },
  {
    name: "hukuk bürosu",
    context: {
      industry: "Hukuk bürosu",
    },
    expected: "professional_service",
  },
  {
    name: "temizlik şirketi",
    context: {
      industry: "Temizlik şirketi",
    },
    expected: "local_service",
  },
  {
    name: "kozmetik markası",
    context: {
      industry: "Kozmetik markası",
    },
    expected: "consumer_brand",
  },
  {
    name: "haber sitesi",
    context: {
      industry: "Haber sitesi",
    },
    expected: "media_publishing",
  },
  {
    name: "dernek",
    context: {
      industry: "Dernek",
    },
    expected: "nonprofit_public",
  },
];

describe("business archetype resolution", () => {
  it.each(archetypeCases)(
    "$name işletmesini $expected olarak sınıflandırır",
    ({ context, expected }) => {
      expect(
        resolveBusinessArchetype(context)
      ).toBe(expected);
    }
  );

  it("yetersiz işletme bilgisinde genel işletme sonucunu döndürür", () => {
    expect(
      resolveBusinessArchetype({
        industry: "Yenilikçi çözümler",
        description:
          "Kurumsal hizmetler sunuyoruz.",
      })
    ).toBe("generic_business");
  });

  it("yalnızca kalibrasyon ifadesiyle kesin sektör kararı vermez", () => {
    const result =
      resolveBusinessArchetypeWithEvidence({
        industry: "Kalibrasyon",
      });

    expect(result.archetype).toBe(
      "generic_business"
    );
    expect(result.confidence).toBe("low");
    expect(result.scoreGap).toBe(0);
    expect(result.runnerUp).toBe(
      "industrial_b2b"
    );
  });

  it("yıldızlı terimleri kelime kökü olarak eşleştirir", () => {
    expect(
      matchesStrategyTerm(
        "Endüstriyel mühendislik çözümleri",
        "muhendis*"
      )
    ).toBe(true);
  });

  it("kısa terimleri başka kelimelerin içinden eşleştirmez", () => {
    expect(
      matchesStrategyTerm(
        "Endüstriyel ekipman üretimi",
        "dis"
      )
    ).toBe(false);

    expect(
      matchesStrategyTerm(
        "Diş kliniği",
        "dis"
      )
    ).toBe(true);
  });
});