import { describe, expect, it } from "vitest";

import {
  normalizeStrategyText,
  resolvePromptIntent,
} from "@/lib/strategy/prompt-intents";

describe("resolvePromptIntent", () => {
  it("veritabanındaki geçerli niyeti korur", () => {
    const result = resolvePromptIntent(
      "Genel bir soru",
      "problem_solution"
    );

    expect(result).toBe("problem_solution");
  });

  it("Türkçe kayıtlı niyet adını çözümler", () => {
    const result = resolvePromptIntent(
      "Genel bir soru",
      "Satın Alma Niyeti"
    );

    expect(result).toBe("buying_intent");
  });

  it("teknik ürün seçimi sorusunu satın alma niyeti olarak sınıflandırır", () => {
    const result = resolvePromptIntent(
      "Endüstriyel tesiste kablosuz titreşim sensörü seçerken hangi teknik özelliklere bakılmalı?",
      null
    );

    expect(result).toBe("buying_intent");
  });

  it("şehir içeren soruyu yerel öneri olarak sınıflandırır", () => {
    const result = resolvePromptIntent(
      "İstanbul'da kalibrasyon hizmeti veren firmalar hangileri?",
      null
    );

    expect(result).toBe(
      "local_recommendation"
    );
  });

  it("iki çözüm arasındaki farkı soran metni karşılaştırma olarak sınıflandırır", () => {
    const result = resolvePromptIntent(
      "Periyodik vibrasyon analizi ile sürekli izleme arasındaki fark nedir?",
      null
    );

    expect(result).toBe("comparison");
  });

  it("plansız duruş sorusunu sorun ve çözüm olarak sınıflandırır", () => {
    const result = resolvePromptIntent(
      "Fabrikada plansız duruş nasıl önceden tespit edilir?",
      null
    );

    expect(result).toBe("problem_solution");
  });

  it("sertifika ve güven sorusunu güven ve itibar olarak sınıflandırır", () => {
    const result = resolvePromptIntent(
      "ISO 17025 sertifikalı ve güvenilir kalibrasyon firmaları hangileridir?",
      null
    );

    expect(result).toBe("trust_reputation");
  });

  it("sağlayıcı listesi sorusunu alternatif arama olarak sınıflandırır", () => {
    const result = resolvePromptIntent(
      "Türkiye'deki ilaç ve gıda üretim tesislerinde sıcaklık kalibrasyon sistemleri için öne çıkan teknik çözüm sağlayıcıları hangileridir?",
      null
    );

    expect(result).toBe("alternative_search");
  });

  it("belirgin niyet taşımayan soruda null döndürür", () => {
    const result = resolvePromptIntent(
      "Kalibrasyon sistemlerinin çalışma prensibini açıklar mısın?",
      null
    );

    expect(result).toBeNull();
  });

  it("Türkçe karakterleri tutarlı biçimde normalleştirir", () => {
    expect(
      normalizeStrategyText(
        "Ölçüm, Mühendisliği ve Çözüm"
      )
    ).toBe(
      "olcum muhendisligi ve cozum"
    );
  });
});