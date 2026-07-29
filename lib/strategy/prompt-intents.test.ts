import { describe, expect, it } from "vitest";

import {
  findTurkishLocation,
  normalizeStrategyText,
  promptIntents,
  resolvePromptIntent,
  type PromptIntent,
} from "@/lib/strategy/prompt-intents";

type PromptIntentCase = {
  sector: string;
  prompt: string;
  expected: PromptIntent;
};

const storedIntentAliases: Array<{
  label: string;
  expected: PromptIntent;
}> = [
  {
    label: "Satın Alma Niyeti",
    expected: "buying_intent",
  },
  {
    label: "Karşılaştırma",
    expected: "comparison",
  },
  {
    label: "Yerel Öneri",
    expected: "local_recommendation",
  },
  {
    label: "Sorun ve Çözüm",
    expected: "problem_solution",
  },
  {
    label: "Alternatif Arama",
    expected: "alternative_search",
  },
  {
    label: "Bütçe Dostu",
    expected: "budget_friendly",
  },
  {
    label: "Premium Seçim",
    expected: "premium_choice",
  },
  {
    label: "Güven ve İtibar",
    expected: "trust_reputation",
  },
];

const promptIntentCases: PromptIntentCase[] = [
  {
    sector: "E-ticaret",
    prompt:
      "Yeni bir dizüstü bilgisayar almak için hangi teknik özelliklere bakmalıyım?",
    expected: "buying_intent",
  },
  {
    sector: "SaaS",
    prompt:
      "CRM abonelik paketi seçerken hangi özelliklere bakmalıyım?",
    expected: "buying_intent",
  },
  {
    sector: "Finans",
    prompt:
      "Vadeli mevduat ile yatırım fonu arasındaki fark nedir?",
    expected: "comparison",
  },
  {
    sector: "Otomotiv",
    prompt:
      "Elektrikli araç ile hibrit araç arasındaki fark nedir?",
    expected: "comparison",
  },
  {
    sector: "Sağlık",
    prompt:
      "Ankara'da çocuk diş hekimi önerir misin?",
    expected: "local_recommendation",
  },
  {
    sector: "Yeme içme",
    prompt:
      "İzmir'de vegan restoran önerileri nelerdir?",
    expected: "local_recommendation",
  },
  {
    sector: "Endüstriyel bakım",
    prompt:
      "Fabrikada plansız duruş nasıl önceden tespit edilir?",
    expected: "problem_solution",
  },
  {
    sector: "SaaS destek",
    prompt:
      "CRM entegrasyonu çalışmıyor, ne yapmalıyım?",
    expected: "problem_solution",
  },
  {
    sector: "E-ticaret ödeme",
    prompt:
      "İnternet mağazamda ödeme neden olmuyor?",
    expected: "problem_solution",
  },
  {
    sector: "Enerji",
    prompt:
      "Güneş enerjisi sistemindeki arıza nasıl giderilir?",
    expected: "problem_solution",
  },
  {
    sector: "Kalibrasyon",
    prompt:
      "Türkiye'deki ilaç ve gıda üretim tesislerinde sıcaklık kalibrasyon sistemleri için öne çıkan teknik çözüm sağlayıcıları hangileridir?",
    expected: "alternative_search",
  },
  {
    sector: "Eğitim",
    prompt:
      "YKS hazırlığı için hangi online eğitim platformlarını önerirsin?",
    expected: "alternative_search",
  },
  {
    sector: "Muhasebe",
    prompt:
      "KOBİ'ler için hangi muhasebe yazılımlarını önerirsin?",
    expected: "alternative_search",
  },
  {
    sector: "Lojistik",
    prompt:
      "E-ticaret şirketleri için hangi kargo firmalarını önerirsin?",
    expected: "alternative_search",
  },
  {
    sector: "Konaklama",
    prompt:
      "Uygun fiyatlı aile oteli önerileri nelerdir?",
    expected: "budget_friendly",
  },
  {
    sector: "SaaS bütçesi",
    prompt:
      "Küçük ekipler için ekonomik CRM seçenekleri nelerdir?",
    expected: "budget_friendly",
  },
  {
    sector: "Tüketici elektroniği",
    prompt:
      "Profesyonel seviye fotoğraf makinesi önerir misin?",
    expected: "premium_choice",
  },
  {
    sector: "Eğitim kurumu",
    prompt:
      "En kaliteli özel okul seçenekleri hangileridir?",
    expected: "premium_choice",
  },
  {
    sector: "Finansal hizmet",
    prompt:
      "Lisanslı ve güvenilir yatırım kuruluşları hangileridir?",
    expected: "trust_reputation",
  },
  {
    sector: "Sağlık hizmeti",
    prompt:
      "Sertifikalı ve güvenilir estetik klinikleri hangileridir?",
    expected: "trust_reputation",
  },
];

describe("resolvePromptIntent", () => {
  it.each(promptIntents)(
    "veritabanındaki %s niyetini değiştirmeden korur",
    (intent) => {
      expect(
        resolvePromptIntent(
          "Metinden farklı bir niyet çıkarılabilir.",
          intent
        )
      ).toBe(intent);
    }
  );

  it.each(storedIntentAliases)(
    "$label Türkçe etiketini $expected değerine dönüştürür",
    ({ label, expected }) => {
      expect(
        resolvePromptIntent(
          "Genel bir test sorusu",
          label
        )
      ).toBe(expected);
    }
  );

  it.each(promptIntentCases)(
    "$sector sektöründeki soruyu $expected olarak sınıflandırır",
    ({ prompt, expected }) => {
      expect(
        resolvePromptIntent(prompt, null)
      ).toBe(expected);
    }
  );

  it.each([
    "Fotosentez hakkında bilgi verir misin?",
    "Kalibrasyon sistemlerinin çalışma prensibi nedir?",
  ])(
    "belirgin karar niyeti taşımayan soruda null döndürür: %s",
    (prompt) => {
      expect(
        resolvePromptIntent(prompt, null)
      ).toBeNull();
    }
  );

  it("Türkçe karakterleri tutarlı biçimde normalleştirir", () => {
    expect(
      normalizeStrategyText(
        "Ölçüm, Mühendisliği ve Çözüm"
      )
    ).toBe(
      "olcum muhendisligi ve cozum"
    );
  });

  it("şehir adını daha uzun bir kelimenin içinden yanlışlıkla çıkarmaz", () => {
    expect(
      findTurkishLocation("Karşıyaka")
    ).toBeNull();

    expect(
      findTurkishLocation("Kars")
    ).toBe("kars");
  });
});