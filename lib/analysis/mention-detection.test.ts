import { describe, expect, it } from "vitest";

import {
  buildCompetitorMentionTerms,
  findFirstMentionIndex,
  normalizeMentionText,
  uniqueMentionTerms,
} from "./mention-detection";

describe("normalizeMentionText", () => {
  it.each([
    {
      description: "Türkçe karakterleri ASCII karşılıklarına dönüştürür",
      input: "İĞÜŞÖÇ ÂÎÛ",
      expected: "igusoc aiu",
    },
    {
      description: "noktalama ve fazla boşlukları temizler",
      input: "  Federal---Coffee\nCompany  ",
      expected: "federal coffee company",
    },
    {
      description: "kesme işaretli marka kullanımını kelimelere ayırır",
      input: "Petra'nın ürünleri",
      expected: "petra nin urunleri",
    },
    {
      description: "yalnızca sembol içeren metinde boş değer döndürür",
      input: "  --- / ?!  ",
      expected: "",
    },
  ])("$description", ({ input, expected }) => {
    expect(normalizeMentionText(input)).toBe(expected);
  });
});

describe("uniqueMentionTerms", () => {
  it("büyük-küçük harf farkından oluşan tekrarları kaldırır", () => {
    expect(
      uniqueMentionTerms([
        "Federal",
        " federal ",
        "FEDERAL",
        "Federal Coffee",
      ])
    ).toEqual(["Federal", "Federal Coffee"]);
  });

  it("Türkçe karakterleri normalleştirerek tekrarları kaldırır", () => {
    expect(
      uniqueMentionTerms([
        "İş Bankası",
        "is bankasi",
        "İŞ BANKASI",
      ])
    ).toEqual(["İş Bankası"]);
  });

  it("boş ve üç karakterden kısa terimleri kullanmaz", () => {
    expect(
      uniqueMentionTerms([
        "",
        " ",
        "AI",
        "A",
        "TKS",
      ])
    ).toEqual(["TKS"]);
  });

  it("birbirinden farklı marka terimlerini korur", () => {
    expect(
      uniqueMentionTerms([
        "Petra",
        "Federal",
        "DMT Makina",
      ])
    ).toEqual([
      "Petra",
      "Federal",
      "DMT Makina",
    ]);
  });
});

describe("buildCompetitorMentionTerms", () => {
  it("kurumsal unvanlı marka için kısa ad ve alan adı üretir", () => {
    const result = buildCompetitorMentionTerms({
      name: "Federal Coffee Company",
      aliases: [],
      websiteUrl:
        "https://www.federalcoffeecompany.com/",
    });

    expect(result).toEqual([
      "Federal Coffee Company",
      "Federal",
      "federalcoffeecompany",
    ]);
  });

  it("manuel alias tekrarlarını kaldırıp web sitesi aliasını ekler", () => {
    const result = buildCompetitorMentionTerms({
      name: "TKS Test ve Kalibrasyon Sistemleri",
      aliases: [
        "TKS",
        "tks",
        "TKS Test",
      ],
      websiteUrl:
        "https://www.tkstest.com.tr/tr/",
    });

    expect(result).toEqual([
      "TKS Test ve Kalibrasyon Sistemleri",
      "TKS",
      "TKS Test",
      "tkstest",
    ]);
  });

  it("genel bir kelimeyle başlayan marka adından riskli kısa alias üretmez", () => {
    const result = buildCompetitorMentionTerms({
      name: "Coffee Department",
      aliases: [],
      websiteUrl: null,
    });

    expect(result).toEqual([
      "Coffee Department",
    ]);

    expect(result).not.toContain("Coffee");
  });

  it("geçersiz web sitesi adresini sessizce yok sayar", () => {
    const result = buildCompetitorMentionTerms({
      name: "Penta Otomasyon",
      aliases: [],
      websiteUrl: "geçersiz bir adres",
    });

    expect(result).toEqual([
      "Penta Otomasyon",
    ]);
  });

  it("null alias listesini güvenli şekilde işler", () => {
    const result = buildCompetitorMentionTerms({
      name: "BİS Sistem",
      aliases: null,
      websiteUrl: null,
    });

    expect(result).toEqual([
      "BİS Sistem",
    ]);
  });

  it("üç karakterden kısa alan adını alias olarak kullanmaz", () => {
    const result = buildCompetitorMentionTerms({
      name: "ABC Teknoloji",
      aliases: [],
      websiteUrl: "https://abc.com/",
    });

    expect(result).toEqual([
      "ABC Teknoloji",
    ]);
  });

  it.each([
    {
      sector: "sağlık",
      name: "Acıbadem Sağlık Grubu",
      expectedAlias: "Acıbadem",
    },
    {
      sector: "yazılım",
      name: "Logo Yazılım",
      expectedAlias: "Logo",
    },
    {
      sector: "konaklama",
      name: "Divan Otel",
      expectedAlias: "Divan",
    },
    {
      sector: "endüstriyel teknoloji",
      name: "Kraft Teknoloji",
      expectedAlias: "Kraft",
    },
  ])(
    "$sector sektöründe kurumsal tanımlayıcıyı çıkararak güvenli kısa ad üretir",
    ({ name, expectedAlias }) => {
      const result =
        buildCompetitorMentionTerms({
          name,
          aliases: [],
          websiteUrl: null,
        });

      expect(result).toContain(name);
      expect(result).toContain(
        expectedAlias
      );
    }
  );
});

describe("findFirstMentionIndex", () => {
  it("tam marka adını cevapta bulur", () => {
    const result = findFirstMentionIndex(
      "DMT Makina kestirimci bakım hizmetleri sunuyor.",
      ["DMT Makina"]
    );

    expect(result).not.toBeNull();
  });

  it("otomatik üretilen kısa marka adını cevapta bulur", () => {
    const terms =
      buildCompetitorMentionTerms({
        name: "Federal Coffee Company",
        aliases: [],
        websiteUrl: null,
      });

    const result = findFirstMentionIndex(
      "Federal, nitelikli kahve çekirdekleri sunan firmalardan biridir.",
      terms
    );

    expect(result).not.toBeNull();
  });

  it("web sitesi alan adından üretilen aliası cevapta bulur", () => {
    const terms =
      buildCompetitorMentionTerms({
        name: "TKS Test ve Kalibrasyon Sistemleri",
        aliases: ["TKS"],
        websiteUrl:
          "https://www.tkstest.com.tr/tr/",
      });

    const result = findFirstMentionIndex(
      "Detaylı teknik bilgi tkstest.com.tr adresinde bulunabilir.",
      terms
    );

    expect(result).not.toBeNull();
  });

  it("manuel olarak tanımlanmış kısa aliası bulur", () => {
    const result = findFirstMentionIndex(
      "BİS, sıcaklık kalibrasyon sistemleri sunmaktadır.",
      ["BİS Sistem", "BİS"]
    );

    expect(result).not.toBeNull();
  });

  it("birden fazla eşleşme içinden cevapta ilk geçen markayı esas alır", () => {
    const answer =
      "Önce Petra, ardından Federal Coffee Company değerlendirilebilir.";

    const petraIndex =
      findFirstMentionIndex(answer, [
        "Petra",
      ]);

    const federalIndex =
      findFirstMentionIndex(answer, [
        "Federal",
      ]);

    const combinedIndex =
      findFirstMentionIndex(answer, [
        "Federal",
        "Petra",
      ]);

    expect(petraIndex).not.toBeNull();
    expect(federalIndex).not.toBeNull();

    expect(combinedIndex).toBe(
      Math.min(
        petraIndex!,
        federalIndex!
      )
    );
  });

  it("kesme işaretiyle kullanılan marka adını bulur", () => {
    expect(
      findFirstMentionIndex(
        "Petra'nın çekirdek seçenekleri oldukça geniştir.",
        ["Petra"]
      )
    ).not.toBeNull();
  });

  it("tire ve noktalama arasındaki marka adını bulur", () => {
    expect(
      findFirstMentionIndex(
        "Kraft-Teknik, sıcaklık kalibrasyonu çözümleri sunuyor.",
        ["Kraft Teknik"]
      )
    ).not.toBeNull();
  });

  it("Türkçe karakter ve büyük-küçük harf farkından etkilenmez", () => {
    expect(
      findFirstMentionIndex(
        "İŞ BANKASI kurumsal çözümler sunmaktadır.",
        ["İş Bankası"]
      )
    ).not.toBeNull();
  });

  it.each([
    {
      description:
        "Federal aliasını Federalizm kelimesinde bulmaz",
      answer:
        "Federalizm siyasi bir yönetim yaklaşımıdır.",
      terms: ["Federal"],
    },
    {
      description:
        "Petra aliasını petrol kelimesinde bulmaz",
      answer:
        "Petrol fiyatları bu ay yükseldi.",
      terms: ["Petra"],
    },
    {
      description:
        "DMT aliasını DMTX ifadesinde bulmaz",
      answer:
        "DMTX yeni bir ürün kodudur.",
      terms: ["DMT"],
    },
    {
      description:
        "Diş aliasını mühendislik kelimesinde bulmaz",
      answer:
        "Endüstriyel mühendislik hizmetleri verilmektedir.",
      terms: ["Diş"],
    },
    {
      description:
        "Logo aliasını logosu kelimesinde bulmaz",
      answer:
        "Şirketin logosu geçen yıl yenilendi.",
      terms: ["Logo"],
    },
  ])(
    "$description",
    ({ answer, terms }) => {
      expect(
        findFirstMentionIndex(
          answer,
          terms
        )
      ).toBeNull();
    }
  );

  it("boş cevap metninde eşleşme üretmez", () => {
    expect(
      findFirstMentionIndex("", [
        "TKS",
      ])
    ).toBeNull();
  });

  it("boş terim listesinde eşleşme üretmez", () => {
    expect(
      findFirstMentionIndex(
        "TKS çözümleri",
        []
      )
    ).toBeNull();
  });

  it("üç karakterden kısa terimleri marka eşleşmesi olarak kullanmaz", () => {
    expect(
      findFirstMentionIndex(
        "AI çözümleri yaygınlaşıyor.",
        ["AI"]
      )
    ).toBeNull();
  });

  it("üç karakterli gerçek marka kısaltmasını bulur", () => {
    expect(
      findFirstMentionIndex(
        "TKS kalibrasyon ürünleri sunmaktadır.",
        ["TKS"]
      )
    ).not.toBeNull();
  });

  it("alan adı metnindeki marka parçasını bağımsız kelime olarak bulur", () => {
    expect(
      findFirstMentionIndex(
        "Bilgi için tkstest.com.tr adresini inceleyebilirsiniz.",
        ["tkstest"]
      )
    ).not.toBeNull();
  });

  it("tekrarlanan ve farklı yazılmış terimlerden etkilenmez", () => {
    expect(
      findFirstMentionIndex(
        "Federal Coffee Company listede yer alıyor.",
        [
          "Federal",
          " federal ",
          "FEDERAL",
        ]
      )
    ).not.toBeNull();
  });
});