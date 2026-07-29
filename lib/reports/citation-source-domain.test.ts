import { describe, expect, it } from "vitest";

import type { CitationSource } from "./citation-sources";

import {
  citationSourceMatchesWebsite,
  getCitationSourceHostname,
} from "./citation-sources";

function createSource(
  uri: string,
  title = ""
): CitationSource {
  return {
    uri,
    title,
  };
}

describe("getCitationSourceHostname", () => {
  it("standart URL içindeki www önekini, yolu ve sorguyu temizler", () => {
    const result =
      getCitationSourceHostname(
        createSource(
          "https://www.TKSTEST.com.tr/tr/urunler/?category=kalibrasyon"
        )
      );

    expect(result).toBe(
      "tkstest.com.tr"
    );
  });

  it("protokolü bulunmayan alan adını çözümler", () => {
    const result =
      getCitationSourceHostname(
        createSource(
          "docs.example.com/guides/temperature"
        )
      );

    expect(result).toBe(
      "docs.example.com"
    );
  });

  it("büyük harfle yazılmış HTTPS protokolünü doğru işler", () => {
    const result =
      getCitationSourceHostname(
        createSource(
          "HTTPS://WWW.TKSTEST.COM.TR/tr/"
        )
      );

    expect(result).toBe(
      "tkstest.com.tr"
    );
  });

  it("alt alan adını korur", () => {
    const result =
      getCitationSourceHostname(
        createSource(
          "https://blog.penta.com.tr/makale"
        )
      );

    expect(result).toBe(
      "blog.penta.com.tr"
    );
  });

  it("sonunda nokta bulunan tam alan adını normalize eder", () => {
    const result =
      getCitationSourceHostname(
        createSource(
          "https://www.example.com./guide"
        )
      );

    expect(result).toBe(
      "example.com"
    );
  });

  it("geçersiz URL ve kullanılamayan başlıkta null döndürür", () => {
    const result =
      getCitationSourceHostname(
        createSource(
          "geçersiz bir url",
          "Alan adı içermeyen başlık"
        )
      );

    expect(result).toBeNull();
  });

  it("boş URI ve boş başlıkta null döndürür", () => {
    const result =
      getCitationSourceHostname(
        createSource("", "")
      );

    expect(result).toBeNull();
  });

  it("Gemini yönlendirme adresinde başlıktaki doğrudan URL'yi kullanır", () => {
    const result =
      getCitationSourceHostname(
        createSource(
          "https://vertexaisearch.cloud.google.com/grounding-api-redirect/test",
          "https://www.tkstest.com.tr/tr/urunler/"
        )
      );

    expect(result).toBe(
      "tkstest.com.tr"
    );
  });

  it("Gemini yönlendirme adresinde metin içine gömülmüş domaini çıkarır", () => {
    const result =
      getCitationSourceHostname(
        createSource(
          "https://vertexaisearch.cloud.google.com/grounding-api-redirect/test",
          "TKS Test ve Kalibrasyon | www.tkstest.com.tr/urunler"
        )
      );

    expect(result).toBe(
      "tkstest.com.tr"
    );
  });

  it("Gemini yönlendirme başlığında domain yoksa null döndürür", () => {
    const result =
      getCitationSourceHostname(
        createSource(
          "https://vertexaisearch.cloud.google.com/grounding-api-redirect/test",
          "TKS Test ve Kalibrasyon Sistemleri"
        )
      );

    expect(result).toBeNull();
  });

  it("normal kaynak URL'si varsa başlıktaki farklı domaini kullanmaz", () => {
    const result =
      getCitationSourceHostname(
        createSource(
          "https://source.example.com/article",
          "brand.com"
        )
      );

    expect(result).toBe(
      "source.example.com"
    );
  });
});

describe("citationSourceMatchesWebsite", () => {
  it("kaynak ile marka alan adı tamamen aynıysa eşleştirir", () => {
    const result =
      citationSourceMatchesWebsite(
        createSource(
          "https://www.tkstest.com.tr/tr/urunler/"
        ),
        "https://tkstest.com.tr/tr/"
      );

    expect(result).toBe(true);
  });

  it("kaynak markanın alt alan adındaysa eşleştirir", () => {
    const result =
      citationSourceMatchesWebsite(
        createSource(
          "https://blog.tkstest.com.tr/kalibrasyon"
        ),
        "https://www.tkstest.com.tr/"
      );

    expect(result).toBe(true);
  });

  it("protokol, büyük harf, www ve sayfa yolu farklarından etkilenmez", () => {
    const result =
      citationSourceMatchesWebsite(
        createSource(
          "https://tkstest.com.tr/tr/hizmetler/"
        ),
        "HTTPS://WWW.TKSTEST.COM.TR/tr/"
      );

    expect(result).toBe(true);
  });

  it("Gemini yönlendirme kaynağını başlıktaki marka domainiyle eşleştirir", () => {
    const result =
      citationSourceMatchesWebsite(
        createSource(
          "https://vertexaisearch.cloud.google.com/grounding-api-redirect/source",
          "Kaynak: www.tkstest.com.tr"
        ),
        "https://tkstest.com.tr/"
      );

    expect(result).toBe(true);
  });

  it("marka domainini içinde taşıyan sahte alan adını eşleştirmez", () => {
    const result =
      citationSourceMatchesWebsite(
        createSource(
          "https://tkstest.com.tr.evil.example/article"
        ),
        "https://tkstest.com.tr/"
      );

    expect(result).toBe(false);
  });

  it("kullanıcı bilgisi bölümüne marka domaini yazılmış sahte URL'yi eşleştirmez", () => {
    const result =
      citationSourceMatchesWebsite(
        createSource(
          "https://tkstest.com.tr@evil.example/article"
        ),
        "https://tkstest.com.tr/"
      );

    expect(result).toBe(false);
  });

  it("iki kardeş alt alan adını aynı site olarak değerlendirmez", () => {
    const result =
      citationSourceMatchesWebsite(
        createSource(
          "https://docs.example.com/article"
        ),
        "https://shop.example.com/"
      );

    expect(result).toBe(false);
  });

  it("tamamen farklı iki alan adını eşleştirmez", () => {
    const result =
      citationSourceMatchesWebsite(
        createSource(
          "https://penta.com.tr/article"
        ),
        "https://tkstest.com.tr/"
      );

    expect(result).toBe(false);
  });

  it.each([
    {
      description:
        "null web sitesi",
      websiteUrl: null,
    },
    {
      description:
        "undefined web sitesi",
      websiteUrl: undefined,
    },
    {
      description:
        "boş web sitesi",
      websiteUrl: "",
    },
  ])(
    "$description değerinde false döndürür",
    ({ websiteUrl }) => {
      const result =
        citationSourceMatchesWebsite(
          createSource(
            "https://tkstest.com.tr/"
          ),
          websiteUrl
        );

      expect(result).toBe(false);
    }
  );

  it("çözümlenemeyen kaynak adresini marka sitesiyle eşleştirmez", () => {
    const result =
      citationSourceMatchesWebsite(
        createSource(
          "geçersiz kaynak",
          "Domain bulunmayan başlık"
        ),
        "https://tkstest.com.tr/"
      );

    expect(result).toBe(false);
  });
});