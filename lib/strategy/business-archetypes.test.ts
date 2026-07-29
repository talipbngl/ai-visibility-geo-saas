import { describe, expect, it } from "vitest";

import {
  matchesStrategyTerm,
  resolveBusinessArchetype,
  resolveBusinessArchetypeWithEvidence,
} from "@/lib/strategy/business-archetypes";

describe("business archetype resolution", () => {
  it("TKS benzeri işletmeyi endüstriyel ölçüm ve kalibrasyon olarak sınıflandırır", () => {
    const result =
      resolveBusinessArchetypeWithEvidence({
        industry:
          "Endüstriyel test, ölçüm ve kalibrasyon sistemleri",
        primaryOffer:
          "Kuru blok kalibratör, sıcaklık kalibrasyon banyosu ve elektriksel test cihazları",
        description:
          "Laboratuvarlar için test ve ölçüm cihazları üreten teknik çözüm sağlayıcısı",
        targetAudience:
          "İlaç ve gıda üretim tesisleri ile kalibrasyon laboratuvarları",
      });

    expect(result.archetype).toBe(
      "industrial_instrumentation"
    );
    expect(result.confidence).toBe("high");
    expect(result.score).toBeGreaterThan(0);
    expect(result.evidence.length).toBeGreaterThan(0);
  });

  it("DMT benzeri işletmeyi endüstriyel B2B olarak sınıflandırır", () => {
    const result =
      resolveBusinessArchetypeWithEvidence({
        industry:
          "Endüstriyel kestirimci bakım ve vibrasyon analizi",
        primaryOffer:
          "Vibrasyon analizi, yerinde balans, lazerli kaplin ayarı ve durum izleme",
        description:
          "Fabrikalarda plansız duruşları azaltan mühendislik ve saha hizmetleri",
        targetAudience:
          "Bakım yöneticileri ve üretim tesisleri",
      });

    expect(result.archetype).toBe(
      "industrial_b2b"
    );
    expect(result.confidence).toBe("high");
    expect(result.score).toBeGreaterThan(0);
  });

  it("yetersiz işletme bilgisinde genel işletme sonucunu döndürür", () => {
    const result = resolveBusinessArchetype({
      industry: "Yenilikçi çözümler",
      description: "Kurumsal hizmetler sunuyoruz.",
    });

    expect(result).toBe("generic_business");
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